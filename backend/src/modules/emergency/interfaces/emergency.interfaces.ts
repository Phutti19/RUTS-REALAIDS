// ── DB row shapes (match PostgreSQL column names) ─────────────────────────────

export interface IncidentRow {
  id: string;
  reporter_id: string;
  incident_type: string;
  severity: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

/** Extended row from JOIN query (includes reporter + responder columns) */
export interface IncidentDetailRow extends IncidentRow {
  reporter_first_name: string;
  reporter_last_name: string;
  reporter_email: string;
  reporter_student_id: string | null;
  reporter_phone: string | null;
  responder_id: string | null;
  responder_first_name: string | null;
  responder_last_name: string | null;
  accepted_at: Date | null;
  arrived_at: Date | null;
}

export interface IncidentImageRow {
  id: string;
  incident_id: string;
  image_url: string;
  uploaded_at: Date;
}

export interface IncidentResponderRow {
  id: string;
  incident_id: string;
  responder_id: string;
  accepted_at: Date;
  arrived_at: Date | null;
}

export interface IncidentStatusLogRow {
  id: string;
  incident_id: string;
  changed_by: string | null;
  old_status: string | null;
  new_status: string;
  note: string | null;
  created_at: Date;
}

// ── API response shapes (camelCase) ───────────────────────────────────────────

export interface IncidentSummary {
  id: string;
  reporterId: string;
  incidentType: string;
  severity: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Distance in km from infirmary — null if GPS not available */
  distanceKm: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IncidentDetail extends IncidentSummary {
  reporter: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    studentId: string | null;
    phone: string | null;
  };
  responder: {
    id: string;
    firstName: string;
    lastName: string;
    acceptedAt: Date;
    arrivedAt: Date | null;
  } | null;
  images: IncidentImage[];
}

export interface IncidentImage {
  id: string;
  incidentId: string;
  imageUrl: string;
  createdAt: Date;
}

export interface IncidentStatusLog {
  id: string;
  incidentId: string;
  changedBy: string | null;
  oldStatus: string | null;
  newStatus: string;
  note: string | null;
  createdAt: Date;
}
