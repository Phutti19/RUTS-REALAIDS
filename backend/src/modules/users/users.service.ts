import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';

import { DatabaseService, PaginatedResult } from '../../database/db.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateHealthProfileDto } from './dto/update-health-profile.dto';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto';
import { ListUsersDto } from './dto/list-users.dto';
import {
  UserRow,
  HealthProfileRow,
  UserProfile,
  HealthProfile,
} from './interfaces/users.interfaces';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly db: DatabaseService) {}

  // ── Current user ────────────────────────────────────────────────────────────

  async getMe(userId: string): Promise<UserProfile> {
    const user = await this.db.queryOne<UserRow>(
      `SELECT id, student_id, email, first_name, last_name, phone, role, is_active, created_at,
              national_id, title, birth_date, faculty, department, year_of_study, "position"
       FROM users
       WHERE id = $1`,
      [userId],
    );

    if (!user) throw new NotFoundException('User not found');
    return this.formatProfile(user);
  }

  async updateMe(userId: string, dto: UpdateProfileDto): Promise<UserProfile> {
    // Build SET clause dynamically from provided fields only
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

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

    if (fields.length === 0) {
      return this.getMe(userId);
    }

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const updated = await this.db.queryOne<UserRow>(
      `UPDATE users
       SET ${fields.join(', ')}
       WHERE id = $${idx}
       RETURNING id, student_id, email, first_name, last_name, phone, role, is_active, created_at,
                 national_id, title, birth_date, faculty, department, year_of_study, "position"`,
      values,
    );

    if (!updated) throw new NotFoundException('User not found');
    this.logger.log(`Profile updated: userId=${userId}`);

    return this.formatProfile(updated);
  }

  // ── Health profile ──────────────────────────────────────────────────────────

  async getHealthProfile(userId: string): Promise<HealthProfile> {
    const userExists = await this.db.queryOne<{ id: string }>(
      `SELECT id FROM users WHERE id = $1`,
      [userId],
    );
    if (!userExists) throw new NotFoundException('User not found');

    const row = await this.db.queryOne<HealthProfileRow>(
      `SELECT id, user_id, blood_type, allergies, chronic_diseases,
              emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
              updated_at
       FROM student_health_profiles
       WHERE user_id = $1`,
      [userId],
    );

    // Return empty profile if none exists yet (profile is created on first update)
    return this.formatHealthProfile(userId, row ?? null);
  }

  async updateHealthProfile(
    userId: string,
    dto: UpdateHealthProfileDto,
  ): Promise<HealthProfile> {
    const userExists = await this.db.queryOne<{ id: string }>(
      `SELECT id FROM users WHERE id = $1`,
      [userId],
    );
    if (!userExists) throw new NotFoundException('User not found');

    // Upsert: create profile on first call, update on subsequent calls
    const row = await this.db.queryOne<HealthProfileRow>(
      `INSERT INTO student_health_profiles
         (user_id, blood_type, allergies, chronic_diseases,
          emergency_contact_name, emergency_contact_phone, emergency_contact_relation)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id) DO UPDATE SET
         blood_type                 = COALESCE(EXCLUDED.blood_type, student_health_profiles.blood_type),
         allergies                  = EXCLUDED.allergies,
         chronic_diseases           = EXCLUDED.chronic_diseases,
         emergency_contact_name     = EXCLUDED.emergency_contact_name,
         emergency_contact_phone    = EXCLUDED.emergency_contact_phone,
         emergency_contact_relation = EXCLUDED.emergency_contact_relation,
         updated_at                 = NOW()
       RETURNING id, user_id, blood_type, allergies, chronic_diseases,
                 emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
                 updated_at`,
      [
        userId,
        dto.bloodType ?? null,
        dto.allergies ?? null,
        dto.chronicDiseases ?? null,
        dto.emergencyContactName ?? null,
        dto.emergencyContactPhone ?? null,
        dto.emergencyContactRelation ?? null,
      ],
    );

    this.logger.log(`Health profile updated: userId=${userId}`);
    return this.formatHealthProfile(userId, row);
  }

  // ── Staff: list & detail ────────────────────────────────────────────────────

  async listUsers(dto: ListUsersDto): Promise<PaginatedResult<UserProfile>> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (dto.role) {
      conditions.push(`role = $${idx++}::user_role`);
      values.push(dto.role);
    }

    if (dto.isActive !== undefined) {
      conditions.push(`is_active = $${idx++}`);
      values.push(dto.isActive);
    }

    if (dto.search) {
      conditions.push(
        `(first_name ILIKE $${idx} OR last_name ILIKE $${idx} OR email ILIKE $${idx} OR COALESCE(student_id, '') ILIKE $${idx})`,
      );
      values.push(`%${dto.search}%`);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Whitelist sort columns to prevent SQL injection
    const allowedSort: Record<string, string> = {
      created_at: 'created_at',
      first_name: 'first_name',
      last_name: 'last_name',
      email: 'email',
      role: 'role',
    };
    const sortCol = allowedSort[dto.sortBy ?? 'created_at'] ?? 'created_at';
    const sortDir = dto.order === 'asc' ? 'ASC' : 'DESC';

    const countSql = `SELECT COUNT(*) FROM users ${where}`;
    const dataSql = `
      SELECT id, student_id, email, first_name, last_name, phone, role, is_active, created_at,
              national_id, title, birth_date, faculty, department, year_of_study, "position"
      FROM users
      ${where}
      ORDER BY ${sortCol} ${sortDir}
    `;

    const result = await this.db.queryPaginated<UserRow>(
      countSql,
      dataSql,
      values,
      { page: dto.page, limit: dto.limit },
    );

    return {
      ...result,
      data: result.data.map((u) => this.formatProfile(u)),
    };
  }

  async getUserById(id: string): Promise<UserProfile> {
    const user = await this.db.queryOne<UserRow>(
      `SELECT id, student_id, email, first_name, last_name, phone, role, is_active, created_at,
              national_id, title, birth_date, faculty, department, year_of_study, "position"
       FROM users
       WHERE id = $1`,
      [id],
    );

    if (!user) throw new NotFoundException(`User with id '${id}' not found`);
    return this.formatProfile(user);
  }

  // ── Formatters ──────────────────────────────────────────────────────────────

  private formatProfile(row: UserRow): UserProfile {
    return {
      id: row.id,
      studentId: row.student_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: `${row.first_name} ${row.last_name}`,
      phone: row.phone,
      role: row.role,
      isActive: row.is_active,
      createdAt: row.created_at,
      nationalId: row.national_id ?? null,
      title: row.title ?? null,
      birthDate: row.birth_date ?? null,
      faculty: row.faculty ?? null,
      department: row.department ?? null,
      yearOfStudy: row.year_of_study ?? null,
      position: row.position ?? null,
    };
  }

  // ── Staff: update patient demographics ──────────────────────────────────────

  async updatePatientProfile(patientId: string, dto: UpdatePatientProfileDto): Promise<UserProfile> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (dto.title !== undefined)       { fields.push(`title = $${idx++}`);         values.push(dto.title ?? null); }
    if (dto.nationalId !== undefined)  { fields.push(`national_id = $${idx++}`);   values.push(dto.nationalId ?? null); }
    if (dto.birthDate !== undefined)   { fields.push(`birth_date = $${idx++}`);    values.push(dto.birthDate ?? null); }
    if (dto.department !== undefined)  { fields.push(`department = $${idx++}`);    values.push(dto.department ?? null); }
    if (dto.yearOfStudy !== undefined) { fields.push(`year_of_study = $${idx++}`); values.push(dto.yearOfStudy ?? null); }
    if (dto.position !== undefined)    { fields.push(`"position" = $${idx++}`);    values.push(dto.position ?? null); }
    if (dto.phone !== undefined)       { fields.push(`phone = $${idx++}`);         values.push(dto.phone ?? null); }

    if (fields.length === 0) return this.getUserById(patientId);

    fields.push(`updated_at = NOW()`);
    values.push(patientId);

    const updated = await this.db.queryOne<UserRow>(
      `UPDATE users
       SET ${fields.join(', ')}
       WHERE id = $${idx}
       RETURNING id, student_id, email, first_name, last_name, phone, role, is_active, created_at,
                 national_id, title, birth_date, faculty, department, year_of_study, "position"`,
      values,
    );

    if (!updated) throw new NotFoundException(`Patient '${patientId}' not found`);
    return this.formatProfile(updated);
  }

  private formatHealthProfile(
    userId: string,
    row: HealthProfileRow | null,
  ): HealthProfile {
    return {
      userId,
      bloodType: row?.blood_type ?? null,
      allergies: row?.allergies ?? null,
      chronicDiseases: row?.chronic_diseases ?? null,
      emergencyContact: {
        name: row?.emergency_contact_name ?? null,
        phone: row?.emergency_contact_phone ?? null,
        relation: row?.emergency_contact_relation ?? null,
      },
      updatedAt: row?.updated_at ?? new Date(0),
    };
  }
}
