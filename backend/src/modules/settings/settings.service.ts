import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import bcrypt from 'bcryptjs';

import { DatabaseService, PaginatedResult } from '../../database/db.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { ListAdminUsersDto } from './dto/list-admin-users.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { CreateEmergencyContactDto } from './dto/create-emergency-contact.dto';
import { UpdateEmergencyContactDto } from './dto/update-emergency-contact.dto';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';
import { CreateTreatmentTypeDto } from './dto/create-treatment-type.dto';
import { CreateFacultyDto } from './dto/create-faculty.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { ListLoginAttemptsDto } from './dto/list-login-attempts.dto';
import {
  SystemSetting,
  SettingRow,
  InfirmaryInfo,
  AdminUser,
  AdminUserRow,
  DataBackup,
  DataBackupRow,
  EmergencyContact,
  EmergencyContactRow,
  AuditLog,
  AuditLogRow,
  TreatmentType,
  TreatmentTypeRow,
  Faculty,
  FacultyRow,
  Department,
  DepartmentRow,
  LoginAttempt,
  LoginAttemptRow,
} from './interfaces/settings.interfaces';

const BCRYPT_ROUNDS = 12;

const BACKUP_TABLES = [
  'users', 'student_health_profiles', 'refresh_tokens', 'password_reset_tokens', 'login_attempts',
  'emergency_incidents', 'incident_images', 'incident_responders', 'incident_status_logs', 'emergency_contacts_directory',
  'treatment_types', 'patient_visits', 'visit_medications', 'medical_certificates',
  'medicines', 'medicine_batches', 'medicine_stock_logs',
  'appointment_slots', 'appointments',
  'notifications', 'push_subscriptions',
  'system_settings', 'audit_logs', 'data_backups',
];

// ── Formatters ────────────────────────────────────────────────────────────────

function formatSetting(row: SettingRow): SystemSetting {
  return {
    key: row.key,
    value: row.value,
    description: row.description,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

function formatAdminUser(row: AdminUserRow): AdminUser {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: `${row.first_name} ${row.last_name}`,
    phone: row.phone,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
    studentId: row.student_id ?? null,
    faculty: row.faculty ?? null,
    department: row.department ?? null,
  };
}

function formatBackup(row: DataBackupRow): DataBackup {
  return {
    id: row.id,
    filename: row.filename,
    backupType: row.backup_type,
    fileSizeBytes: row.file_size_bytes !== null ? parseInt(row.file_size_bytes, 10) : null,
    status: row.status,
    createdBy: row.performed_by,
    createdAt: row.created_at,
  };
}

function formatContact(row: EmergencyContactRow): EmergencyContact {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    phone: row.phone,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function formatAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    oldValues: row.old_values,
    newValues: row.new_values,
    createdAt: row.created_at,
  };
}

function formatTreatmentType(row: TreatmentTypeRow): TreatmentType {
  return {
    id: row.id,
    name: row.name,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function formatFaculty(row: FacultyRow): Faculty {
  return {
    id: row.id,
    name: row.name,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

function formatDepartment(row: DepartmentRow): Department {
  return {
    id: row.id,
    facultyId: row.faculty_id,
    name: row.name,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

function formatLoginAttempt(row: LoginAttemptRow): LoginAttempt {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    success: row.success,
    failureReason: row.failure_reason,
    createdAt: row.created_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  // ── System Settings ─────────────────────────────────────────────────────────

  async getAllSettings(): Promise<SystemSetting[]> {
    const rows = await this.db.queryMany<SettingRow>(
      `SELECT key, value, description, updated_by, updated_at
       FROM system_settings
       ORDER BY key ASC`,
    );
    return rows.map(formatSetting);
  }

  async updateSetting(
    key: string,
    dto: UpdateSettingDto,
    updatedBy: string,
  ): Promise<SystemSetting> {
    const row = await this.db.queryOne<SettingRow>(
      `UPDATE system_settings
       SET value = $1, updated_by = $2, updated_at = now()
       WHERE key = $3
       RETURNING key, value, description, updated_by, updated_at`,
      [dto.value, updatedBy, key],
    );
    if (!row) throw new NotFoundException(`Setting '${key}' not found`);
    return formatSetting(row);
  }

  async getInfirmaryInfo(): Promise<InfirmaryInfo> {
    const rows = await this.db.queryMany<SettingRow>(
      `SELECT key, value
       FROM system_settings
       WHERE key IN ('infirmary_name', 'infirmary_lat', 'infirmary_lng', 'infirmary_phone')`,
    );
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const latStr = map.get('infirmary_lat');
    const lngStr = map.get('infirmary_lng');
    return {
      name: map.get('infirmary_name') ?? null,
      lat: latStr != null ? parseFloat(latStr) : null,
      lng: lngStr != null ? parseFloat(lngStr) : null,
      phone: map.get('infirmary_phone') ?? null,
    };
  }

  // ── Admin Users ─────────────────────────────────────────────────────────────

  async listUsers(dto: ListAdminUsersDto): Promise<PaginatedResult<AdminUser>> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (dto.role) {
      conditions.push(`role = $${idx++}::user_role`);
      values.push(dto.role);
    }
    if (dto.faculty) {
      conditions.push(`faculty = $${idx++}`);
      values.push(dto.faculty);
    }
    if (dto.search) {
      conditions.push(
        `(first_name ILIKE $${idx} OR last_name ILIKE $${idx} OR email ILIKE $${idx} OR COALESCE(student_id,'') ILIKE $${idx})`,
      );
      values.push(`%${dto.search}%`);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSort: Record<string, string> = {
      created_at: 'created_at', first_name: 'first_name',
      last_name: 'last_name', email: 'email', role: 'role',
    };
    const sortCol = allowedSort[dto.sortBy ?? 'created_at'] ?? 'created_at';
    const sortDir = dto.order === 'asc' ? 'ASC' : 'DESC';

    const result = await this.db.queryPaginated<AdminUserRow>(
      `SELECT COUNT(*) FROM users ${where}`,
      `SELECT id, student_id, email, first_name, last_name, phone, role, is_active, created_at,
              faculty, department
       FROM users ${where}
       ORDER BY ${sortCol} ${sortDir}`,
      values,
      { page: dto.page, limit: dto.limit },
    );

    return { ...result, data: result.data.map(formatAdminUser) };
  }

  async createUser(dto: CreateAdminUserDto): Promise<AdminUser> {
    const existing = await this.db.queryOne<{ id: string }>(
      `SELECT id FROM users WHERE email = $1`,
      [dto.email],
    );
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const row = await this.db.queryOne<AdminUserRow>(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7::user_role)
       RETURNING id, student_id, email, first_name, last_name, phone, role, is_active, created_at, faculty, department`,
      [
        randomUUID(),
        dto.email,
        passwordHash,
        dto.firstName,
        dto.lastName,
        dto.phone ?? null,
        dto.role,
      ],
    );
    return formatAdminUser(row!);
  }

  async updateUser(id: string, dto: UpdateAdminUserDto): Promise<AdminUser> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (dto.email !== undefined) {
      const conflict = await this.db.queryOne<{ id: string }>(
        `SELECT id FROM users WHERE email = $1 AND id != $2`,
        [dto.email, id],
      );
      if (conflict) throw new ConflictException('Email already registered');
      fields.push(`email = $${idx++}`);
      values.push(dto.email);
    }
    if (dto.firstName !== undefined) {
      fields.push(`first_name = $${idx++}`);
      values.push(dto.firstName);
    }
    if (dto.lastName !== undefined) {
      fields.push(`last_name = $${idx++}`);
      values.push(dto.lastName);
    }
    if (dto.phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(dto.phone || null);
    }
    if (dto.role !== undefined) {
      fields.push(`role = $${idx++}::user_role`);
      values.push(dto.role);
    }

    if (fields.length === 0) {
      return this.getUserById(id);
    }

    fields.push(`updated_at = now()`);
    values.push(id);

    const row = await this.db.queryOne<AdminUserRow>(
      `UPDATE users
       SET ${fields.join(', ')}
       WHERE id = $${idx}
       RETURNING id, student_id, email, first_name, last_name, phone, role, is_active, created_at, faculty, department`,
      values,
    );
    if (!row) throw new NotFoundException('User not found');
    return formatAdminUser(row);
  }

  async deactivateUser(id: string): Promise<AdminUser> {
    const row = await this.db.queryOne<AdminUserRow>(
      `UPDATE users
       SET is_active = false, updated_at = now()
       WHERE id = $1
       RETURNING id, student_id, email, first_name, last_name, phone, role, is_active, created_at, faculty, department`,
      [id],
    );
    if (!row) throw new NotFoundException('User not found');
    return formatAdminUser(row);
  }

  async activateUser(id: string): Promise<AdminUser> {
    const row = await this.db.queryOne<AdminUserRow>(
      `UPDATE users
       SET is_active = true, updated_at = now()
       WHERE id = $1
       RETURNING id, student_id, email, first_name, last_name, phone, role, is_active, created_at, faculty, department`,
      [id],
    );
    if (!row) throw new NotFoundException('User not found');
    return formatAdminUser(row);
  }

  async resetStudentPassword(id: string): Promise<void> {
    const user = await this.db.queryOne<{ student_id: string | null; role: string }>(
      `SELECT student_id, role FROM users WHERE id = $1`,
      [id],
    );
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== 'student') {
      throw new BadRequestException('Password reset via student ID is only available for students');
    }
    if (!user.student_id) {
      throw new BadRequestException('Student has no student ID to reset password to');
    }

    const passwordHash = await bcrypt.hash(user.student_id, BCRYPT_ROUNDS);
    await this.db.execute(
      `UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`,
      [passwordHash, id],
    );
  }

  private async getUserById(id: string): Promise<AdminUser> {
    const row = await this.db.queryOne<AdminUserRow>(
      `SELECT id, student_id, email, first_name, last_name, phone, role, is_active, created_at, faculty, department
       FROM users WHERE id = $1`,
      [id],
    );
    if (!row) throw new NotFoundException('User not found');
    return formatAdminUser(row);
  }

  // ── Backups ─────────────────────────────────────────────────────────────────

  async createBackup(createdBy: string): Promise<DataBackup> {
    const backupDir =
      this.config.get<string>('BACKUP_DIR') ?? path.join(process.cwd(), 'backups');

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const ts = new Date()
      .toISOString()
      .replace(/\.\d{3}Z$/, '')
      .replace('T', '-')
      .replace(/:/g, '');
    const filename = `backup-${ts}.json`;
    const filePath = path.join(backupDir, filename);

    const backupId = randomUUID();
    await this.db.execute(
      `INSERT INTO data_backups (id, filename, backup_type, performed_by)
       VALUES ($1, $2, 'manual', $3)`,
      [backupId, filename, createdBy],
    );

    try {
      const dump: Record<string, unknown[]> = {};
      for (const table of BACKUP_TABLES) {
        const rows = await this.db.queryMany<Record<string, unknown>>(
          `SELECT * FROM ${table}`,
        );
        dump[table] = rows;
      }

      const content = JSON.stringify({ exportedAt: new Date().toISOString(), tables: dump }, null, 2);
      fs.writeFileSync(filePath, content, 'utf8');

      const stat = fs.statSync(filePath);
      const row = await this.db.queryOne<DataBackupRow>(
        `UPDATE data_backups
         SET status = 'completed', file_size_bytes = $1, completed_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [stat.size, backupId],
      );
      this.logger.log(`Backup completed: ${filename} (${stat.size} bytes)`);
      return formatBackup(row!);
    } catch (err: unknown) {
      await this.db.execute(
        `UPDATE data_backups SET status = 'failed' WHERE id = $1`,
        [backupId],
      );
      this.logger.error(`Backup failed: ${(err as Error).message}`);
      throw new InternalServerErrorException('Backup creation failed.');
    }
  }

  async listBackups(): Promise<DataBackup[]> {
    const rows = await this.db.queryMany<DataBackupRow>(
      `SELECT id, filename, backup_type, file_size_bytes, status, performed_by, created_at
       FROM data_backups
       ORDER BY created_at DESC`,
    );
    return rows.map(formatBackup);
  }

  async downloadBackup(id: string): Promise<{ filename: string; buffer: Buffer }> {
    const row = await this.db.queryOne<DataBackupRow>(
      `SELECT id, filename, status FROM data_backups WHERE id = $1`,
      [id],
    );
    if (!row) throw new NotFoundException('Backup not found');
    if (row.status !== 'completed') {
      throw new BadRequestException(`Backup is not ready (status: ${row.status})`);
    }
    const backupDir =
      this.config.get<string>('BACKUP_DIR') ?? path.join(process.cwd(), 'backups');
    const filePath = path.join(backupDir, row.filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Backup file not found on disk');
    }
    const buffer = fs.readFileSync(filePath);
    return { filename: row.filename, buffer };
  }

  // ── Emergency Contacts ──────────────────────────────────────────────────────

  async listContacts(): Promise<EmergencyContact[]> {
    const rows = await this.db.queryMany<EmergencyContactRow>(
      `SELECT id, name, category, phone, note, created_at, updated_at
       FROM emergency_contacts_directory
       ORDER BY category ASC, name ASC`,
    );
    return rows.map(formatContact);
  }

  async createContact(dto: CreateEmergencyContactDto): Promise<EmergencyContact> {
    const row = await this.db.queryOne<EmergencyContactRow>(
      `INSERT INTO emergency_contacts_directory (id, name, category, phone, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, category, phone, note, created_at, updated_at`,
      [randomUUID(), dto.name, dto.category, dto.phone, dto.note ?? null],
    );
    return formatContact(row!);
  }

  async updateContact(
    id: string,
    dto: UpdateEmergencyContactDto,
  ): Promise<EmergencyContact> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (dto.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(dto.name);
    }
    if (dto.category !== undefined) {
      fields.push(`category = $${idx++}`);
      values.push(dto.category);
    }
    if (dto.phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(dto.phone);
    }
    if (dto.note !== undefined) {
      fields.push(`note = $${idx++}`);
      values.push(dto.note || null);
    }

    if (fields.length === 0) {
      const existing = await this.db.queryOne<EmergencyContactRow>(
        `SELECT id, name, category, phone, note, created_at, updated_at
         FROM emergency_contacts_directory WHERE id = $1`,
        [id],
      );
      if (!existing) throw new NotFoundException('Emergency contact not found');
      return formatContact(existing);
    }

    fields.push(`updated_at = now()`);
    values.push(id);

    const row = await this.db.queryOne<EmergencyContactRow>(
      `UPDATE emergency_contacts_directory
       SET ${fields.join(', ')}
       WHERE id = $${idx}
       RETURNING id, name, category, phone, note, created_at, updated_at`,
      values,
    );
    if (!row) throw new NotFoundException('Emergency contact not found');
    return formatContact(row);
  }

  async deleteContact(id: string): Promise<void> {
    const count = await this.db.execute(
      `DELETE FROM emergency_contacts_directory WHERE id = $1`,
      [id],
    );
    if (count === 0) throw new NotFoundException('Emergency contact not found');
  }

  // ── Audit Logs ────────────────────────────────────────────────────────────

  async listAuditLogs(dto: ListAuditLogsDto): Promise<PaginatedResult<AuditLog>> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (dto.action) {
      conditions.push(`a.action = $${idx++}`);
      values.push(dto.action);
    }
    if (dto.entityType) {
      conditions.push(`a.entity_type = $${idx++}`);
      values.push(dto.entityType);
    }
    if (dto.search) {
      conditions.push(
        `(CONCAT(u.first_name, ' ', u.last_name) ILIKE $${idx} OR a.entity_type ILIKE $${idx} OR a.entity_id ILIKE $${idx})`,
      );
      values.push(`%${dto.search}%`);
      idx++;
    }
    if (dto.from) {
      conditions.push(`a.created_at >= $${idx++}::timestamptz`);
      values.push(dto.from);
    }
    if (dto.to) {
      conditions.push(`a.created_at <= $${idx++}::timestamptz`);
      values.push(dto.to);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id ${where}`;
    const dataSql = `SELECT a.id, a.user_id, a.action, a.entity_type, a.entity_id,
                            a.old_values, a.new_values, a.created_at,
                            CONCAT(u.first_name, ' ', u.last_name) AS user_name
                     FROM audit_logs a
                     LEFT JOIN users u ON u.id = a.user_id
                     ${where}
                     ORDER BY a.created_at DESC`;

    const result = await this.db.queryPaginated<AuditLogRow>(
      countSql,
      dataSql,
      values,
      { page: dto.page, limit: dto.limit },
    );

    return { ...result, data: result.data.map(formatAuditLog) };
  }

  // ── Treatment Types ───────────────────────────────────────────────────────

  async listTreatmentTypes(): Promise<TreatmentType[]> {
    const rows = await this.db.queryMany<TreatmentTypeRow>(
      `SELECT id, name, is_active, created_at FROM treatment_types ORDER BY name ASC`,
    );
    return rows.map(formatTreatmentType);
  }

  async createTreatmentType(dto: CreateTreatmentTypeDto): Promise<TreatmentType> {
    const existing = await this.db.queryOne<{ id: string }>(
      `SELECT id FROM treatment_types WHERE LOWER(name) = LOWER($1)`,
      [dto.name],
    );
    if (existing) throw new ConflictException('Treatment type name already exists');

    const row = await this.db.queryOne<TreatmentTypeRow>(
      `INSERT INTO treatment_types (id, name)
       VALUES ($1, $2)
       RETURNING id, name, is_active, created_at`,
      [randomUUID(), dto.name],
    );
    return formatTreatmentType(row!);
  }

  async toggleTreatmentType(id: string): Promise<TreatmentType> {
    const row = await this.db.queryOne<TreatmentTypeRow>(
      `UPDATE treatment_types
       SET is_active = NOT is_active
       WHERE id = $1
       RETURNING id, name, is_active, created_at`,
      [id],
    );
    if (!row) throw new NotFoundException('Treatment type not found');
    return formatTreatmentType(row);
  }

  async deleteTreatmentType(id: string): Promise<void> {
    const inUse = await this.db.queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM patient_visits WHERE treatment_type_id = $1`,
      [id],
    );
    if (inUse && parseInt(inUse.count, 10) > 0) {
      throw new ConflictException('ไม่สามารถลบได้ เนื่องจากมีการใช้งานอยู่ในบันทึกการรักษา');
    }
    const affected = await this.db.execute(
      `DELETE FROM treatment_types WHERE id = $1`,
      [id],
    );
    if (affected === 0) throw new NotFoundException('Treatment type not found');
  }

  // ── Faculties ──────────────────────────────────────────────────────────────

  async listFaculties(): Promise<Faculty[]> {
    const faculties = await this.db.queryMany<FacultyRow>(
      `SELECT id, name, is_active, sort_order, created_at, updated_at
       FROM faculties ORDER BY sort_order ASC, name ASC`,
    );
    const departments = await this.db.queryMany<DepartmentRow>(
      `SELECT id, faculty_id, name, is_active, sort_order, created_at, updated_at
       FROM departments ORDER BY sort_order ASC, name ASC`,
    );

    const deptMap = new Map<string, Department[]>();
    for (const d of departments) {
      const list = deptMap.get(d.faculty_id) ?? [];
      list.push(formatDepartment(d));
      deptMap.set(d.faculty_id, list);
    }

    return faculties.map((f) => ({
      ...formatFaculty(f),
      departments: deptMap.get(f.id) ?? [],
    }));
  }

  async createFaculty(dto: CreateFacultyDto): Promise<Faculty> {
    const existing = await this.db.queryOne<{ id: string }>(
      `SELECT id FROM faculties WHERE LOWER(name) = LOWER($1)`,
      [dto.name],
    );
    if (existing) throw new ConflictException('ชื่อคณะนี้มีอยู่แล้ว');

    const maxOrder = await this.db.queryOne<{ max: number }>(
      `SELECT COALESCE(MAX(sort_order), 0) AS max FROM faculties`,
    );

    const row = await this.db.queryOne<FacultyRow>(
      `INSERT INTO faculties (id, name, sort_order)
       VALUES ($1, $2, $3)
       RETURNING id, name, is_active, sort_order, created_at, updated_at`,
      [randomUUID(), dto.name, dto.sortOrder ?? (maxOrder!.max + 1)],
    );
    return { ...formatFaculty(row!), departments: [] };
  }

  async updateFaculty(id: string, dto: CreateFacultyDto): Promise<Faculty> {
    const conflict = await this.db.queryOne<{ id: string }>(
      `SELECT id FROM faculties WHERE LOWER(name) = LOWER($1) AND id != $2`,
      [dto.name, id],
    );
    if (conflict) throw new ConflictException('ชื่อคณะนี้มีอยู่แล้ว');

    const row = await this.db.queryOne<FacultyRow>(
      `UPDATE faculties SET name = $1, sort_order = COALESCE($2, sort_order), updated_at = now()
       WHERE id = $3
       RETURNING id, name, is_active, sort_order, created_at, updated_at`,
      [dto.name, dto.sortOrder ?? null, id],
    );
    if (!row) throw new NotFoundException('ไม่พบคณะ');
    return formatFaculty(row);
  }

  async toggleFaculty(id: string): Promise<Faculty> {
    const row = await this.db.queryOne<FacultyRow>(
      `UPDATE faculties SET is_active = NOT is_active, updated_at = now()
       WHERE id = $1
       RETURNING id, name, is_active, sort_order, created_at, updated_at`,
      [id],
    );
    if (!row) throw new NotFoundException('ไม่พบคณะ');
    return formatFaculty(row);
  }

  async deleteFaculty(id: string): Promise<void> {
    const inUse = await this.db.queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM users WHERE faculty = (SELECT name FROM faculties WHERE id = $1)`,
      [id],
    );
    if (inUse && parseInt(inUse.count, 10) > 0) {
      throw new ConflictException('ไม่สามารถลบได้ เนื่องจากมีผู้ใช้ในคณะนี้อยู่');
    }
    const affected = await this.db.execute(`DELETE FROM faculties WHERE id = $1`, [id]);
    if (affected === 0) throw new NotFoundException('ไม่พบคณะ');
  }

  // ── Departments ───────────────────────────────────────────────────────────

  async createDepartment(dto: CreateDepartmentDto): Promise<Department> {
    const faculty = await this.db.queryOne<{ id: string }>(
      `SELECT id FROM faculties WHERE id = $1`,
      [dto.facultyId],
    );
    if (!faculty) throw new NotFoundException('ไม่พบคณะ');

    const existing = await this.db.queryOne<{ id: string }>(
      `SELECT id FROM departments WHERE faculty_id = $1 AND LOWER(name) = LOWER($2)`,
      [dto.facultyId, dto.name],
    );
    if (existing) throw new ConflictException('สาขานี้มีอยู่แล้วในคณะ');

    const maxOrder = await this.db.queryOne<{ max: number }>(
      `SELECT COALESCE(MAX(sort_order), 0) AS max FROM departments WHERE faculty_id = $1`,
      [dto.facultyId],
    );

    const row = await this.db.queryOne<DepartmentRow>(
      `INSERT INTO departments (id, faculty_id, name, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING id, faculty_id, name, is_active, sort_order, created_at, updated_at`,
      [randomUUID(), dto.facultyId, dto.name, dto.sortOrder ?? (maxOrder!.max + 1)],
    );
    return formatDepartment(row!);
  }

  async updateDepartment(id: string, name: string): Promise<Department> {
    const dept = await this.db.queryOne<DepartmentRow>(
      `SELECT id, faculty_id FROM departments WHERE id = $1`,
      [id],
    );
    if (!dept) throw new NotFoundException('ไม่พบสาขา');

    const conflict = await this.db.queryOne<{ id: string }>(
      `SELECT id FROM departments WHERE faculty_id = $1 AND LOWER(name) = LOWER($2) AND id != $3`,
      [dept.faculty_id, name, id],
    );
    if (conflict) throw new ConflictException('สาขานี้มีอยู่แล้วในคณะ');

    const row = await this.db.queryOne<DepartmentRow>(
      `UPDATE departments SET name = $1, updated_at = now()
       WHERE id = $2
       RETURNING id, faculty_id, name, is_active, sort_order, created_at, updated_at`,
      [name, id],
    );
    return formatDepartment(row!);
  }

  async toggleDepartment(id: string): Promise<Department> {
    const row = await this.db.queryOne<DepartmentRow>(
      `UPDATE departments SET is_active = NOT is_active, updated_at = now()
       WHERE id = $1
       RETURNING id, faculty_id, name, is_active, sort_order, created_at, updated_at`,
      [id],
    );
    if (!row) throw new NotFoundException('ไม่พบสาขา');
    return formatDepartment(row);
  }

  async deleteDepartment(id: string): Promise<void> {
    const dept = await this.db.queryOne<{ name: string; faculty_id: string }>(
      `SELECT d.name, f.name AS faculty_name FROM departments d JOIN faculties f ON f.id = d.faculty_id WHERE d.id = $1`,
      [id],
    );
    if (!dept) throw new NotFoundException('ไม่พบสาขา');

    const inUse = await this.db.queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM users WHERE department = $1`,
      [dept.name],
    );
    if (inUse && parseInt(inUse.count, 10) > 0) {
      throw new ConflictException('ไม่สามารถลบได้ เนื่องจากมีผู้ใช้ในสาขานี้อยู่');
    }
    await this.db.execute(`DELETE FROM departments WHERE id = $1`, [id]);
  }

  // ── Login Attempts ────────────────────────────────────────────────────────

  async listLoginAttempts(dto: ListLoginAttemptsDto): Promise<PaginatedResult<LoginAttempt>> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (dto.email) {
      conditions.push(`email ILIKE $${idx++}`);
      values.push(`%${dto.email}%`);
    }
    if (dto.success !== undefined) {
      conditions.push(`success = $${idx++}`);
      values.push(dto.success);
    }
    if (dto.from) {
      conditions.push(`created_at >= $${idx++}::timestamptz`);
      values.push(dto.from);
    }
    if (dto.to) {
      conditions.push(`created_at <= $${idx++}::timestamptz`);
      values.push(dto.to);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) FROM login_attempts ${where}`;
    const dataSql = `SELECT id, user_id, email, ip_address::text, user_agent, success, failure_reason, created_at
                     FROM login_attempts ${where}
                     ORDER BY created_at DESC`;

    const result = await this.db.queryPaginated<LoginAttemptRow>(
      countSql,
      dataSql,
      values,
      { page: dto.page, limit: dto.limit },
    );

    return { ...result, data: result.data.map(formatLoginAttempt) };
  }

  async getLoginAttemptStats(): Promise<{
    totalToday: number;
    failedToday: number;
    lockedAccounts: number;
    topFailedEmails: { email: string; count: number }[];
  }> {
    const [todayRow, failedRow, lockedRow] = await Promise.all([
      this.db.queryOne<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM login_attempts WHERE created_at >= CURRENT_DATE`,
      ),
      this.db.queryOne<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM login_attempts WHERE created_at >= CURRENT_DATE AND success = false`,
      ),
      this.db.queryOne<{ count: string }>(
        `SELECT COUNT(DISTINCT email)::text AS count FROM login_attempts
         WHERE success = false AND created_at > NOW() - INTERVAL '15 minutes'
         GROUP BY email HAVING COUNT(*) >= 5`,
      ),
    ]);

    const topFailed = await this.db.queryMany<{ email: string; count: string }>(
      `SELECT email, COUNT(*)::text AS count
       FROM login_attempts
       WHERE success = false AND created_at >= CURRENT_DATE
       GROUP BY email
       ORDER BY COUNT(*) DESC
       LIMIT 10`,
    );

    return {
      totalToday: parseInt(todayRow?.count ?? '0', 10),
      failedToday: parseInt(failedRow?.count ?? '0', 10),
      lockedAccounts: parseInt(lockedRow?.count ?? '0', 10),
      topFailedEmails: topFailed.map((r) => ({ email: r.email, count: parseInt(r.count, 10) })),
    };
  }
}
