import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { QueryResultRow } from 'pg';

import { DatabaseService, PaginatedResult } from '../../database/db.service';
import { WsService } from '../../websocket/ws.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { ListVisitsDto } from './dto/list-visits.dto';
import { DispenseMedicationDto } from './dto/dispense-medication.dto';
import { RegisterWalkInPatientDto } from './dto/register-walkin-patient.dto';
import {
  VisitRow,
  VisitDetailRow,
  VisitMedicationRow,
  Visit,
  VisitSummary,
  QueueEntry,
  VisitMedication,
} from './interfaces/visits.interfaces';

@Injectable()
export class VisitsService {
  private readonly logger = new Logger(VisitsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly ws: WsService,
  ) {}

  // ── Create ───────────────────────────────────────────────────────────────────

  async createVisit(staffId: string, dto: CreateVisitDto): Promise<Visit> {
    // Verify patient exists and is active
    const patient = await this.db.queryOne<{ id: string }>(
      `SELECT id FROM users WHERE id = $1 AND is_active = true`,
      [dto.patientId],
    );
    if (!patient) throw new NotFoundException(`Patient '${dto.patientId}' not found`);

    // Verify linked incident exists (if provided)
    if (dto.incidentId) {
      const incident = await this.db.queryOne<{ id: string }>(
        `SELECT id FROM emergency_incidents WHERE id = $1`,
        [dto.incidentId],
      );
      if (!incident) throw new NotFoundException(`Incident '${dto.incidentId}' not found`);
    }

    const row = await this.db.queryOne<VisitRow>(
      `INSERT INTO patient_visits
         (patient_id, staff_id, incident_id, visit_type, chief_complaint, vital_signs, status)
       VALUES ($1, $2, $3, $4::visit_type, $5, $6, 'waiting')
       RETURNING *`,
      [
        dto.patientId,
        staffId,
        dto.incidentId ?? null,
        dto.visitType,
        dto.chiefComplaint,
        dto.vitalSigns ? JSON.stringify(dto.vitalSigns) : null,
      ],
    );

    if (!row) throw new BadRequestException('Failed to create visit');

    const visit = await this.getVisitById(row.id, staffId, 'staff');

    // Broadcast queue update to all staff
    this.ws.notifyQueueUpdate({ action: 'new', visit });
    this.logger.log(`Visit created: id=${row.id} patient=${dto.patientId} staff=${staffId}`);

    return visit;
  }

  // ── List ─────────────────────────────────────────────────────────────────────

  async listVisits(
    dto: ListVisitsDto,
    callerId: string,
    callerRole: string,
  ): Promise<PaginatedResult<VisitSummary>> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    // Students see only their own visits
    if (callerRole === 'student') {
      conditions.push(`pv.patient_id = $${idx++}`);
      values.push(callerId);
    } else if (dto.patientId) {
      conditions.push(`pv.patient_id = $${idx++}`);
      values.push(dto.patientId);
    }

    if (dto.staffId && callerRole !== 'student') {
      conditions.push(`pv.staff_id = $${idx++}`);
      values.push(dto.staffId);
    }

    if (dto.status && dto.status.length > 0) {
      if (dto.status.length === 1) {
        conditions.push(`pv.status = $${idx++}::visit_status`);
        values.push(dto.status[0]);
      } else {
        const placeholders = dto.status.map(() => `$${idx++}::visit_status`).join(', ');
        conditions.push(`pv.status IN (${placeholders})`);
        values.push(...dto.status);
      }
    }

    if (dto.visitType) {
      conditions.push(`pv.visit_type = $${idx++}::visit_type`);
      values.push(dto.visitType);
    }

    if (dto.from) {
      conditions.push(`pv.created_at >= $${idx++}`);
      values.push(dto.from);
    }

    if (dto.to) {
      conditions.push(`pv.created_at <= $${idx++}`);
      values.push(dto.to);
    }

    if (dto.search) {
      conditions.push(
        `(u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx} OR COALESCE(u.student_id, '') ILIKE $${idx})`,
      );
      values.push(`%${dto.search}%`);
      idx++;
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSort: Record<string, string> = {
      created_at: 'pv.created_at',
      status: 'pv.status',
      visit_type: 'pv.visit_type',
    };
    const sortCol = allowedSort[dto.sortBy ?? 'created_at'] ?? 'pv.created_at';
    const sortDir = dto.order === 'asc' ? 'ASC' : 'DESC';

    const countSql = `
      SELECT COUNT(*)
      FROM patient_visits pv
      JOIN users u ON u.id = pv.patient_id
      ${where}
    `;
    const dataSql = `
      SELECT pv.id, pv.patient_id, pv.staff_id, pv.incident_id, pv.visit_type,
             pv.chief_complaint, pv.diagnosis, pv.vital_signs, pv.treatment,
             pv.illness_history, pv.wound_care, pv.rest_hours,
             pv.consultation_types, pv.is_referred,
             pv.status, pv.created_at, COALESCE(pv.completed_at, pv.created_at) AS updated_at,
             u.first_name  AS patient_first_name,
             u.last_name   AS patient_last_name,
             u.email       AS patient_email,
             u.student_id  AS patient_student_id,
             u.phone       AS patient_phone,
             su.first_name AS staff_first_name,
             su.last_name  AS staff_last_name
      FROM patient_visits pv
      JOIN users u  ON u.id  = pv.patient_id
      JOIN users su ON su.id = pv.staff_id
      ${where}
      ORDER BY ${sortCol} ${sortDir}
    `;

    const result = await this.db.queryPaginated<VisitDetailRow>(
      countSql,
      dataSql,
      values,
      { page: dto.page, limit: dto.limit },
    );

    return {
      ...result,
      data: result.data.map((row) => this.formatSummary(row)),
    };
  }

  // ── Get detail ───────────────────────────────────────────────────────────────

  async getVisitById(
    id: string,
    callerId: string,
    callerRole: string,
  ): Promise<Visit> {
    const row = await this.db.queryOne<VisitDetailRow>(
      `SELECT pv.id, pv.patient_id, pv.staff_id, pv.incident_id, pv.visit_type,
              pv.chief_complaint, pv.diagnosis, pv.vital_signs, pv.treatment,
              pv.illness_history, pv.wound_care, pv.rest_hours,
              pv.consultation_types, pv.is_referred,
              pv.status, pv.created_at, COALESCE(pv.completed_at, pv.created_at) AS updated_at,
              u.first_name  AS patient_first_name,
              u.last_name   AS patient_last_name,
              u.email       AS patient_email,
              u.student_id  AS patient_student_id,
              u.phone       AS patient_phone,
              su.first_name AS staff_first_name,
              su.last_name  AS staff_last_name
       FROM patient_visits pv
       JOIN users u  ON u.id  = pv.patient_id
       JOIN users su ON su.id = pv.staff_id
       WHERE pv.id = $1`,
      [id],
    );

    if (!row) throw new NotFoundException(`Visit '${id}' not found`);

    if (callerRole === 'student' && row.patient_id !== callerId) {
      throw new ForbiddenException('Access denied');
    }

    return this.formatVisit(row);
  }

  // ── Update ───────────────────────────────────────────────────────────────────

  async updateVisit(
    id: string,
    staffId: string,
    dto: UpdateVisitDto,
  ): Promise<Visit> {
    const current = await this.db.queryOne<VisitRow>(
      `SELECT * FROM patient_visits WHERE id = $1`,
      [id],
    );
    if (!current) throw new NotFoundException(`Visit '${id}' not found`);

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (dto.diagnosis !== undefined) {
      fields.push(`diagnosis = $${idx++}`);
      values.push(dto.diagnosis ?? null);
    }
    if (dto.treatmentNotes !== undefined) {
      fields.push(`treatment = $${idx++}`);
      values.push(dto.treatmentNotes ?? null);
    }
    if (dto.illnessHistory !== undefined) {
      fields.push(`illness_history = $${idx++}`);
      values.push(dto.illnessHistory ?? null);
    }
    if (dto.vitalSigns !== undefined) {
      fields.push(`vital_signs = $${idx++}`);
      values.push(JSON.stringify(dto.vitalSigns));
    }
    if (dto.woundCare !== undefined) {
      fields.push(`wound_care = $${idx++}`);
      values.push(dto.woundCare);
    }
    if (dto.restHours !== undefined) {
      fields.push(`rest_hours = $${idx++}`);
      values.push(dto.restHours ?? null);
    }
    if (dto.consultationTypes !== undefined) {
      fields.push(`consultation_types = $${idx++}`);
      values.push(dto.consultationTypes);
    }
    if (dto.isReferred !== undefined) {
      fields.push(`is_referred = $${idx++}`);
      values.push(dto.isReferred);
    }
    if (dto.status !== undefined) {
      fields.push(`status = $${idx++}::visit_status`);
      values.push(dto.status);
    }

    if (fields.length === 0) return this.getVisitById(id, staffId, 'staff');

    values.push(id);

    await this.db.execute(
      `UPDATE patient_visits SET ${fields.join(', ')} WHERE id = $${idx}`,
      values,
    );

    const updated = await this.getVisitById(id, staffId, 'staff');

    // Broadcast queue update when status changes
    if (dto.status && dto.status !== current.status) {
      this.ws.notifyQueueUpdate({
        action: 'status_change',
        visitId: id,
        oldStatus: current.status,
        newStatus: dto.status,
        visit: updated,
      });
      this.logger.log(
        `Visit status changed: id=${id} ${current.status} → ${dto.status}`,
      );
    }

    return updated;
  }

  // ── Queue ─────────────────────────────────────────────────────────────────────

  async getQueue(): Promise<QueueEntry[]> {
    const rows = await this.db.queryMany<VisitDetailRow>(
      `SELECT pv.id, pv.patient_id, pv.staff_id, pv.incident_id, pv.visit_type,
              pv.chief_complaint, pv.diagnosis, pv.vital_signs, pv.treatment,
              pv.illness_history, pv.wound_care, pv.rest_hours,
              pv.consultation_types, pv.is_referred,
              pv.status, pv.created_at, COALESCE(pv.completed_at, pv.created_at) AS updated_at,
              u.first_name  AS patient_first_name,
              u.last_name   AS patient_last_name,
              u.email       AS patient_email,
              u.student_id  AS patient_student_id,
              u.phone       AS patient_phone,
              su.first_name AS staff_first_name,
              su.last_name  AS staff_last_name
       FROM patient_visits pv
       JOIN users u  ON u.id  = pv.patient_id
       JOIN users su ON su.id = pv.staff_id
       WHERE pv.status IN ('waiting', 'in_treatment')
       ORDER BY pv.created_at ASC`,
    );

    return rows.map((row) => this.formatQueueEntry(row));
  }

  // ── Dispense medication ───────────────────────────────────────────────────────

  async dispenseMedication(
    visitId: string,
    staffId: string,
    dto: DispenseMedicationDto,
  ): Promise<VisitMedication> {
    // Verify visit exists and is in a dispensable state
    const visit = await this.db.queryOne<{ id: string; status: string }>(
      `SELECT id, status FROM patient_visits WHERE id = $1`,
      [visitId],
    );
    if (!visit) throw new NotFoundException(`Visit '${visitId}' not found`);
    if (visit.status === 'completed' || visit.status === 'referred') {
      throw new BadRequestException(
        `Cannot dispense medication for a visit with status '${visit.status}'`,
      );
    }

    // Verify medicine exists and has enough total stock
    const medicine = await this.db.queryOne<{
      id: string;
      name: string;
      stock_quantity: number;
      min_stock_level: number;
    }>(
      `SELECT id, name, stock_quantity, min_stock_level FROM medicines WHERE id = $1`,
      [dto.medicineId],
    );
    if (!medicine) throw new NotFoundException(`Medicine '${dto.medicineId}' not found`);
    if (medicine.stock_quantity < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${medicine.stock_quantity}, Requested: ${dto.quantity}`,
      );
    }

    // Run dispensing inside a transaction
    const savedMed = await this.db.transaction(async (client) => {
      // FIFO: pick earliest-expiry batch with enough quantity
      const batchResult = await client.query<{
        id: string;
        batch_number: string;
        quantity: number;
      }>(
        `SELECT id, batch_number, quantity
         FROM medicine_batches
         WHERE medicine_id = $1
           AND quantity >= $2
           AND expiry_date > NOW()
         ORDER BY expiry_date ASC
         LIMIT 1`,
        [dto.medicineId, dto.quantity],
      );

      if (batchResult.rows.length === 0) {
        throw new BadRequestException(
          `No single batch has ${dto.quantity} units of available (non-expired) stock. ` +
            `Check individual batch quantities and expiry dates.`,
        );
      }

      const batch = batchResult.rows[0];

      // Deduct from selected batch
      await client.query(
        `UPDATE medicine_batches SET quantity = quantity - $1 WHERE id = $2`,
        [dto.quantity, batch.id],
      );

      // Update cached total on medicines, get new total
      const stockResult = await client.query<{ stock_quantity: number }>(
        `UPDATE medicines SET stock_quantity = stock_quantity - $1, updated_at = NOW() WHERE id = $2 RETURNING stock_quantity`,
        [dto.quantity, dto.medicineId],
      );
      const newStock = stockResult.rows[0].stock_quantity;

      // Record stock log
      await client.query(
        `INSERT INTO medicine_stock_logs (medicine_id, batch_id, action, quantity_change, remaining_stock, performed_by, note)
         VALUES ($1, $2, 'dispensed', $3, $4, $5, $6)`,
        [
          dto.medicineId,
          batch.id,
          -dto.quantity,
          newStock,
          staffId,
          `Dispensed for visit ${visitId}`,
        ],
      );

      // Insert visit_medication record
      const medResult = await client.query<QueryResultRow>(
        `INSERT INTO visit_medications (visit_id, medicine_id, batch_id, quantity, dosage_instruction, dispensed_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, visit_id, medicine_id, batch_id, quantity, dosage_instruction, created_at`,
        [visitId, dto.medicineId, batch.id, dto.quantity, dto.dosageInstruction ?? null, staffId],
      );

      const med = medResult.rows[0];
      return {
        id: med.id as string,
        visit_id: med.visit_id as string,
        medicine_id: med.medicine_id as string,
        batch_id: med.batch_id as string,
        quantity: med.quantity as number,
        dosage_instruction: med.dosage_instruction as string | null,
        created_at: med.created_at as Date,
        medicine_name: medicine.name,
        batch_number: batch.batch_number,
      } as VisitMedicationRow;
    });

    // After transaction: check stock alert threshold
    const updatedMed = await this.db.queryOne<{
      stock_quantity: number;
      min_stock_level: number;
      name: string;
    }>(
      `SELECT stock_quantity, min_stock_level, name FROM medicines WHERE id = $1`,
      [dto.medicineId],
    );
    if (updatedMed && updatedMed.stock_quantity <= updatedMed.min_stock_level) {
      this.ws.notifyStockAlert({
        medicineId: dto.medicineId,
        name: updatedMed.name,
        currentStock: updatedMed.stock_quantity,
        minStockLevel: updatedMed.min_stock_level,
      });
      this.logger.warn(
        `Low stock alert: medicine=${dto.medicineId} stock=${updatedMed.stock_quantity} min=${updatedMed.min_stock_level}`,
      );
    }

    this.logger.log(
      `Medication dispensed: visit=${visitId} medicine=${dto.medicineId} qty=${dto.quantity} by staff=${staffId}`,
    );

    return this.formatMedication(savedMed);
  }

  // ── Get visit medications ─────────────────────────────────────────────────────

  async getVisitMedications(
    visitId: string,
    callerId: string,
    callerRole: string,
  ): Promise<VisitMedication[]> {
    const visit = await this.db.queryOne<{ id: string; patient_id: string }>(
      `SELECT id, patient_id FROM patient_visits WHERE id = $1`,
      [visitId],
    );
    if (!visit) throw new NotFoundException(`Visit '${visitId}' not found`);
    if (callerRole === 'student' && visit.patient_id !== callerId) {
      throw new ForbiddenException('Access denied');
    }

    const rows = await this.db.queryMany<VisitMedicationRow>(
      `SELECT vm.id, vm.visit_id, vm.medicine_id, vm.batch_id,
              vm.quantity, vm.dosage_instruction, vm.created_at,
              m.name  AS medicine_name,
              mb.batch_number
       FROM visit_medications vm
       JOIN medicines       m  ON m.id  = vm.medicine_id
       JOIN medicine_batches mb ON mb.id = vm.batch_id
       WHERE vm.visit_id = $1
       ORDER BY vm.created_at ASC`,
      [visitId],
    );

    return rows.map((r) => this.formatMedication(r));
  }

  // ── Formatters ───────────────────────────────────────────────────────────────

  private formatSummary(row: VisitDetailRow): VisitSummary {
    return {
      id: row.id,
      patientId: row.patient_id,
      staffId: row.staff_id,
      incidentId: row.incident_id,
      visitType: row.visit_type,
      chiefComplaint: row.chief_complaint,
      diagnosis: row.diagnosis,
      status: row.status,
      patient: {
        id: row.patient_id,
        firstName: row.patient_first_name,
        lastName: row.patient_last_name,
        studentId: row.patient_student_id,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatVisit(row: VisitDetailRow): Visit {
    return {
      id: row.id,
      patientId: row.patient_id,
      staffId: row.staff_id,
      incidentId: row.incident_id,
      visitType: row.visit_type,
      chiefComplaint: row.chief_complaint,
      diagnosis: row.diagnosis,
      vitalSigns: row.vital_signs,
      treatmentNotes: row.treatment,
      illnessHistory: row.illness_history ?? null,
      woundCare: row.wound_care ?? false,
      restHours: row.rest_hours != null ? parseFloat(row.rest_hours) : null,
      consultationTypes: row.consultation_types ?? [],
      isReferred: row.is_referred ?? false,
      status: row.status,
      patient: {
        id: row.patient_id,
        firstName: row.patient_first_name,
        lastName: row.patient_last_name,
        email: row.patient_email,
        studentId: row.patient_student_id,
        phone: row.patient_phone ?? null,
      },
      staff: {
        id: row.staff_id,
        firstName: row.staff_first_name,
        lastName: row.staff_last_name,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatQueueEntry(row: VisitDetailRow): QueueEntry {
    const waitingMinutes = Math.floor(
      (Date.now() - new Date(row.created_at).getTime()) / 60_000,
    );
    return {
      id: row.id,
      patientId: row.patient_id,
      visitType: row.visit_type,
      chiefComplaint: row.chief_complaint,
      vitalSigns: row.vital_signs,
      status: row.status,
      waitingMinutes,
      patient: {
        id: row.patient_id,
        firstName: row.patient_first_name,
        lastName: row.patient_last_name,
        studentId: row.patient_student_id,
      },
      createdAt: row.created_at,
    };
  }

  private formatMedication(row: VisitMedicationRow): VisitMedication {
    return {
      id: row.id,
      visitId: row.visit_id,
      medicineId: row.medicine_id,
      batchId: row.batch_id,
      medicineName: row.medicine_name,
      batchNumber: row.batch_number,
      quantity: row.quantity,
      dosageInstruction: row.dosage_instruction,
      createdAt: row.created_at,
    };
  }

  // ── Walk-in patient registration ──────────────────────────────────────────

  /**
   * Create a new student account for a walk-in patient who has never registered.
   * Password is set to the student ID (plain text → bcrypt-hashed).
   * Returns the new user so the caller can immediately open a visit.
   */
  async registerWalkInPatient(dto: RegisterWalkInPatientDto): Promise<{
    id: string;
    firstName: string;
    lastName: string;
    studentId: string;
    email: string;
    role: string;
  }> {
    const email = dto.email ?? `${dto.studentId}@student.ruts.ac.th`;

    // Check for duplicate student_id
    const dupStudentId = await this.db.queryOne<{ id: string }>(
      `SELECT id FROM users WHERE student_id = $1`,
      [dto.studentId],
    );
    if (dupStudentId) throw new ConflictException('รหัสนักศึกษานี้มีในระบบแล้ว');

    // Check for duplicate email
    const dupEmail = await this.db.queryOne<{ id: string }>(
      `SELECT id FROM users WHERE email = $1`,
      [email],
    );
    if (dupEmail) throw new ConflictException('อีเมลนี้มีในระบบแล้ว');

    const passwordHash = await bcrypt.hash(dto.studentId, 12);
    const id = randomUUID();

    await this.db.query(
      `INSERT INTO users (id, student_id, email, password_hash, first_name, last_name, phone, role, title, faculty, department, year_of_study, birth_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'student', $8, $9, $10, $11, $12)`,
      [id, dto.studentId, email, passwordHash, dto.firstName, dto.lastName, dto.phone ?? null,
       dto.title, dto.faculty ?? null, dto.department ?? null, dto.yearOfStudy ?? null, dto.birthDate ?? null],
    );

    // Create empty health profile so joins don't fail
    await this.db.query(
      `INSERT INTO student_health_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
      [id],
    );

    return { id, firstName: dto.firstName, lastName: dto.lastName, studentId: dto.studentId, email, role: 'student' };
  }
}
