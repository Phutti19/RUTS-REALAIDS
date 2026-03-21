// ── System Settings ───────────────────────────────────────────────────────────

export interface SettingRow {
  key: string;
  value: string | null;
  description: string | null;
  updated_by: string | null;
  updated_at: Date | null;
}

export interface SystemSetting {
  key: string;
  value: string | null;
  description: string | null;
  updatedBy: string | null;
  updatedAt: Date | null;
}

export interface InfirmaryInfo {
  name: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
}

// ── Admin Users ───────────────────────────────────────────────────────────────

export interface AdminUserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: 'student' | 'staff' | 'admin';
  is_active: boolean;
  created_at: Date;
  student_id: string | null;
  faculty: string | null;
  department: string | null;
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  role: 'student' | 'staff' | 'admin';
  isActive: boolean;
  createdAt: Date;
  studentId: string | null;
  faculty: string | null;
  department: string | null;
}

// ── Data Backup ───────────────────────────────────────────────────────────────

export type BackupStatus = 'in_progress' | 'completed' | 'failed';
export type BackupType = 'manual' | 'scheduled';

export interface DataBackupRow {
  id: string;
  filename: string;
  backup_type: BackupType;
  file_size_bytes: string | null; // bigint returned as string by pg driver
  status: BackupStatus;
  performed_by: string | null;
  created_at: Date;
}

export interface DataBackup {
  id: string;
  filename: string;
  backupType: BackupType;
  fileSizeBytes: number | null;
  status: BackupStatus;
  createdBy: string | null;
  createdAt: Date;
}

// ── Emergency Contacts ────────────────────────────────────────────────────────

export type EmergencyCategory = 'hospital' | 'police' | 'rescue' | 'fire' | 'other';

export interface EmergencyContactRow {
  id: string;
  name: string;
  category: EmergencyCategory;
  phone: string;
  note: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface EmergencyContact {
  id: string;
  name: string;
  category: EmergencyCategory;
  phone: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Audit Logs ───────────────────────────────────────────────────────────────

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: Date;
  user_name: string | null;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  createdAt: Date;
}

// ── Treatment Types ──────────────────────────────────────────────────────────

export interface TreatmentTypeRow {
  id: string;
  name: string;
  is_active: boolean;
  created_at: Date;
}

export interface TreatmentType {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
}

// ── Faculties & Departments ──────────────────────────────────────────────────

export interface FacultyRow {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface Faculty {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  departments?: Department[];
}

export interface DepartmentRow {
  id: string;
  faculty_id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface Department {
  id: string;
  facultyId: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
}

// ── Login Attempts ───────────────────────────────────────────────────────────

export interface LoginAttemptRow {
  id: string;
  user_id: string | null;
  email: string;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  failure_reason: string | null;
  created_at: Date;
}

export interface LoginAttempt {
  id: string;
  userId: string | null;
  email: string;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  failureReason: string | null;
  createdAt: Date;
}
