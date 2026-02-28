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
 *
 * The view joins medical_certificates → patient_visits → users to expose
 * patient information without a direct patient_id FK on the table.
 *
 * Expected view definition:
 *   SELECT mc.*, pv.patient_id,
 *          u.first_name/last_name/student_id/email AS patient_*,
 *          su.first_name/last_name AS issuer_*
 *   FROM medical_certificates mc
 *   JOIN patient_visits pv ON pv.id = mc.visit_id
 *   JOIN users u  ON u.id  = pv.patient_id
 *   JOIN users su ON su.id = mc.issued_by
 */
export interface CertificateViewRow extends CertificateRow {
  patient_id: string;
  patient_first_name: string;
  patient_last_name: string;
  patient_student_id: string | null;
  patient_email: string;
  issuer_first_name: string;
  issuer_last_name: string;
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
