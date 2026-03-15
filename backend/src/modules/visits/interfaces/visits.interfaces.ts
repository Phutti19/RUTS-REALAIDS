// ── Shared sub-types ──────────────────────────────────────────────────────────

export interface VitalSigns {
  temperature?: number;       // Celsius
  bloodPressure?: string;     // e.g. "120/80"
  heartRate?: number;         // bpm
  respiratoryRate?: number;   // per minute
  oxygenSaturation?: number;  // %
  weight?: number;            // kg
  height?: number;            // cm
}

// ── DB row shapes (match PostgreSQL column names) ─────────────────────────────

export interface VisitRow {
  id: string;
  patient_id: string;
  staff_id: string;
  incident_id: string | null;
  visit_type: string;
  chief_complaint: string;
  diagnosis: string | null;
  vital_signs: VitalSigns | null;
  treatment: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
  // Clinical fields added by migration
  illness_history: string | null;
  wound_care: boolean;
  rest_hours: string | null; // NUMERIC returned as string by pg driver
  consultation_types: string[];
  is_referred: boolean;
}

/** Extended row from JOIN (includes patient + staff name columns) */
export interface VisitDetailRow extends VisitRow {
  patient_first_name: string;
  patient_last_name: string;
  patient_email: string;
  patient_student_id: string | null;
  patient_phone: string | null;
  staff_first_name: string;
  staff_last_name: string;
}

export interface VisitMedicationRow {
  id: string;
  visit_id: string;
  medicine_id: string;
  batch_id: string;
  quantity: number;
  dosage_instruction: string | null;
  created_at: Date;
  // Joined columns
  medicine_name: string;
  batch_number: string;
}

// ── API response shapes (camelCase) ───────────────────────────────────────────

export interface VisitSummary {
  id: string;
  patientId: string;
  staffId: string;
  incidentId: string | null;
  visitType: string;
  chiefComplaint: string;
  diagnosis: string | null;
  status: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    studentId: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Visit extends VisitSummary {
  vitalSigns: VitalSigns | null;
  treatmentNotes: string | null;
  illnessHistory: string | null;
  woundCare: boolean;
  restHours: number | null;
  consultationTypes: string[];
  isReferred: boolean;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    studentId: string | null;
    phone: string | null;
  };
  staff: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface QueueEntry {
  id: string;
  patientId: string;
  visitType: string;
  chiefComplaint: string;
  vitalSigns: VitalSigns | null;
  status: string;
  /** Minutes elapsed since the visit was created */
  waitingMinutes: number;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    studentId: string | null;
  };
  createdAt: Date;
}

export interface VisitMedication {
  id: string;
  visitId: string;
  medicineId: string;
  batchId: string;
  medicineName: string;
  batchNumber: string;
  quantity: number;
  dosageInstruction: string | null;
  createdAt: Date;
}
