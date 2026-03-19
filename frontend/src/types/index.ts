// ── Common ────────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export type UserRole = "student" | "staff" | "admin";

export interface AuthTokens {
  accessToken: string;
}

// ── User ──────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  studentId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  // Patient demographic fields (added by migration)
  nationalId: string | null;
  title: string | null;
  birthDate: string | null;
  faculty: string | null;
  department: string | null;
  yearOfStudy: number | null;
  position: string | null;
}

export interface HealthProfile {
  userId: string;
  bloodType: string | null;
  allergies: string | null;
  chronicDiseases: string | null;
  /** Backend returns a nested object { name, phone, relation } */
  emergencyContact: {
    name: string | null;
    phone: string | null;
    relation: string | null;
  } | null;
  updatedAt: string;
}

// ── Emergency Incidents ───────────────────────────────────────────────────────

export type IncidentType = "injury" | "illness" | "accident" | "fainting" | "other";
export type SeverityLevel = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "pending" | "accepted" | "in_progress" | "completed" | "cancelled";

export interface Incident {
  id: string;
  reporterId: string;
  incidentType: IncidentType;
  severity: SeverityLevel;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentDetail extends Incident {
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
    acceptedAt: string;
    arrivedAt: string | null;
  } | null;
  images: IncidentImage[];
}

export interface IncidentImage {
  id: string;
  incidentId: string;
  imageUrl: string;
  createdAt: string;
}

export interface IncidentStatusLog {
  id: string;
  incidentId: string;
  changedBy: string | null;
  oldStatus: string | null;
  newStatus: string;
  note: string | null;
  createdAt: string;
}

// ── Patient Visits ────────────────────────────────────────────────────────────

export type VisitType = "walk_in" | "emergency" | "appointment" | "follow_up";
export type VisitStatus = "waiting" | "in_treatment" | "completed" | "referred";

export interface VitalSigns {
  temperature?: number;
  bloodPressure?: string;
  heartRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
}

export interface Visit {
  id: string;
  patientId: string;
  staffId: string;
  incidentId: string | null;
  visitType: VisitType;
  chiefComplaint: string;
  diagnosis: string | null;
  /** Backend field name: treatmentNotes (maps to treatment column) */
  treatmentNotes: string | null;
  illnessHistory: string | null;
  vitalSigns: VitalSigns | null;
  woundCare: boolean;
  restHours: number | null;
  consultationTypes: string[];
  isReferred: boolean;
  status: VisitStatus;
  /** Nested patient info returned by backend */
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    studentId: string | null;
    phone: string | null;
  };
  /** Nested staff info returned by backend */
  staff: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface VisitMedication {
  id: string;
  visitId: string;
  medicineId: string;
  medicineName: string;
  batchId: string;
  batchNumber: string;
  quantity: number;
  dosageInstruction: string | null;
  createdAt: string;
}

// ── Medicines ─────────────────────────────────────────────────────────────────

export type MedicineCategory = "medicine" | "supply" | "equipment";

export interface Medicine {
  id: string;
  name: string;
  genericName: string | null;
  category: MedicineCategory;
  unit: string;
  stockQuantity: number;
  minStockLevel: number;
  isLowStock: boolean;
  description: string | null;
  createdAt: string;
}

export interface ExpiringAlert {
  medicineId: string;
  medicineName: string;
  category: string;
  batchId: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  daysUntilExpiry: number;
}

export interface MedicineBatch {
  id: string;
  medicineId: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  receivedAt: string;
  note: string | null;
}

export interface MedicineStockLog {
  id: string;
  medicineId: string;
  batchId: string | null;
  action: "received" | "dispensed" | "expired" | "adjusted";
  quantityChange: number;
  remainingStock: number;
  note: string | null;
  createdAt: string;
}

// ── Medical Certificates ──────────────────────────────────────────────────────

export interface Certificate {
  id: string;
  visitId: string;
  certificateNumber: string;
  patientName: string;
  studentId: string | null;
  diagnosisText: string;
  restDays: number;
  recommendation: string | null;
  restStartDate: string | null;
  restEndDate: string | null;
  issuedByName: string;
  issuedAt: string;
}

// ── Appointments ──────────────────────────────────────────────────────────────

export type AppointmentStatus = "scheduled" | "checked_in" | "completed" | "cancelled" | "no_show";
export type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export interface AppointmentSlot {
  id: string;
  staffId: string;
  staffName: string;
  /** 0=Sunday, 1=Monday … 6=Saturday */
  dayOfWeek: number;
  dayName?: string;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  maxPatientsPerSlot: number;
  isActive: boolean;
  bookedCount?: number;
  availableSpots?: number;
  isFull?: boolean;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  staffId: string;
  staffName: string;
  slotId: string;
  appointmentDate: string;
  appointmentTime: string;
  reason: string;
  notes: string | null;
  status: AppointmentStatus;
  cancelReason: string | null;
  createdAt: string;
}

// ── Notifications ─────────────────────────────────────────────────────────────

export type NotificationType = "emergency" | "appointment" | "stock_alert" | "system" | "expiry_alert";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceType: string | null;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
}

// ── Reports ───────────────────────────────────────────────────────────────────

export interface DashboardReport {
  generatedAt: string;
  incidentsToday: {
    total: number;
    byStatus: Record<string, number>;
    avgResponseTimeMinutes: number | null;
  };
  visitsToday: {
    total: number;
  };
  medicinesAlerts: {
    lowStockCount: number;
    expiringSoonCount: number;
  };
  appointmentsToday: {
    total: number;
    byStatus: Record<string, number>;
  };
}

// ── Settings ──────────────────────────────────────────────────────────────────

export interface SystemSetting {
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
}

export interface InfirmaryInfo {
  name: string;
  phone: string;
  lat: number;
  lng: number;
}

export interface EmergencyContact {
  id: string;
  name: string;
  category: "hospital" | "police" | "rescue" | "fire";
  phone: string;
  note: string | null;
}
