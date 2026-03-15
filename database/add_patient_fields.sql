-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add patient demographic fields to users
--            add clinical fields to patient_visits
-- Run once against ruts_realaids database.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Patient demographic fields (users table)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS national_id  VARCHAR(13),
  ADD COLUMN IF NOT EXISTS title        VARCHAR(20),
  ADD COLUMN IF NOT EXISTS birth_date   DATE,
  ADD COLUMN IF NOT EXISTS department   VARCHAR(200),
  ADD COLUMN IF NOT EXISTS year_of_study SMALLINT,
  ADD COLUMN IF NOT EXISTS "position"   VARCHAR(100);

-- 2. Clinical fields (patient_visits table)
ALTER TABLE patient_visits
  ADD COLUMN IF NOT EXISTS illness_history    TEXT,
  ADD COLUMN IF NOT EXISTS wound_care         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rest_hours         NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS consultation_types TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_referred        BOOLEAN NOT NULL DEFAULT FALSE;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('national_id','title','birth_date','department','year_of_study','position')
ORDER BY column_name;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'patient_visits'
  AND column_name IN ('illness_history','wound_care','rest_hours','consultation_types','is_referred')
ORDER BY column_name;
