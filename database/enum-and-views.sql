-- Generated from current PostgreSQL database
-- Enum types and views for DBeaver / recreation

CREATE TYPE public.appointment_status AS ENUM ('scheduled', 'checked_in', 'completed', 'cancelled', 'no_show');
CREATE TYPE public.backup_status AS ENUM ('in_progress', 'completed', 'failed');
CREATE TYPE public.backup_type AS ENUM ('manual', 'auto');
CREATE TYPE public.emergency_contact_category AS ENUM ('hospital', 'police', 'rescue', 'fire', 'other');
CREATE TYPE public.incident_status AS ENUM ('pending', 'accepted', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.incident_type AS ENUM ('injury', 'illness', 'accident', 'fainting', 'other');
CREATE TYPE public.medicine_category AS ENUM ('medicine', 'supply', 'equipment');
CREATE TYPE public.notification_type AS ENUM ('emergency', 'appointment', 'stock_alert', 'system', 'expiry_alert');
CREATE TYPE public.severity_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.stock_action AS ENUM ('received', 'dispensed', 'expired', 'adjusted');
CREATE TYPE public.user_role AS ENUM ('student', 'staff', 'admin');
CREATE TYPE public.visit_status AS ENUM ('waiting', 'in_treatment', 'completed', 'referred');
CREATE TYPE public.visit_type AS ENUM ('walk_in', 'emergency', 'appointment', 'follow_up');

CREATE OR REPLACE VIEW public.v_daily_incident_stats AS
 SELECT (ei.created_at AT TIME ZONE 'Asia/Bangkok'::text)::date AS incident_date,
    count(*) AS total_incidents,
    count(*) FILTER (WHERE ei.severity = 'critical'::severity_level) AS critical_count,
    count(*) FILTER (WHERE ei.severity = 'high'::severity_level) AS high_count,
    count(*) FILTER (WHERE ei.status = 'completed'::incident_status) AS resolved_count,
    round(avg(EXTRACT(epoch FROM ir.accepted_at - ei.created_at) / 60.0) FILTER (WHERE ir.accepted_at IS NOT NULL), 2) AS avg_response_minutes
   FROM emergency_incidents ei
     LEFT JOIN incident_responders ir ON ir.incident_id = ei.id
  GROUP BY ((ei.created_at AT TIME ZONE 'Asia/Bangkok'::text)::date)
  ORDER BY ((ei.created_at AT TIME ZONE 'Asia/Bangkok'::text)::date) DESC;;
CREATE OR REPLACE VIEW public.v_medical_certificates AS
 SELECT mc.id,
    mc.certificate_number,
    mc.visit_id,
    pv.patient_id,
    (u.first_name::text || ' '::text) || u.last_name::text AS patient_name,
    u.student_id,
    mc.issued_by,
    (ub.first_name::text || ' '::text) || ub.last_name::text AS issued_by_name,
    mc.diagnosis_text,
    mc.recommendation,
    mc.rest_days,
    mc.rest_start_date,
    mc.rest_end_date,
    mc.issued_at
   FROM medical_certificates mc
     JOIN patient_visits pv ON pv.id = mc.visit_id
     JOIN users u ON u.id = pv.patient_id
     JOIN users ub ON ub.id = mc.issued_by
  ORDER BY mc.issued_at DESC;;
CREATE OR REPLACE VIEW public.v_medicines_expiring_soon AS
 SELECT m.id AS medicine_id,
    m.name AS medicine_name,
    m.category,
    mb.id AS batch_id,
    mb.batch_number,
    mb.quantity AS batch_quantity,
    mb.expiry_date,
    mb.expiry_date - CURRENT_DATE AS days_until_expiry
   FROM medicines m
     JOIN medicine_batches mb ON mb.medicine_id = m.id
  WHERE m.is_active = true AND mb.quantity > 0 AND mb.expiry_date <= (CURRENT_DATE + '30 days'::interval)
  ORDER BY mb.expiry_date;;
CREATE OR REPLACE VIEW public.v_medicines_low_stock AS
 SELECT id,
    name,
    category,
    stock_quantity,
    min_stock_level,
    min_stock_level - stock_quantity AS shortage
   FROM medicines
  WHERE is_active = true AND stock_quantity <= min_stock_level
  ORDER BY (min_stock_level - stock_quantity) DESC;;
