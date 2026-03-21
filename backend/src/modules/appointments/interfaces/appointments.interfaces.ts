// ── DB row shapes ──────────────────────────────────────────────────────────────

export interface SlotRow {
  id: string;
  staff_id: string;
  day_of_week: number; // 0=Sunday … 6=Saturday (PostgreSQL EXTRACT DOW)
  start_time: string;  // e.g. "09:00:00"
  end_time: string;    // e.g. "12:00:00"
  slot_duration_minutes: number;
  max_patients_per_slot: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SlotDetailRow extends SlotRow {
  staff_first_name: string;
  staff_last_name: string;
}

/** Row returned by the available-slots query: slots + booked count for a given date. */
export interface AvailableSlotRow extends SlotDetailRow {
  booked_count: number; // how many appointments already exist for this slot+date
}

export interface AppointmentRow {
  id: string;
  patient_id: string;
  staff_id: string;
  slot_id: string;
  appointment_date: string; // DATE column → string in ISO format "YYYY-MM-DD"
  appointment_time: string; // TIME column → e.g. "09:00:00"
  reason: string;
  status: string;
  cancel_reason: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AppointmentDetailRow extends AppointmentRow {
  patient_first_name: string;
  patient_last_name: string;
  patient_email: string;
  patient_student_id: string;
  staff_first_name: string;
  staff_last_name: string;
  slot_start_time: string;
  slot_end_time: string;
  slot_duration_minutes: number;
}

// ── API response shapes (camelCase) ───────────────────────────────────────────

export interface Slot {
  id: string;
  staffId: string;
  staffName: string;
  dayOfWeek: number;
  dayName: string; // "Monday", "Tuesday", etc.
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  maxPatientsPerSlot: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AvailableSlot extends Slot {
  bookedCount: number;
  availableSpots: number;
  isFull: boolean;
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
  status: string;
  cancelReason: string | null;
  notes: string | null;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    studentId: string | null;
  };
  staff: {
    id: string;
    firstName: string;
    lastName: string;
  };
  slot: {
    startTime: string;
    endTime: string;
    durationMinutes: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
