-- =============================================================================
-- RUTS-REALAIDS Seed Data SQL
-- PostgreSQL 16+
-- Run this after schema.sql
-- =============================================================================

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

INSERT INTO treatment_types (name, description, is_active) VALUES
  ('Wound Care', 'Basic wound cleaning and dressing', TRUE),
  ('Medication', 'Medication administration', TRUE),
  ('Vital Signs', 'Vital sign monitoring', TRUE),
  ('Observation', 'Observation and monitoring', TRUE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO emergency_contacts_directory (name, category, phone, phone_secondary, address, latitude, longitude, note, is_primary, is_active) VALUES
  ('โรงพยาบาลมหาวิทยาลัย', 'hospital', '074-123456', '081-2345678', 'มหาวิทยาลัยเทคโนโลยีราชมงคลศรีวิชัย', 7.1907, 100.5930, 'Emergency contact for infirmary', TRUE, TRUE),
  ('สถานีตำรวจ', 'police', '191', NULL, 'ศรีวิชัย', 7.1907, 100.5930, 'Police emergency', TRUE, TRUE)
ON CONFLICT DO NOTHING;
