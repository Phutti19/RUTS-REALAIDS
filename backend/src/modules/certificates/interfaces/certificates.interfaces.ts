// ── DB row shapes ─────────────────────────────────────────────────────────────

export interface CertificateRow {
  id: string;
  visit_id: string;
  certificate_number: string;
  diagnosis_text: string;
  rest_days: number | null;
  issued_by: string;
  created_at: Date;
}

/**
 * Row returned by the v_medical_certificates view.
 * Actual columns: id, certificate_number, visit_id, patient_id, patient_name,
 * student_id, issued_by, issued_by_name, diagnosis_text, recommendation,
 * rest_days, rest_start_date, rest_end_date, issued_at
 */
export interface CertificateViewRow {
  id: string;
  visit_id: string;
  certificate_number: string;
  diagnosis_text: string;
  recommendation: string | null;
  rest_days: number | null;
  rest_start_date: string | null;
  rest_end_date: string | null;
  issued_by: string;
  issued_at: Date;
  patient_id: string;
  patient_name: string;
  student_id: string | null;
  issued_by_name: string;
}

// ── API response shapes (camelCase) ───────────────────────────────────────────

export interface Certificate {
  id: string;
  visitId: string;
  certificateNumber: string;
  diagnosisText: string;
  restDays: number | null;
  issuedAt: Date;
  issuedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    studentId: string | null;
    email: string;
  };
}
