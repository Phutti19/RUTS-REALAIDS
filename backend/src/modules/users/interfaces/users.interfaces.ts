// ── Database row types ────────────────────────────────────────────────────────

export interface UserRow {
  id: string;
  student_id: string | null;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: 'student' | 'staff' | 'admin';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export type BloodType = 'A' | 'B' | 'AB' | 'O' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface HealthProfileRow {
  id: string;
  user_id: string;
  blood_type: BloodType | null;
  allergies: string | null;
  chronic_diseases: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relation: string | null;
  created_at: Date;
  updated_at: Date;
}

// ── API response types ────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  studentId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  role: 'student' | 'staff' | 'admin';
  isActive: boolean;
  createdAt: Date;
}

export interface HealthProfile {
  userId: string;
  bloodType: BloodType | null;
  allergies: string | null;
  chronicDiseases: string | null;
  emergencyContact: {
    name: string | null;
    phone: string | null;
    relation: string | null;
  };
  updatedAt: Date;
}
