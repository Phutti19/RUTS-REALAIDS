import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';

import { DatabaseService, PaginatedResult } from '../../database/db.service';
import { WsService } from '../../websocket/ws.service';
import { CreateSlotDto } from './dto/create-slot.dto';
import { UpdateSlotDto } from './dto/update-slot.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsDto } from './dto/list-appointments.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import {
  SlotRow,
  SlotDetailRow,
  AvailableSlotRow,
  AppointmentDetailRow,
  Slot,
  AvailableSlot,
  Appointment,
} from './interfaces/appointments.interfaces';

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly ws: WsService,
  ) {}

  // ── Slot CRUD ─────────────────────────────────────────────────────────────────

  async createSlot(callerId: string, dto: CreateSlotDto): Promise<Slot> {
    const staffId = dto.staffId ?? callerId;

    // Verify staff exists
    const staff = await this.db.queryOne<{ id: string }>(
      `SELECT id FROM users WHERE id = $1 AND role IN ('staff', 'admin') AND is_active = true`,
      [staffId],
    );
    if (!staff) throw new NotFoundException(`Staff user '${staffId}' not found.`);

    // Ensure start < end
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('startTime must be before endTime.');
    }

    const row = await this.db.queryOne<SlotDetailRow>(
      `INSERT INTO appointment_slots
         (staff_id, day_of_week, start_time, end_time, slot_duration_minutes, max_patients_per_slot)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *,
         (SELECT first_name FROM users WHERE id = $1) AS staff_first_name,
         (SELECT last_name  FROM users WHERE id = $1) AS staff_last_name`,
      [
        staffId,
        dto.dayOfWeek,
        dto.startTime,
        dto.endTime,
        dto.slotDurationMinutes,
        dto.maxPatientsPerSlot ?? 1,
      ],
    );

    this.logger.log(`Slot created: ${row!.id} staff=${staffId} day=${dto.dayOfWeek}`);
    return this.formatSlot(row!);
  }

  async listSlots(staffId?: string, dayOfWeek?: number, activeOnly = false): Promise<Slot[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (staffId) {
      conditions.push(`s.staff_id = $${idx++}`);
      values.push(staffId);
    }
    if (dayOfWeek !== undefined && dayOfWeek !== null) {
      conditions.push(`s.day_of_week = $${idx++}`);
      values.push(dayOfWeek);
    }
    if (activeOnly) {
      conditions.push(`s.is_active = true`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await this.db.queryMany<SlotDetailRow>(
      `SELECT s.*,
              u.first_name AS staff_first_name,
              u.last_name  AS staff_last_name
       FROM appointment_slots s
       JOIN users u ON u.id = s.staff_id
       ${where}
       ORDER BY s.day_of_week ASC, s.start_time ASC`,
      values,
    );

    return rows.map((r) => this.formatSlot(r));
  }

  /**
   * Return slots available on a specific date.
   * A slot is available when booked_count < max_patients_per_slot
   * and the slot's day_of_week matches the requested date's weekday.
   */
  async getAvailableSlots(date: string): Promise<AvailableSlot[]> {
    // Validate date format
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD.');
    }

    const rows = await this.db.queryMany<AvailableSlotRow>(
      `SELECT s.*,
              u.first_name AS staff_first_name,
              u.last_name  AS staff_last_name,
              COALESCE(agg.booked_count, 0)::int AS booked_count
       FROM appointment_slots s
       JOIN users u ON u.id = s.staff_id
       LEFT JOIN (
         SELECT slot_id, COUNT(*) AS booked_count
         FROM appointments
         WHERE appointment_date = $1
           AND status NOT IN ('cancelled', 'no_show')
         GROUP BY slot_id
       ) agg ON agg.slot_id = s.id
       WHERE s.is_active = true
         AND s.day_of_week = EXTRACT(DOW FROM $1::date)::int
       ORDER BY s.start_time ASC`,
      [date],
    );

    return rows.map((r) => this.formatAvailableSlot(r));
  }

  async updateSlot(id: string, callerId: string, callerRole: string, dto: UpdateSlotDto): Promise<Slot> {
    const slot = await this.db.queryOne<SlotDetailRow>(
      `SELECT s.*, u.first_name AS staff_first_name, u.last_name AS staff_last_name
       FROM appointment_slots s
       JOIN users u ON u.id = s.staff_id
       WHERE s.id = $1`,
      [id],
    );
    if (!slot) throw new NotFoundException(`Slot '${id}' not found.`);

    // Only slot owner or admin can update
    if (callerRole !== 'admin' && slot.staff_id !== callerId) {
      throw new ForbiddenException('You can only update your own slots.');
    }

    // Build SET clause dynamically
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (dto.dayOfWeek !== undefined) { sets.push(`day_of_week = $${idx++}`); values.push(dto.dayOfWeek); }
    if (dto.startTime !== undefined) { sets.push(`start_time = $${idx++}`); values.push(dto.startTime); }
    if (dto.endTime !== undefined)   { sets.push(`end_time = $${idx++}`);   values.push(dto.endTime); }
    if (dto.slotDurationMinutes !== undefined) { sets.push(`slot_duration_minutes = $${idx++}`); values.push(dto.slotDurationMinutes); }
    if (dto.maxPatientsPerSlot !== undefined)  { sets.push(`max_patients_per_slot = $${idx++}`); values.push(dto.maxPatientsPerSlot); }
    if (dto.isActive !== undefined)  { sets.push(`is_active = $${idx++}`);  values.push(dto.isActive); }

    if (sets.length === 0) return this.formatSlot(slot);

    // Validate time order after potential changes
    const newStart = dto.startTime ?? slot.start_time;
    const newEnd   = dto.endTime   ?? slot.end_time;
    if (newStart >= newEnd) {
      throw new BadRequestException('startTime must be before endTime.');
    }

    sets.push(`updated_at = NOW()`);
    values.push(id);

    const updated = await this.db.queryOne<SlotDetailRow>(
      `UPDATE appointment_slots SET ${sets.join(', ')} WHERE id = $${idx}
       RETURNING *,
         (SELECT first_name FROM users WHERE id = staff_id) AS staff_first_name,
         (SELECT last_name  FROM users WHERE id = staff_id) AS staff_last_name`,
      values,
    );

    this.logger.log(`Slot updated: ${id}`);
    return this.formatSlot(updated!);
  }

  /** Soft-delete: set is_active = false */
  async deactivateSlot(id: string, callerId: string, callerRole: string): Promise<void> {
    const slot = await this.db.queryOne<{ id: string; staff_id: string }>(
      `SELECT id, staff_id FROM appointment_slots WHERE id = $1`,
      [id],
    );
    if (!slot) throw new NotFoundException(`Slot '${id}' not found.`);

    if (callerRole !== 'admin' && slot.staff_id !== callerId) {
      throw new ForbiddenException('You can only deactivate your own slots.');
    }

    await this.db.execute(
      `UPDATE appointment_slots SET is_active = false, updated_at = NOW() WHERE id = $1`,
      [id],
    );

    this.logger.log(`Slot deactivated: ${id}`);
  }

  // ── Appointment CRUD ──────────────────────────────────────────────────────────

  /**
   * Student books an appointment.
   * Validates: slot active + day matches date + capacity not exceeded + no duplicate.
   * Creates appointment + notification for assigned staff.
   */
  async createAppointment(
    patientId: string,
    dto: CreateAppointmentDto,
  ): Promise<Appointment> {
    // Fetch slot
    const slot = await this.db.queryOne<SlotRow>(
      `SELECT * FROM appointment_slots WHERE id = $1 AND is_active = true`,
      [dto.slotId],
    );
    if (!slot) throw new NotFoundException(`Appointment slot '${dto.slotId}' not found or inactive.`);

    // Validate date matches slot's day_of_week
    const bookDate = new Date(dto.date);
    if (isNaN(bookDate.getTime())) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD.');
    }
    // getDay() returns 0=Sunday … 6=Saturday, matching PostgreSQL DOW
    if (bookDate.getDay() !== slot.day_of_week) {
      throw new BadRequestException(
        `Slot is only available on ${DAY_NAMES[slot.day_of_week]}. Chosen date falls on ${DAY_NAMES[bookDate.getDay()]}.`,
      );
    }

    // Prevent past bookings
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (bookDate < today) {
      throw new BadRequestException('Cannot book appointments in the past.');
    }

    // Check duplicate: same patient, same slot, same date
    const duplicate = await this.db.queryOne<{ id: string }>(
      `SELECT id FROM appointments
       WHERE patient_id = $1 AND slot_id = $2 AND appointment_date = $3
         AND status NOT IN ('cancelled', 'no_show')`,
      [patientId, dto.slotId, dto.date],
    );
    if (duplicate) {
      throw new ConflictException('You already have an appointment for this slot on that date.');
    }

    // Check capacity
    const capacityRow = await this.db.queryOne<{ booked_count: string }>(
      `SELECT COUNT(*)::text AS booked_count FROM appointments
       WHERE slot_id = $1 AND appointment_date = $2 AND status NOT IN ('cancelled', 'no_show')`,
      [dto.slotId, dto.date],
    );
    const bookedCount = parseInt(capacityRow?.booked_count ?? '0', 10);
    if (bookedCount >= slot.max_patients_per_slot) {
      throw new ConflictException('This appointment slot is fully booked for the selected date.');
    }

    // Create appointment + notification in one transaction
    const appointment = await this.db.transaction(async (client) => {
      const apptResult = await client.query<{ id: string }>(
        `INSERT INTO appointments (patient_id, staff_id, slot_id, appointment_date, appointment_time, reason, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', $7)
         RETURNING id`,
        [patientId, slot.staff_id, dto.slotId, dto.date, slot.start_time, dto.notes ?? '', dto.notes ?? null],
      );
      const apptId = apptResult.rows[0].id;

      // Notification for staff
      await client.query(
        `INSERT INTO notifications
           (user_id, type, title, message, reference_type, reference_id)
         VALUES ($1, 'appointment', $2, $3, 'appointment', $4)`,
        [
          slot.staff_id,
          'New Appointment',
          `A patient has booked an appointment on ${dto.date} at ${slot.start_time}.`,
          apptId,
        ],
      );

      return apptId;
    });

    const created = await this.getAppointmentDetailRow(appointment);

    // Real-time notification to the staff member
    this.ws.notifyUser(slot.staff_id, {
      type: 'appointment',
      title: 'New Appointment',
      message: `A patient has booked an appointment on ${dto.date} at ${slot.start_time}.`,
      referenceType: 'appointment',
      referenceId: appointment,
    });

    this.logger.log(`Appointment created: ${appointment} patient=${patientId} slot=${dto.slotId} date=${dto.date}`);
    return this.formatAppointment(created!);
  }

  async listAppointments(
    callerId: string,
    callerRole: string,
    dto: ListAppointmentsDto,
  ): Promise<PaginatedResult<Appointment>> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    // Students see only their own
    if (callerRole === 'student') {
      conditions.push(`a.patient_id = $${idx++}`);
      values.push(callerId);
    } else {
      if (dto.patientId) {
        conditions.push(`a.patient_id = $${idx++}`);
        values.push(dto.patientId);
      }
      if (dto.staffId) {
        conditions.push(`a.staff_id = $${idx++}`);
        values.push(dto.staffId);
      }
    }

    if (dto.date) {
      conditions.push(`a.appointment_date = $${idx++}`);
      values.push(dto.date);
    }
    if (dto.status) {
      conditions.push(`a.status = $${idx++}::appointment_status`);
      values.push(dto.status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSort: Record<string, string> = {
      date: 'a.appointment_date',
      created_at: 'a.created_at',
      status: 'a.status',
    };
    const sortCol = allowedSort[dto.sortBy ?? 'date'] ?? 'a.appointment_date';
    const sortDir = dto.order === 'desc' ? 'DESC' : 'ASC';

    const joinSql = `
      FROM appointments a
      JOIN users p  ON p.id  = a.patient_id
      JOIN users st ON st.id = a.staff_id
      JOIN appointment_slots sl ON sl.id = a.slot_id
    `;

    const countSql = `SELECT COUNT(*) ${joinSql} ${where}`;
    const dataSql  = `
      SELECT a.*,
             p.first_name  AS patient_first_name,
             p.last_name   AS patient_last_name,
             p.email       AS patient_email,
             p.student_id  AS patient_student_id,
             st.first_name AS staff_first_name,
             st.last_name  AS staff_last_name,
             sl.start_time AS slot_start_time,
             sl.end_time   AS slot_end_time,
             sl.slot_duration_minutes
      ${joinSql}
      ${where}
      ORDER BY ${sortCol} ${sortDir}
    `;

    const result = await this.db.queryPaginated<AppointmentDetailRow>(
      countSql,
      dataSql,
      values,
      { page: dto.page, limit: dto.limit },
    );

    return {
      ...result,
      data: result.data.map((row) => this.formatAppointment(row)),
    };
  }

  /** Student: own upcoming + past appointments (alias, uses listAppointments with student filter). */
  async getMyAppointments(patientId: string, dto: ListAppointmentsDto): Promise<PaginatedResult<Appointment>> {
    return this.listAppointments(patientId, 'student', dto);
  }

  /** Staff: all appointments for today. */
  async getTodayAppointments(): Promise<Appointment[]> {
    const rows = await this.db.queryMany<AppointmentDetailRow>(
      `SELECT a.*,
              p.first_name  AS patient_first_name,
              p.last_name   AS patient_last_name,
              p.email       AS patient_email,
              p.student_id  AS patient_student_id,
              st.first_name AS staff_first_name,
              st.last_name  AS staff_last_name,
              sl.start_time AS slot_start_time,
              sl.end_time   AS slot_end_time,
              sl.slot_duration_minutes
       FROM appointments a
       JOIN users p  ON p.id  = a.patient_id
       JOIN users st ON st.id = a.staff_id
       JOIN appointment_slots sl ON sl.id = a.slot_id
       WHERE a.appointment_date = CURRENT_DATE
       ORDER BY a.appointment_time ASC, a.status ASC`,
    );
    return rows.map((r) => this.formatAppointment(r));
  }

  async getAppointmentById(
    id: string,
    callerId: string,
    callerRole: string,
  ): Promise<Appointment> {
    const row = await this.getAppointmentDetailRow(id);
    if (!row) throw new NotFoundException(`Appointment '${id}' not found.`);

    if (callerRole === 'student' && row.patient_id !== callerId) {
      throw new ForbiddenException('Access denied.');
    }

    return this.formatAppointment(row);
  }

  // ── Status transitions ────────────────────────────────────────────────────────

  async checkIn(id: string): Promise<Appointment> {
    return this.transitionStatus(id, 'checked_in', ['scheduled']);
  }

  async complete(id: string): Promise<Appointment> {
    return this.transitionStatus(id, 'completed', ['scheduled', 'checked_in']);
  }

  async cancel(id: string, callerId: string, callerRole: string, dto: CancelAppointmentDto): Promise<Appointment> {
    const row = await this.db.queryOne<{ id: string; patient_id: string; status: string }>(
      `SELECT id, patient_id, status FROM appointments WHERE id = $1`,
      [id],
    );
    if (!row) throw new NotFoundException(`Appointment '${id}' not found.`);

    // Only the patient or staff can cancel
    if (callerRole === 'student' && row.patient_id !== callerId) {
      throw new ForbiddenException('You can only cancel your own appointments.');
    }
    if (row.status !== 'scheduled') {
      throw new BadRequestException(`Cannot cancel an appointment with status '${row.status}'.`);
    }

    const updated = await this.db.queryOne<AppointmentDetailRow>(
      `UPDATE appointments
       SET status = 'cancelled', cancel_reason = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [id, dto.cancelReason],
    );

    this.logger.log(`Appointment cancelled: ${id} by ${callerId}`);
    const detail = await this.getAppointmentDetailRow(updated!.id);
    return this.formatAppointment(detail!);
  }

  async noShow(id: string): Promise<Appointment> {
    return this.transitionStatus(id, 'no_show', ['scheduled', 'checked_in']);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private async transitionStatus(
    id: string,
    newStatus: string,
    allowedFrom: string[],
  ): Promise<Appointment> {
    const row = await this.db.queryOne<{ id: string; status: string }>(
      `SELECT id, status FROM appointments WHERE id = $1`,
      [id],
    );
    if (!row) throw new NotFoundException(`Appointment '${id}' not found.`);

    if (!allowedFrom.includes(row.status)) {
      throw new BadRequestException(
        `Cannot transition to '${newStatus}' from status '${row.status}'.`,
      );
    }

    await this.db.execute(
      `UPDATE appointments SET status = $2::appointment_status, updated_at = NOW() WHERE id = $1`,
      [id, newStatus],
    );

    this.logger.log(`Appointment ${id}: ${row.status} → ${newStatus}`);
    const detail = await this.getAppointmentDetailRow(id);
    return this.formatAppointment(detail!);
  }

  private async getAppointmentDetailRow(id: string): Promise<AppointmentDetailRow | null> {
    return this.db.queryOne<AppointmentDetailRow>(
      `SELECT a.*,
              p.first_name  AS patient_first_name,
              p.last_name   AS patient_last_name,
              p.email       AS patient_email,
              p.student_id  AS patient_student_id,
              st.first_name AS staff_first_name,
              st.last_name  AS staff_last_name,
              sl.start_time AS slot_start_time,
              sl.end_time   AS slot_end_time,
              sl.slot_duration_minutes
       FROM appointments a
       JOIN users p  ON p.id  = a.patient_id
       JOIN users st ON st.id = a.staff_id
       JOIN appointment_slots sl ON sl.id = a.slot_id
       WHERE a.id = $1`,
      [id],
    );
  }

  // ── Formatters ────────────────────────────────────────────────────────────────

  private formatSlot(row: SlotDetailRow): Slot {
    return {
      id: row.id,
      staffId: row.staff_id,
      staffName: `${row.staff_first_name} ${row.staff_last_name}`,
      dayOfWeek: row.day_of_week,
      dayName: DAY_NAMES[row.day_of_week] ?? 'Unknown',
      startTime: row.start_time,
      endTime: row.end_time,
      slotDurationMinutes: row.slot_duration_minutes,
      maxPatientsPerSlot: row.max_patients_per_slot,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatAvailableSlot(row: AvailableSlotRow): AvailableSlot {
    const bookedCount = row.booked_count ?? 0;
    return {
      ...this.formatSlot(row),
      bookedCount,
      availableSpots: row.max_patients_per_slot - bookedCount,
      isFull: bookedCount >= row.max_patients_per_slot,
    };
  }

  private formatAppointment(row: AppointmentDetailRow): Appointment {
    return {
      id: row.id,
      patientId: row.patient_id,
      patientName: `${row.patient_first_name} ${row.patient_last_name}`,
      staffId: row.staff_id,
      staffName: `${row.staff_first_name} ${row.staff_last_name}`,
      slotId: row.slot_id,
      appointmentDate: typeof row.appointment_date === 'string' ? row.appointment_date : (row.appointment_date as Date).toISOString().split('T')[0],
      appointmentTime: row.appointment_time,
      reason: row.reason,
      status: row.status,
      cancelReason: row.cancel_reason,
      notes: row.notes,
      patient: {
        id: row.patient_id,
        firstName: row.patient_first_name,
        lastName: row.patient_last_name,
        email: row.patient_email,
        studentId: row.patient_student_id,
      },
      staff: {
        id: row.staff_id,
        firstName: row.staff_first_name,
        lastName: row.staff_last_name,
      },
      slot: {
        startTime: row.slot_start_time,
        endTime: row.slot_end_time,
        durationMinutes: row.slot_duration_minutes,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
