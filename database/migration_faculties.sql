-- =============================================================================
-- RUTS-REALAIDS: Faculties & Departments Tables
-- Run this migration to add dynamic faculty/department management
-- =============================================================================

-- ── Faculties ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS faculties (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200) NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_faculties_name UNIQUE (name)
);

-- ── Departments ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id  UUID NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_departments_faculty_name UNIQUE (faculty_id, name)
);

CREATE INDEX IF NOT EXISTS idx_departments_faculty_id ON departments(faculty_id);

-- ── Seed default data (RUTS faculties & departments) ─────────────────────────

INSERT INTO faculties (name, sort_order) VALUES
  ('คณะวิศวกรรมศาสตร์', 1),
  ('คณะวิทยาศาสตร์และเทคโนโลยี', 2),
  ('คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี', 3),
  ('คณะสถาปัตยกรรมศาสตร์', 4),
  ('คณะบริหารธุรกิจ', 5),
  ('คณะเทคโนโลยีการจัดการ', 6),
  ('คณะเกษตรศาสตร์', 7),
  ('วิทยาลัยเทคโนโลยีอุตสาหกรรมและการจัดการ', 8),
  ('คณะวิศวกรรมศาสตร์และเทคโนโลยี (ตรัง)', 9),
  ('คณะวิทยาศาสตร์และเทคโนโลยีการประมง', 10)
ON CONFLICT (name) DO NOTHING;

-- Engineering
INSERT INTO departments (faculty_id, name, sort_order)
SELECT f.id, d.name, d.sort_order
FROM faculties f
CROSS JOIN (VALUES
  ('วิศวกรรมไฟฟ้า', 1), ('วิศวกรรมอิเล็กทรอนิกส์และโทรคมนาคม', 2),
  ('วิศวกรรมคอมพิวเตอร์', 3), ('วิศวกรรมเครื่องกล', 4),
  ('วิศวกรรมโยธา', 5), ('วิศวกรรมอุตสาหการ', 6),
  ('วิศวกรรมเมคคาทรอนิกส์', 7), ('วิศวกรรมเคมีและวัสดุ', 8)
) AS d(name, sort_order)
WHERE f.name = 'คณะวิศวกรรมศาสตร์'
ON CONFLICT (faculty_id, name) DO NOTHING;

-- Science & Technology
INSERT INTO departments (faculty_id, name, sort_order)
SELECT f.id, d.name, d.sort_order
FROM faculties f
CROSS JOIN (VALUES
  ('เทคโนโลยีสารสนเทศ', 1), ('วิทยาการคอมพิวเตอร์', 2),
  ('เคมี', 3), ('ฟิสิกส์', 4), ('คณิตศาสตร์', 5), ('สถิติ', 6),
  ('เทคโนโลยีสิ่งแวดล้อม', 7), ('เทคโนโลยีชีวภาพ', 8)
) AS d(name, sort_order)
WHERE f.name = 'คณะวิทยาศาสตร์และเทคโนโลยี'
ON CONFLICT (faculty_id, name) DO NOTHING;

-- Industrial Education
INSERT INTO departments (faculty_id, name, sort_order)
SELECT f.id, d.name, d.sort_order
FROM faculties f
CROSS JOIN (VALUES
  ('วิศวกรรมไฟฟ้า (ค.อ.บ.)', 1), ('วิศวกรรมเครื่องกล (ค.อ.บ.)', 2),
  ('วิศวกรรมคอมพิวเตอร์ (ค.อ.บ.)', 3), ('วิศวกรรมโยธา (ค.อ.บ.)', 4),
  ('เทคโนโลยีคอมพิวเตอร์', 5)
) AS d(name, sort_order)
WHERE f.name = 'คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี'
ON CONFLICT (faculty_id, name) DO NOTHING;

-- Architecture
INSERT INTO departments (faculty_id, name, sort_order)
SELECT f.id, d.name, d.sort_order
FROM faculties f
CROSS JOIN (VALUES
  ('สถาปัตยกรรม', 1), ('การออกแบบสถาปัตยกรรมภายใน', 2), ('การออกแบบอุตสาหกรรม', 3)
) AS d(name, sort_order)
WHERE f.name = 'คณะสถาปัตยกรรมศาสตร์'
ON CONFLICT (faculty_id, name) DO NOTHING;

-- Business Administration
INSERT INTO departments (faculty_id, name, sort_order)
SELECT f.id, d.name, d.sort_order
FROM faculties f
CROSS JOIN (VALUES
  ('การบัญชี', 1), ('การตลาด', 2), ('การจัดการ', 3),
  ('ระบบสารสนเทศทางธุรกิจ', 4), ('การเงินและการธนาคาร', 5)
) AS d(name, sort_order)
WHERE f.name = 'คณะบริหารธุรกิจ'
ON CONFLICT (faculty_id, name) DO NOTHING;

-- Technology Management
INSERT INTO departments (faculty_id, name, sort_order)
SELECT f.id, d.name, d.sort_order
FROM faculties f
CROSS JOIN (VALUES
  ('การจัดการ', 1), ('การบัญชี', 2), ('การตลาด', 3), ('เทคโนโลยีสารสนเทศธุรกิจ', 4)
) AS d(name, sort_order)
WHERE f.name = 'คณะเทคโนโลยีการจัดการ'
ON CONFLICT (faculty_id, name) DO NOTHING;

-- Agriculture
INSERT INTO departments (faculty_id, name, sort_order)
SELECT f.id, d.name, d.sort_order
FROM faculties f
CROSS JOIN (VALUES
  ('พืชศาสตร์', 1), ('สัตวศาสตร์', 2), ('อุตสาหกรรมเกษตร', 3), ('ประมง', 4)
) AS d(name, sort_order)
WHERE f.name = 'คณะเกษตรศาสตร์'
ON CONFLICT (faculty_id, name) DO NOTHING;

-- Industrial Technology College
INSERT INTO departments (faculty_id, name, sort_order)
SELECT f.id, d.name, d.sort_order
FROM faculties f
CROSS JOIN (VALUES
  ('เทคโนโลยีไฟฟ้าอุตสาหกรรม', 1), ('เทคโนโลยีเครื่องกล', 2), ('การจัดการโลจิสติกส์', 3)
) AS d(name, sort_order)
WHERE f.name = 'วิทยาลัยเทคโนโลยีอุตสาหกรรมและการจัดการ'
ON CONFLICT (faculty_id, name) DO NOTHING;

-- Engineering & Technology (Trang)
INSERT INTO departments (faculty_id, name, sort_order)
SELECT f.id, d.name, d.sort_order
FROM faculties f
CROSS JOIN (VALUES
  ('วิศวกรรมเครื่องกล', 1), ('วิศวกรรมไฟฟ้า', 2), ('วิศวกรรมโยธา', 3), ('เทคโนโลยีสารสนเทศ', 4)
) AS d(name, sort_order)
WHERE f.name = 'คณะวิศวกรรมศาสตร์และเทคโนโลยี (ตรัง)'
ON CONFLICT (faculty_id, name) DO NOTHING;

-- Fisheries Science & Technology
INSERT INTO departments (faculty_id, name, sort_order)
SELECT f.id, d.name, d.sort_order
FROM faculties f
CROSS JOIN (VALUES
  ('วิทยาศาสตร์ทางทะเล', 1), ('การเพาะเลี้ยงสัตว์น้ำ', 2), ('ประมง', 3), ('เทคโนโลยีอาหาร', 4)
) AS d(name, sort_order)
WHERE f.name = 'คณะวิทยาศาสตร์และเทคโนโลยีการประมง'
ON CONFLICT (faculty_id, name) DO NOTHING;
