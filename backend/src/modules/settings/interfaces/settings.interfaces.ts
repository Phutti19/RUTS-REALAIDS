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
}

// ── Data Backup ───────────────────────────────────────────────────────────────

export type BackupStatus = 'pending' | 'completed' | 'failed';
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
