import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';

import { DatabaseService, PaginatedResult } from '../../database/db.service';
import { WsService } from '../../websocket/ws.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AddImageDto } from './dto/add-image.dto';
import { ListIncidentsDto } from './dto/list-incidents.dto';
import {
  IncidentRow,
  IncidentDetailRow,
  IncidentImageRow,
  IncidentStatusLogRow,
  IncidentDetail,
  IncidentImage,
  IncidentStatusLog,
  IncidentSummary,
} from './interfaces/emergency.interfaces';

// Valid status transitions (keyed by current status)
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['in_progress', 'cancelled'],
  accepted: ['in_progress', 'completed', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

@Injectable()
export class EmergencyService {
  private readonly logger = new Logger(EmergencyService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly ws: WsService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Create incident ──────────────────────────────────────────────────────────

  async createIncident(
    reporterId: string,
    dto: CreateIncidentDto,
  ): Promise<IncidentDetail> {
    const incident = await this.db.queryOne<IncidentRow>(
      `INSERT INTO emergency_incidents
         (reporter_id, incident_type, severity, description, latitude, longitude, location_name, status)
       VALUES ($1, $2::incident_type, $3::severity_level, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [
        reporterId,
        dto.incidentType,
        dto.severity,
        dto.description ?? null,
        dto.latitude,
        dto.longitude,
        dto.locationName ?? null,
      ],
    );

    if (!incident) throw new BadRequestException('Failed to create incident');

    const detail = await this.getIncidentById(incident.id, reporterId, 'student');

    // Broadcast to all staff via WebSocket
    this.ws.notifyNewIncident(detail);

    // Persist notification for all staff in DB
    const severityMap: Record<string, string> = { low: 'ต่ำ', medium: 'ปานกลาง', high: 'สูง', critical: 'วิกฤต' };
    const typeMap: Record<string, string> = { injury: 'บาดเจ็บ', illness: 'ป่วย', accident: 'อุบัติเหตุ', fainting: 'หมดสติ', other: 'อื่นๆ' };
    const sevLabel = severityMap[dto.severity] ?? dto.severity;
    const typeLabel = typeMap[dto.incidentType] ?? dto.incidentType;
    await this.notifications.notifyAllStaff(
      'emergency',
      `🚨 เหตุฉุกเฉิน: ${typeLabel}`,
      `ระดับ ${sevLabel}${dto.description ? ' — ' + dto.description : ''}`,
      'incident',
      incident.id,
    );

    this.logger.log(`New incident created: id=${incident.id} reporter=${reporterId}`);

    return detail;
  }

  // ── List incidents ───────────────────────────────────────────────────────────

  async listIncidents(
    dto: ListIncidentsDto,
    callerId: string,
    callerRole: string,
  ): Promise<PaginatedResult<IncidentSummary>> {
    const [infLat, infLng] = await this.getInfirmaryCoords();

    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    // Students only see their own incidents
    if (callerRole === 'student') {
      conditions.push(`i.reporter_id = $${idx++}`);
      values.push(callerId);
    } else if (dto.reporterId) {
      conditions.push(`i.reporter_id = $${idx++}`);
      values.push(dto.reporterId);
    }

    if (dto.status && dto.status.length > 0) {
      if (dto.status.length === 1) {
        conditions.push(`i.status = $${idx++}::incident_status`);
        values.push(dto.status[0]);
      } else {
        const placeholders = dto.status.map(() => `$${idx++}::incident_status`).join(', ');
        conditions.push(`i.status IN (${placeholders})`);
        values.push(...dto.status);
      }
    }

    if (dto.incidentType) {
      conditions.push(`i.incident_type = $${idx++}::incident_type`);
      values.push(dto.incidentType);
    }

    if (dto.severity) {
      conditions.push(`i.severity = $${idx++}::severity_level`);
      values.push(dto.severity);
    }

    if (dto.from) {
      conditions.push(`i.created_at >= $${idx++}`);
      values.push(dto.from);
    }

    if (dto.to) {
      conditions.push(`i.created_at <= $${idx++}`);
      values.push(dto.to);
    }

    if (dto.search) {
      conditions.push(`i.description ILIKE $${idx++}`);
      values.push(`%${dto.search}%`);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSort: Record<string, string> = {
      created_at: 'i.created_at',
      severity: 'i.severity',
      status: 'i.status',
      incident_type: 'i.incident_type',
    };
    const sortCol =
      allowedSort[dto.sortBy ?? 'created_at'] ?? 'i.created_at';
    const sortDir = dto.order === 'asc' ? 'ASC' : 'DESC';

    const countSql = `SELECT COUNT(*) FROM emergency_incidents i ${where}`;
    const dataSql = `
      SELECT i.id, i.reporter_id, i.incident_type, i.severity, i.description,
             i.latitude, i.longitude, i.status, i.created_at, i.updated_at
      FROM emergency_incidents i
      ${where}
      ORDER BY ${sortCol} ${sortDir}
    `;

    const result = await this.db.queryPaginated<IncidentRow>(
      countSql,
      dataSql,
      values,
      { page: dto.page, limit: dto.limit },
    );

    return {
      ...result,
      data: result.data.map((row) => this.formatSummary(row, infLat, infLng)),
    };
  }

  // ── Get incident detail ──────────────────────────────────────────────────────

  async getIncidentById(
    id: string,
    callerId: string,
    callerRole: string,
  ): Promise<IncidentDetail> {
    const [infLat, infLng] = await this.getInfirmaryCoords();

    const row = await this.db.queryOne<IncidentDetailRow>(
      `SELECT
         i.id, i.reporter_id, i.incident_type, i.severity, i.description,
         i.latitude, i.longitude, i.status, i.created_at, i.updated_at,
         u.first_name  AS reporter_first_name,
         u.last_name   AS reporter_last_name,
         u.email       AS reporter_email,
         u.student_id  AS reporter_student_id,
         u.phone       AS reporter_phone,
         ru.id         AS responder_id,
         ru.first_name AS responder_first_name,
         ru.last_name  AS responder_last_name,
         ir.accepted_at,
         ir.arrived_at
       FROM emergency_incidents i
       JOIN users u  ON u.id  = i.reporter_id
       LEFT JOIN incident_responders ir ON ir.incident_id = i.id
       LEFT JOIN users ru ON ru.id = ir.responder_id
       WHERE i.id = $1`,
      [id],
    );

    if (!row) throw new NotFoundException(`Incident '${id}' not found`);

    // Students can only view their own incidents
    if (callerRole === 'student' && row.reporter_id !== callerId) {
      throw new ForbiddenException('Access denied');
    }

    const images = await this.getImages(id);

    return this.formatDetail(row, images, infLat, infLng);
  }

  // ── Accept incident ──────────────────────────────────────────────────────────

  async acceptIncident(
    incidentId: string,
    staffId: string,
  ): Promise<IncidentDetail> {
    const current = await this.db.queryOne<IncidentRow>(
      `SELECT id, status, reporter_id FROM emergency_incidents WHERE id = $1`,
      [incidentId],
    );
    if (!current) throw new NotFoundException(`Incident '${incidentId}' not found`);
    if (current.status !== 'pending') {
      throw new BadRequestException(
        `Cannot accept incident in status '${current.status}'. Only pending incidents can be accepted.`,
      );
    }

    await this.db.transaction(async (client) => {
      await client.query(
        `UPDATE emergency_incidents
         SET status = 'accepted', updated_at = NOW()
         WHERE id = $1`,
        [incidentId],
      );

      // Upsert responder record
      await client.query(
        `INSERT INTO incident_responders (incident_id, responder_id, accepted_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (incident_id, responder_id) DO UPDATE
           SET accepted_at = EXCLUDED.accepted_at`,
        [incidentId, staffId],
      );

      await client.query(
        `INSERT INTO incident_status_logs (incident_id, changed_by, old_status, new_status)
         VALUES ($1, $2, 'pending', 'accepted')`,
        [incidentId, staffId],
      );
    });

    const detail = await this.getIncidentById(incidentId, staffId, 'staff');

    this.ws.notifyIncidentAccepted(detail, current.reporter_id);
    this.ws.notifyIncidentStatusUpdate(detail, current.reporter_id);
    this.logger.log(`Incident accepted: id=${incidentId} by staff=${staffId}`);

    return detail;
  }

  // ── Update status ────────────────────────────────────────────────────────────

  async updateStatus(
    incidentId: string,
    staffId: string,
    dto: UpdateStatusDto,
  ): Promise<IncidentDetail> {
    const current = await this.db.queryOne<IncidentRow>(
      `SELECT id, status, reporter_id FROM emergency_incidents WHERE id = $1`,
      [incidentId],
    );
    if (!current) throw new NotFoundException(`Incident '${incidentId}' not found`);

    const allowed = VALID_TRANSITIONS[current.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from '${current.status}' to '${dto.status}'. ` +
          `Valid transitions: ${allowed.join(', ') || 'none'}`,
      );
    }

    await this.db.transaction(async (client) => {
      await client.query(
        `UPDATE emergency_incidents
         SET status = $1::incident_status, updated_at = NOW()
         WHERE id = $2`,
        [dto.status, incidentId],
      );

      await client.query(
        `INSERT INTO incident_status_logs (incident_id, changed_by, old_status, new_status, note)
         VALUES ($1, $2, $3, $4, $5)`,
        [incidentId, staffId, current.status, dto.status, dto.note ?? null],
      );
    });

    const detail = await this.getIncidentById(incidentId, staffId, 'staff');

    this.ws.notifyIncidentStatusUpdate(detail, current.reporter_id);
    this.logger.log(
      `Status updated: id=${incidentId} ${current.status} → ${dto.status} by ${staffId}`,
    );

    return detail;
  }

  // ── Images ───────────────────────────────────────────────────────────────────

  async addImage(
    incidentId: string,
    callerId: string,
    callerRole: string,
    dto: AddImageDto,
  ): Promise<IncidentImage> {
    const incident = await this.db.queryOne<{
      id: string;
      reporter_id: string;
    }>(
      `SELECT id, reporter_id FROM emergency_incidents WHERE id = $1`,
      [incidentId],
    );
    if (!incident) throw new NotFoundException(`Incident '${incidentId}' not found`);
    if (callerRole === 'student' && incident.reporter_id !== callerId) {
      throw new ForbiddenException('You can only add images to your own incidents');
    }

    const row = await this.db.queryOne<IncidentImageRow>(
      `INSERT INTO incident_images (incident_id, image_url, caption, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [incidentId, dto.imageUrl, dto.caption ?? null, dto.sortOrder ?? 0],
    );

    if (!row) throw new BadRequestException('Failed to add image');
    this.logger.log(`Image added: incident=${incidentId}`);

    return this.formatImage(row);
  }

  async getImages(incidentId: string): Promise<IncidentImage[]> {
    const rows = await this.db.queryMany<IncidentImageRow>(
      `SELECT id, incident_id, image_url, uploaded_at
       FROM incident_images
       WHERE incident_id = $1
       ORDER BY uploaded_at ASC`,
      [incidentId],
    );
    return rows.map((r) => this.formatImage(r));
  }

  // ── Status logs ──────────────────────────────────────────────────────────────

  async getStatusLogs(
    incidentId: string,
    callerId: string,
    callerRole: string,
  ): Promise<IncidentStatusLog[]> {
    const incident = await this.db.queryOne<{
      id: string;
      reporter_id: string;
    }>(
      `SELECT id, reporter_id FROM emergency_incidents WHERE id = $1`,
      [incidentId],
    );
    if (!incident) throw new NotFoundException(`Incident '${incidentId}' not found`);
    if (callerRole === 'student' && incident.reporter_id !== callerId) {
      throw new ForbiddenException('Access denied');
    }

    const rows = await this.db.queryMany<IncidentStatusLogRow>(
      `SELECT id, incident_id, changed_by, old_status, new_status, note, created_at
       FROM incident_status_logs
       WHERE incident_id = $1
       ORDER BY created_at ASC`,
      [incidentId],
    );
    return rows.map((r) => this.formatStatusLog(r));
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async getInfirmaryCoords(): Promise<[number | null, number | null]> {
    const rows = await this.db.queryMany<{ key: string; value: string }>(
      `SELECT key, value FROM system_settings WHERE key IN ('infirmary_lat', 'infirmary_lng')`,
    );
    const lat = rows.find((r) => r.key === 'infirmary_lat')?.value;
    const lng = rows.find((r) => r.key === 'infirmary_lng')?.value;
    return [lat ? parseFloat(lat) : null, lng ? parseFloat(lng) : null];
  }

  /** Haversine — straight-line distance in kilometres between two GPS points */
  private haversineKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ── Formatters ───────────────────────────────────────────────────────────────

  private formatSummary(
    row: IncidentRow,
    infLat: number | null,
    infLng: number | null,
  ): IncidentSummary {
    const distanceKm =
      row.latitude != null &&
      row.longitude != null &&
      infLat != null &&
      infLng != null
        ? Math.round(
            this.haversineKm(infLat, infLng, row.latitude, row.longitude) * 100,
          ) / 100
        : null;

    return {
      id: row.id,
      reporterId: row.reporter_id,
      incidentType: row.incident_type,
      severity: row.severity,
      description: row.description,
      latitude: row.latitude != null ? Number(row.latitude) : null,
      longitude: row.longitude != null ? Number(row.longitude) : null,
      distanceKm,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatDetail(
    row: IncidentDetailRow,
    images: IncidentImage[],
    infLat: number | null,
    infLng: number | null,
  ): IncidentDetail {
    const summary = this.formatSummary(row, infLat, infLng);
    return {
      ...summary,
      reporter: {
        id: row.reporter_id,
        firstName: row.reporter_first_name,
        lastName: row.reporter_last_name,
        email: row.reporter_email,
        studentId: row.reporter_student_id,
        phone: row.reporter_phone,
      },
      responder:
        row.responder_id != null
          ? {
              id: row.responder_id,
              firstName: row.responder_first_name!,
              lastName: row.responder_last_name!,
              acceptedAt: row.accepted_at!,
              arrivedAt: row.arrived_at,
            }
          : null,
      images,
    };
  }

  private formatImage(row: IncidentImageRow): IncidentImage {
    return {
      id: row.id,
      incidentId: row.incident_id,
      imageUrl: row.image_url,
      caption: row.caption,
      sortOrder: row.sort_order,
      uploadedAt: row.uploaded_at,
    };
  }

  private formatStatusLog(row: IncidentStatusLogRow): IncidentStatusLog {
    return {
      id: row.id,
      incidentId: row.incident_id,
      changedBy: row.changed_by,
      oldStatus: row.old_status,
      newStatus: row.new_status,
      note: row.note,
      createdAt: row.created_at,
    };
  }
}
