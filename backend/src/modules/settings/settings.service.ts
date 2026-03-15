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
    if (dto.search) {
      conditions.push(
        `(first_name ILIKE $${idx} OR last_name ILIKE $${idx} OR email ILIKE $${idx})`,
      );
      values.push(`%${dto.search}%`);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await this.db.queryPaginated<AdminUserRow>(
      `SELECT COUNT(*) FROM users ${where}`,
      `SELECT id, email, first_name, last_name, phone, role, is_active, created_at
       FROM users ${where}
       ORDER BY created_at DESC`,
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
       RETURNING id, email, first_name, last_name, phone, role, is_active, created_at`,
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
       RETURNING id, email, first_name, last_name, phone, role, is_active, created_at`,
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
       RETURNING id, email, first_name, last_name, phone, role, is_active, created_at`,
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
       RETURNING id, email, first_name, last_name, phone, role, is_active, created_at`,
      [id],
    );
    if (!row) throw new NotFoundException('User not found');
    return formatAdminUser(row);
  }

  private async getUserById(id: string): Promise<AdminUser> {
    const row = await this.db.queryOne<AdminUserRow>(
      `SELECT id, email, first_name, last_name, phone, role, is_active, created_at
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
}
