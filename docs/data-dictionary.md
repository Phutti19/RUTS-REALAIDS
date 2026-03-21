# Data Dictionary — RUTS-REALAIDS

ฐานข้อมูล: `ruts_realaids` | PostgreSQL 16+ | Timezone: `Asia/Bangkok`

---

## สารบัญ

### Tables (26 ตาราง)
1. [users](#1-users)
2. [student_health_profiles](#2-student_health_profiles)
3. [refresh_tokens](#3-refresh_tokens)
4. [password_reset_tokens](#4-password_reset_tokens)
5. [login_attempts](#5-login_attempts)
6. [emergency_incidents](#6-emergency_incidents)
7. [incident_images](#7-incident_images)
8. [incident_responders](#8-incident_responders)
9. [incident_status_logs](#9-incident_status_logs)
10. [emergency_contacts_directory](#10-emergency_contacts_directory)
11. [treatment_types](#11-treatment_types)
12. [patient_visits](#12-patient_visits)
13. [visit_medications](#13-visit_medications)
14. [medical_certificates](#14-medical_certificates)
15. [medicines](#15-medicines)
16. [medicine_batches](#16-medicine_batches)
17. [medicine_stock_logs](#17-medicine_stock_logs)
18. [appointment_slots](#18-appointment_slots)
19. [appointments](#19-appointments)
20. [notifications](#20-notifications)
21. [push_subscriptions](#21-push_subscriptions)
22. [system_settings](#22-system_settings)
23. [audit_logs](#23-audit_logs)
24. [data_backups](#24-data_backups)
25. [faculties](#25-faculties)
26. [departments](#26-departments)

### Views (4 วิว)
27. [v_daily_incident_stats](#27-v_daily_incident_stats)
28. [v_medical_certificates](#28-v_medical_certificates)
29. [v_medicines_expiring_soon](#29-v_medicines_expiring_soon)
30. [v_medicines_low_stock](#30-v_medicines_low_stock)

### Enum Types (13 ชนิด)
31. [Enum Types](#31-enum-types)

---

## Users & Security

### 1. users

ข้อมูลผู้ใช้ทั้งหมดในระบบ (นักศึกษา, เจ้าหน้าที่, ผู้ดูแลระบบ)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | `uuid_generate_v4()` | Primary Key |
| student_id | VARCHAR(20) | YES | — | รหัสนักศึกษา (UNIQUE, เฉพาะ role=student) |
| email | VARCHAR(255) | NO | — | อีเมล (UNIQUE) |
| password_hash | TEXT | NO | — | รหัสผ่านที่เข้ารหัสด้วย bcrypt |
| first_name | VARCHAR(100) | NO | — | ชื่อจริง |
| last_name | VARCHAR(100) | NO | — | นามสกุล |
| phone | VARCHAR(15) | YES | — | เบอร์โทรศัพท์ |
| role | user_role | NO | `'student'` | บทบาท (student / staff / admin) |
| avatar_url | TEXT | YES | — | URL รูปโปรไฟล์ |
| is_active | BOOLEAN | NO | `true` | สถานะบัญชี (ใช้ soft delete) |
| last_login_at | TIMESTAMPTZ | YES | — | วันเวลาเข้าสู่ระบบล่าสุด |
| created_at | TIMESTAMPTZ | NO | `now()` | วันเวลาสร้างบัญชี |
| updated_at | TIMESTAMPTZ | NO | `now()` | วันเวลาอัปเดตล่าสุด |
| national_id | VARCHAR(13) | YES | — | เลขบัตรประชาชน 13 หลัก |
| title | VARCHAR(20) | YES | — | คำนำหน้า (นาย/นาง/นางสาว ฯลฯ) |
| birth_date | DATE | YES | — | วันเกิด |
| department | VARCHAR(200) | YES | — | สาขาวิชา/ภาควิชา |
| year_of_study | SMALLINT | YES | — | ชั้นปีการศึกษา (เฉพาะนักศึกษา) |
| position | VARCHAR(100) | YES | — | ตำแหน่ง (เฉพาะเจ้าหน้าที่) |
| faculty | VARCHAR(120) | YES | — | คณะ |

**Unique Constraints:** `email`, `student_id`

---

### 2. student_health_profiles

ข้อมูลสุขภาพของนักศึกษา (1:1 กับ users)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | `uuid_generate_v4()` | Primary Key |
| user_id | UUID | NO | — | FK → `users.id` (UNIQUE, ON DELETE CASCADE) |
| blood_type | VARCHAR(5) | YES | — | กรุ๊ปเลือด (A, B, O, AB) |
| allergies | TEXT | YES | — | ข้อมูลการแพ้ |
| chronic_diseases | TEXT | YES | — | โรคประจำตัว |
| current_medications | TEXT | YES | — | ยาที่ใช้อยู่ปัจจุบัน |
| emergency_contact_name | VARCHAR(200) | NO | — | ชื่อผู้ติดต่อกรณีฉุกเฉิน |
| emergency_contact_phone | VARCHAR(15) | NO | — | เบอร์โทรผู้ติดต่อฉุกเฉิน |
| emergency_contact_relation | VARCHAR(50) | YES | — | ความสัมพันธ์กับผู้ติดต่อฉุกเฉิน |
| updated_at | TIMESTAMPTZ | NO | `now()` | วันเวลาอัปเดตล่าสุด |

**Unique Constraints:** `user_id`

---

### 3. refresh_tokens

Refresh Token สำหรับต่ออายุ Access Token (JWT)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | `uuid_generate_v4()` | Primary Key |
| user_id | UUID | NO | — | FK → `users.id` (ON DELETE CASCADE) |
| token_hash | TEXT | NO | — | Hash ของ refresh token |
| device_info | VARCHAR(255) | YES | — | ข้อมูลอุปกรณ์ (User-Agent ฯลฯ) |
| expires_at | TIMESTAMPTZ | NO | — | วันเวลาหมดอายุ |
| revoked_at | TIMESTAMPTZ | YES | — | วันเวลาที่ถูกเพิกถอน (null = ยังใช้ได้) |
| created_at | TIMESTAMPTZ | NO | `now()` | วันเวลาสร้าง |

---

### 4. password_reset_tokens

Token สำหรับรีเซ็ตรหัสผ่าน

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | `uuid_generate_v4()` | Primary Key |
| user_id | UUID | NO | — | FK → `users.id` (ON DELETE CASCADE) |
| token_hash | TEXT | NO | — | Hash ของ reset token |
| expires_at | TIMESTAMPTZ | NO | — | วันเวลาหมดอายุ |
| used_at | TIMESTAMPTZ | YES | — | วันเวลาที่ถูกใช้งาน (null = ยังไม่ใช้) |
| created_at | TIMESTAMPTZ | NO | `now()` | วันเวลาสร้าง |

---

### 5. login_attempts

บันทึกการพยายามเข้าสู่ระบบ (ป้องกัน brute force)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | `uuid_generate_v4()` | Primary Key |
| user_id | UUID | YES | — | FK → `users.id` (ON DELETE SET NULL) — null เมื่อไม่พบ user |
| email | VARCHAR(255) | NO | — | อีเมลที่พยายามเข้าสู่ระบบ |
| ip_address | VARCHAR(45) | NO | — | IP Address ผู้เข้าสู่ระบบ |
| user_agent | TEXT | YES | — | ข้อมูล User-Agent ของ browser |
| success | BOOLEAN | NO | `false` | เข้าสู่ระบบสำเร็จหรือไม่ |
| failure_reason | VARCHAR(50) | YES | — | เหตุผลที่เข้าสู่ระบบไม่สำเร็จ |
| created_at | TIMESTAMPTZ | NO | `now()` | วันเวลาพยายามเข้าสู่ระบบ |

---

## Emergency

### 6. emergency_incidents

เหตุการณ์ฉุกเฉินที่ถูกแจ้ง

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | `uuid_generate_v4()` | Primary Key |
| reporter_id | UUID | NO | — | FK → `users.id` (ON DELETE RESTRICT) — ผู้แจ้งเหตุ |
| incident_type | incident_type | NO | — | ประเภทเหตุการณ์ (injury/illness/accident/fainting/other) |
| severity | severity_level | NO | `'medium'` | ระดับความรุนแรง (low/medium/high/critical) |
| description | TEXT | YES | — | รายละเอียดเหตุการณ์ |
| latitude | NUMERIC(10,7) | NO | — | พิกัดละติจูด (GPS) |
| longitude | NUMERIC(10,7) | NO | — | พิกัดลองจิจูด (GPS) |
| location_name | VARCHAR(255) | YES | — | ชื่อสถานที่ (ถ้ามี) |
| status | incident_status | NO | `'pending'` | สถานะ (pending→accepted→in_progress→completed) |
| responded_at | TIMESTAMPTZ | YES | — | วันเวลาที่เจ้าหน้าที่ตอบรับ |
| resolved_at | TIMESTAMPTZ | YES | — | วันเวลาที่แก้ไขเสร็จสิ้น |
| created_at | TIMESTAMPTZ | NO | `now()` | วันเวลาแจ้งเหตุ |
| updated_at | TIMESTAMPTZ | NO | `now()` | วันเวลาอัปเดตล่าสุด |

---

### 7. incident_images

รูปภาพประกอบเหตุการณ์ฉุกเฉิน

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | `uuid_generate_v4()` | Primary Key |
| incident_id | UUID | NO | — | FK → `emergency_incidents.id` (ON DELETE CASCADE) |
| image_url | TEXT | NO | — | URL ของรูปภาพ |
| caption | VARCHAR(255) | YES | — | คำอธิบายรูปภาพ |
| sort_order | SMALLINT | NO | `0` | ลำดับการแสดงผล |
| uploaded_at | TIMESTAMPTZ | NO | `now()` | วันเวลาอัปโหลด |

---

### 8. incident_responders

เจ้าหน้าที่ที่ตอบรับเหตุการณ์ฉุกเฉิน

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | `uuid_generate_v4()` | Primary Key |
| incident_id | UUID | NO | — | FK → `emergency_incidents.id` (ON DELETE CASCADE) |
| responder_id | UUID | NO | — | FK → `users.id` (ON DELETE RESTRICT) — เจ้าหน้าที่ที่รับเหตุ |
| accepted_at | TIMESTAMPTZ | NO | `now()` | วันเวลาที่ตอบรับ |
| arrived_at | TIMESTAMPTZ | YES | — | วันเวลาที่ถึงจุดเกิดเหตุ |
| notes | TEXT | YES | — | บันทึกเพิ่มเติม |

**Unique Constraints:** `(incident_id, responder_id)` — เจ้าหน้าที่ 1 คนรับได้ 1 ครั้งต่อเหตุการณ์

---

### 9. incident_status_logs

ประวัติการเปลี่ยนสถานะเหตุการณ์ฉุกเฉิน

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | `uuid_generate_v4()` | Primary Key |
| incident_id | UUID | NO | — | FK → `emergency_incidents.id` (ON DELETE CASCADE) |
| changed_by | UUID | NO | — | FK → `users.id` (ON DELETE RESTRICT) — ผู้เปลี่ยนสถานะ |
| old_status | VARCHAR(30) | NO | — | สถานะเดิม (ห้าม NULL) |
| new_status | VARCHAR(30) | NO | — | สถานะใหม่ |
| note | TEXT | YES | — | หมายเหตุ |
| created_at | TIMESTAMPTZ | NO | `now()` | วันเวลาที่เปลี่ยนสถานะ |

---

### 10. emergency_contacts_directory

สมุดโทรศัพท์ฉุกเฉิน (โรงพยาบาล, ตำรวจ, กู้ภัย ฯลฯ)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | `uuid_generate_v4()` | Primary Key |
| name | VARCHAR(255) | NO | — | ชื่อหน่วยงาน/บุคคล |
| category | emergency_contact_category | NO | `'other'` | หมวดหมู่ (hospital/police/rescue/fire/other) |
| phone | VARCHAR(15) | NO | — | เบอร์โทรหลัก |
| phone_secondary | VARCHAR(15) | YES | — | เบอร์โทรสำรอง |
| address | TEXT | YES | — | ที่อยู่ |
| latitude | NUMERIC(10,7) | YES | — | พิกัดละติจูด |
| longitude | NUMERIC(10,7) | YES | — | พิกัดลองจิจูด |
| note | TEXT | YES | — | หมายเหตุ |
| is_primary | BOOLEAN | NO | `false` | เป็นผู้ติดต่อหลักหรือไม่ |
| is_active | BOOLEAN | NO | `true` | สถานะการใช้งาน |
| created_at | TIMESTAMPTZ | NO | `now()` | วันเวลาสร้าง |
| updated_at | TIMESTAMPTZ | NO | `now()` | วันเวลาอัปเดตล่าสุด |

---

## Infirmary (ห้องพยาบาล)

### 11. treatment_types

ประเภทการรักษา

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | `uuid_generate_v4()` | Primary Key |
| name | VARCHAR(100) | NO | — | ชื่อประเภทการรักษา (ทำแผล, จ่ายยา ฯลฯ) |
| description | TEXT | YES | — | รายละเอียด |
| is_active | BOOLEAN | NO | `true` | สถานะการใช้งาน |
| created_at | TIMESTAMPTZ | NO | `now()` | วันเวลาสร้าง |

---

### 12. patient_visits

บันทึกการเข้ารับการรักษาของผู้ป่วย

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | `uuid_generate_v4()` | Primary Key |
| patient_id | UUID | NO | — | FK → `users.id` (ON DELETE RESTRICT) — ผู้ป่วย |
| staff_id | UUID | NO | — | FK → `users.id` (ON DELETE RESTRICT) — เจ้าหน้าที่ผู้รักษา |
| incident_id | UUID | YES | — | FK → `emergency_incidents.id` (ON DELETE SET NULL) — เหตุการณ์ที่เกี่ยวข้อง |
| visit_type | visit_type | NO | `'walk_in'` | ประเภทการเข้าพบ (walk_in/emergency/appointment/follow_up) |
| chief_complaint | TEXT | NO | — | อาการสำคัญ |
| diagnosis | TEXT | YES | — | การวินิจฉัย |
| treatment | TEXT | YES | — | รายละเอียดการรักษา |
| treatment_type_id | UUID | YES | — | FK → `treatment_types.id` (ON DELETE SET NULL) — ประเภทการรักษา |
| vital_signs | JSONB | YES | — | สัญญาณชีพ (temperature, bloodPressure, heartRate ฯลฯ) |
| status | visit_status | NO | `'waiting'` | สถานะ (waiting/in_treatment/completed/referred) |
| referred_to | VARCHAR(255) | YES | — | ส่งต่อไปยัง (ชื่อโรงพยาบาล ฯลฯ) |
| notes | TEXT | YES | — | หมายเหตุ |
| visited_at | TIMESTAMPTZ | NO | `now()` | วันเวลาเข้ารับการรักษา |
| completed_at | TIMESTAMPTZ | YES | — | วันเวลาที่รักษาเสร็จ |
| created_at | TIMESTAMPTZ | NO | `now()` | วันเวลาสร้างรายการ |
| illness_history | TEXT | YES | — | ประวัติอาการป่วย |
| wound_care | BOOLEAN | NO | `false` | มีการทำแผลหรือไม่ |
| rest_hours | NUMERIC(4,1) | YES | — | จำนวนชั่วโมงที่พักผ่อน |
| consultation_types | TEXT[] | NO | `'{}'` | ประเภทการให้คำปรึกษา (array) |
| is_referred | BOOLEAN | NO | `false` | ถูกส่งต่อหรือไม่ |

---

### 13. visit_medications

การจ่ายยาในแต่ละ visit

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | `uuid_generate_v4()` | Primary Key |
| visit_id | UUID | NO | — | FK → `patient_visits.id` (ON DELETE CASCADE) |
| medicine_id | UUID | NO | — | FK → `medicines.id` (ON DELETE RESTRICT) — ยาที่จ่าย |
| batch_id | UUID | YES | — | FK → `medicine_batches.id` (ON DELETE SET NULL) — ล็อตยา |
| quantity | INTEGER | NO | — | จำนวนที่จ่าย |
| dosage_instruction | TEXT | YES | — | วิธีการใช้ยา |
| dispensed_by | UUID | NO | — | FK → `users.id` (ON DELETE RESTRICT) — ผู้จ่ายยา |
| created_at | TIMESTAMPTZ | NO | `now()` | วันเวลาจ่ายยา |

---

### 14. medical_certificates

ใบรับรองแพทย์

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | `uuid_generate_v4()` | Primary Key |
| visit_id | UUID | NO | — | FK → `patient_visits.id` (ON DELETE RESTRICT) |
| issued_by | UUID | NO | — | FK → `users.id` (ON DELETE RESTRICT) — ผู้ออกใบรับรอง |
| certificate_number | VARCHAR(50) | NO | `generate_certificate_number()` | เลขที่ใบรับรอง (UNIQUE, auto: CERT-YYYY-NNNNNN) |
| diagnosis_text | TEXT | NO | — | ผลการวินิจฉัย |
| recommendation | TEXT | YES | — | คำแนะนำ |
| rest_days | INTEGER | YES | — | จำนวนวันพักฟื้น |
| rest_start_date | DATE | YES | — | วันเริ่มต้นพักฟื้น |
| rest_end_date | DATE | YES | — | วันสิ้นสุดพักฟื้น |
| issued_at | TIMESTAMPTZ | NO | `now()` | วันเวลาออกใบรับรอง |
| created_at | TIMESTAMPTZ | NO | `now()` | วันเวลาสร้างรายการ |

**Unique Constraints:** `certificate_number`

---

## Medicines (คลังเวชภัณฑ์)

### 15. medicines

รายการยาและเวชภัณฑ์

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | `uuid_generate_v4()` | Primary Key |
| name | VARCHAR(255) | NO | — | ชื่อยา/เวชภัณฑ์ |
| generic_name | VARCHAR(255) | YES | — | ชื่อสามัญทางยา |
| category | medicine_category | NO | `'medicine'` | หมวดหมู่ (medicine/supply/equipment) |
| unit | VARCHAR(50) | NO | — | หน่วยนับ (เม็ด, แผง, ขวด ฯลฯ) |
| description | TEXT | YES | — | รายละเอียด |
| stock_quantity | INTEGER | NO | `0` | จำนวนคงเหลือ (cached, คำนวณจาก batches) |
| min_stock_level | INTEGER | NO | `10` | ระดับสต็อกขั้นต่ำ (สำหรับแจ้งเตือน) |
| location | VARCHAR(100) | YES | — | ตำแหน่งจัดเก็บ |
| is_active | BOOLEAN | NO | `true` | สถานะการใช้งาน |
| created_at | TIMESTAMPTZ | NO | `now()` | วันเวลาสร้าง |
| updated_at | TIMESTAMPTZ | NO | `now()` | วันเวลาอัปเดตล่าสุด |

---

### 16. medicine_batches

ล็อตยาที่รับเข้า

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | `uuid_generate_v4()` | Primary Key |
| medicine_id | UUID | NO | — | FK → `medicines.id` (ON DELETE CASCADE) |
| batch_number | VARCHAR(50) | YES | — | เลขที่ล็อต |
| quantity | INTEGER | NO | `0` | จำนวนที่รับเข้า |
| expiry_date | DATE | NO | — | วันหมดอายุ |
| received_at | TIMESTAMPTZ | NO | `now()` | วันเวลาที่รับเข้า |
| received_by | UUID | NO | — | FK → `users.id` (ON DELETE RESTRICT) — ผู้รับเข้า |
| note | TEXT | YES | — | หมายเหตุ |
| created_at | TIMESTAMPTZ | NO | `now()` | วันเวลาสร้างรายการ |

---

### 17. medicine_stock_logs

บันทึกการเคลื่อนไหวสต็อกยา

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | `uuid_generate_v4()` | Primary Key |
| medicine_id | UUID | NO | — | FK → `medicines.id` (ON DELETE CASCADE) |
| batch_id | UUID | YES | — | FK → `medicine_batches.id` (ON DELETE SET NULL) — ล็อตที่เกี่ยวข้อง |
| action | stock_action | NO | — | ประเภทการเคลื่อนไหว (received/dispensed/expired/adjusted) |
| quantity_change | INTEGER | NO | — | จำนวนที่เปลี่ยนแปลง (+ รับเข้า, - จ่ายออก) |
| remaining_stock | INTEGER | NO | — | จำนวนคงเหลือหลังเปลี่ยนแปลง |
| reference_id | UUID | YES | — | อ้างอิงถึง record อื่น (polymorphic, เช่น patient_visits.id เมื่อ dispensed) |
| performed_by | UUID | NO | — | FK → `users.id` (ON DELETE RESTRICT) — ผู้ดำเนินการ |
| note | TEXT | YES | — | หมายเหตุ |
| created_at | TIMESTAMPTZ | NO | `now()` | วันเวลาดำเนินการ |

---

## Appointments (นัดหมาย)

### 18. appointment_slots

ช่วงเวลานัดหมายที่เจ้าหน้าที่เปิดให้จอง

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | `uuid_generate_v4()` | Primary Key |
| staff_id | UUID | NO | — | FK → `users.id` (ON DELETE RESTRICT) — เจ้าหน้าที่เจ้าของ slot |
| day_of_week | SMALLINT | NO | — | วันในสัปดาห์ (0=อาทิตย์ ... 6=เสาร์) |
| start_time | TIME | NO | — | เวลาเริ่มต้น |
| end_time | TIME | NO | — | เวลาสิ้นสุด |
| slot_duration_minutes | INTEGER | NO | `30` | ระยะเวลาแต่ละ slot (นาที) |
| max_patients_per_slot | INTEGER | NO | `1` | จำนวนผู้ป่วยสูงสุดต่อ slot |
| is_active | BOOLEAN | NO | `true` | สถานะการเปิดใช้งาน |
| created_at | TIMESTAMPTZ | NO | `now()` | วันเวลาสร้าง |
| updated_at | TIMESTAMPTZ | NO | `now()` | วันเวลาอัปเดตล่าสุด |

---

### 19. appointments

การนัดหมายของผู้ป่วย

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | `uuid_generate_v4()` | Primary Key |
| patient_id | UUID | NO | — | FK → `users.id` (ON DELETE RESTRICT) — ผู้ป่วย |
| staff_id | UUID | YES | — | FK → `users.id` (ON DELETE RESTRICT) — เจ้าหน้าที่ |
| slot_id | UUID | YES | — | FK → `appointment_slots.id` (ON DELETE SET NULL) — slot ที่จอง |
| appointment_date | DATE | NO | — | วันที่นัดหมาย |
| appointment_time | TIME | NO | — | เวลานัดหมาย |
| reason | TEXT | NO | — | เหตุผลการนัดหมาย |
| status | appointment_status | NO | `'scheduled'` | สถานะ (scheduled/checked_in/completed/cancelled/no_show) |
| cancel_reason | TEXT | YES | — | เหตุผลที่ยกเลิก |
| notes | TEXT | YES | — | หมายเหตุ |
| created_at | TIMESTAMPTZ | NO | `now()` | วันเวลาสร้าง |
| updated_at | TIMESTAMPTZ | NO | `now()` | วันเวลาอัปเดตล่าสุด |

---

## Notifications (การแจ้งเตือน)

### 20. notifications

การแจ้งเตือนในระบบ

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | `uuid_generate_v4()` | Primary Key |
| user_id | UUID | NO | — | FK → `users.id` (ON DELETE CASCADE) — ผู้รับแจ้งเตือน |
| type | notification_type | NO | — | ประเภท (emergency/appointment/stock_alert/system/expiry_alert) |
| title | VARCHAR(255) | NO | — | หัวข้อการแจ้งเตือน |
| message | TEXT | NO | — | เนื้อหาการแจ้งเตือน |
| reference_type | VARCHAR(50) | YES | — | ประเภท entity ที่อ้างอิง (incident/appointment/visit/medicine) |
| reference_id | UUID | YES | — | ID ของ entity ที่อ้างอิง (polymorphic) |
| is_read | BOOLEAN | NO | `false` | อ่านแล้วหรือยัง |
| read_at | TIMESTAMPTZ | YES | — | วันเวลาที่อ่าน |
| created_at | TIMESTAMPTZ | NO | `now()` | วันเวลาสร้าง |

---

### 21. push_subscriptions

ข้อมูลการสมัครรับ Push Notification (Web Push API)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | `uuid_generate_v4()` | Primary Key |
| user_id | UUID | NO | — | FK → `users.id` (ON DELETE CASCADE) |
| endpoint | TEXT | NO | — | Push service endpoint URL |
| p256dh_key | TEXT | NO | — | Public key (P-256 DH) |
| auth_key | TEXT | NO | — | Authentication key |
| device_info | VARCHAR(255) | YES | — | ข้อมูลอุปกรณ์ |
| is_active | BOOLEAN | NO | `true` | สถานะการใช้งาน |
| created_at | TIMESTAMPTZ | NO | `now()` | วันเวลาสมัคร |

---

## System (ระบบ)

### 22. system_settings

การตั้งค่าระบบ (key-value pairs)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | `uuid_generate_v4()` | Primary Key |
| key | VARCHAR(100) | NO | — | ชื่อการตั้งค่า (UNIQUE) เช่น infirmary_lat, alert_threshold |
| value | TEXT | NO | — | ค่าการตั้งค่า |
| description | TEXT | YES | — | คำอธิบายการตั้งค่า |
| updated_by | UUID | YES | — | FK → `users.id` (ON DELETE SET NULL) — ผู้อัปเดตล่าสุด |
| updated_at | TIMESTAMPTZ | NO | `now()` | วันเวลาอัปเดตล่าสุด |

**Unique Constraints:** `key`

---

### 23. audit_logs

บันทึกการดำเนินการในระบบ (Audit Trail)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | `uuid_generate_v4()` | Primary Key |
| user_id | UUID | YES | — | FK → `users.id` (ON DELETE SET NULL) — ผู้ดำเนินการ |
| action | VARCHAR(50) | NO | — | ประเภทการดำเนินการ (CREATE/UPDATE/DELETE ฯลฯ) |
| entity_type | VARCHAR(50) | NO | — | ประเภท entity (users/incidents/visits ฯลฯ) |
| entity_id | UUID | YES | — | ID ของ entity |
| old_values | JSONB | YES | — | ค่าเดิมก่อนเปลี่ยน |
| new_values | JSONB | YES | — | ค่าใหม่หลังเปลี่ยน |
| ip_address | VARCHAR(45) | YES | — | IP Address ผู้ดำเนินการ |
| created_at | TIMESTAMPTZ | NO | `now()` | วันเวลาดำเนินการ |

---

### 24. data_backups

ข้อมูลการสำรองข้อมูล

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | `uuid_generate_v4()` | Primary Key |
| filename | VARCHAR(255) | NO | — | ชื่อไฟล์ backup |
| file_size_bytes | BIGINT | YES | — | ขนาดไฟล์ (bytes) |
| backup_type | backup_type | NO | `'manual'` | ประเภท (manual/auto) |
| status | backup_status | NO | `'in_progress'` | สถานะ (in_progress/completed/failed) |
| performed_by | UUID | YES | — | FK → `users.id` (ON DELETE SET NULL) — ผู้ดำเนินการ |
| note | TEXT | YES | — | หมายเหตุ |
| started_at | TIMESTAMPTZ | NO | `now()` | วันเวลาเริ่มต้น |
| completed_at | TIMESTAMPTZ | YES | — | วันเวลาเสร็จสิ้น |
| created_at | TIMESTAMPTZ | NO | `now()` | วันเวลาสร้างรายการ |

---

## Faculties & Departments (คณะ/สาขา)

### 25. faculties

คณะ/วิทยาลัย

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | `gen_random_uuid()` | Primary Key |
| name | VARCHAR(200) | NO | — | ชื่อคณะ (UNIQUE) |
| is_active | BOOLEAN | NO | `true` | สถานะการใช้งาน |
| sort_order | INTEGER | NO | `0` | ลำดับการแสดงผล |
| created_at | TIMESTAMPTZ | NO | `now()` | วันเวลาสร้าง |
| updated_at | TIMESTAMPTZ | NO | `now()` | วันเวลาอัปเดตล่าสุด |

**Unique Constraints:** `name`

---

### 26. departments

สาขาวิชา/ภาควิชา

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | `gen_random_uuid()` | Primary Key |
| faculty_id | UUID | NO | — | FK → `faculties.id` (ON DELETE CASCADE) — คณะที่สังกัด |
| name | VARCHAR(200) | NO | — | ชื่อสาขาวิชา |
| is_active | BOOLEAN | NO | `true` | สถานะการใช้งาน |
| sort_order | INTEGER | NO | `0` | ลำดับการแสดงผล |
| created_at | TIMESTAMPTZ | NO | `now()` | วันเวลาสร้าง |
| updated_at | TIMESTAMPTZ | NO | `now()` | วันเวลาอัปเดตล่าสุด |

**Unique Constraints:** `(faculty_id, name)` — ชื่อสาขาต้องไม่ซ้ำภายในคณะเดียวกัน

---

## Views

### 27. v_daily_incident_stats

สถิติเหตุการณ์ฉุกเฉินรายวัน

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| incident_date | DATE | YES | วันที่ |
| total_incidents | BIGINT | YES | จำนวนเหตุการณ์ทั้งหมด |
| critical_count | BIGINT | YES | จำนวนเหตุการณ์ระดับ critical |
| high_count | BIGINT | YES | จำนวนเหตุการณ์ระดับ high |
| resolved_count | BIGINT | YES | จำนวนเหตุการณ์ที่แก้ไขแล้ว |
| avg_response_minutes | NUMERIC | YES | เวลาตอบสนองเฉลี่ย (นาที) |

---

### 28. v_medical_certificates

ข้อมูลใบรับรองแพทย์แบบ join (พร้อมชื่อผู้ป่วยและผู้ออก)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | YES | ID ใบรับรอง |
| certificate_number | VARCHAR | YES | เลขที่ใบรับรอง |
| visit_id | UUID | YES | ID การเข้ารับการรักษา |
| patient_id | UUID | YES | ID ผู้ป่วย |
| patient_name | TEXT | YES | ชื่อ-นามสกุลผู้ป่วย (concat) |
| student_id | VARCHAR | YES | รหัสนักศึกษา |
| issued_by | UUID | YES | ID ผู้ออกใบรับรอง |
| issued_by_name | TEXT | YES | ชื่อ-นามสกุลผู้ออก (concat) |
| diagnosis_text | TEXT | YES | ผลการวินิจฉัย |
| recommendation | TEXT | YES | คำแนะนำ |
| rest_days | INTEGER | YES | จำนวนวันพักฟื้น |
| rest_start_date | DATE | YES | วันเริ่มพักฟื้น |
| rest_end_date | DATE | YES | วันสิ้นสุดพักฟื้น |
| issued_at | TIMESTAMPTZ | YES | วันเวลาออกใบรับรอง |

---

### 29. v_medicines_expiring_soon

ยา/เวชภัณฑ์ที่ใกล้หมดอายุ (ภายใน 30 วัน)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| medicine_id | UUID | YES | ID ยา |
| medicine_name | VARCHAR | YES | ชื่อยา |
| category | medicine_category | YES | หมวดหมู่ |
| batch_id | UUID | YES | ID ล็อต |
| batch_number | VARCHAR | YES | เลขที่ล็อต |
| batch_quantity | INTEGER | YES | จำนวนในล็อต |
| expiry_date | DATE | YES | วันหมดอายุ |
| days_until_expiry | INTEGER | YES | จำนวนวันก่อนหมดอายุ |

---

### 30. v_medicines_low_stock

ยา/เวชภัณฑ์ที่สต็อกต่ำกว่าเกณฑ์

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | YES | ID ยา |
| name | VARCHAR | YES | ชื่อยา |
| category | medicine_category | YES | หมวดหมู่ |
| stock_quantity | INTEGER | YES | จำนวนคงเหลือ |
| min_stock_level | INTEGER | YES | ระดับขั้นต่ำ |
| shortage | INTEGER | YES | จำนวนที่ขาด (min_stock_level - stock_quantity) |

---

## 31. Enum Types

| Enum Name | Values | Description |
|-----------|--------|-------------|
| user_role | `student`, `staff`, `admin` | บทบาทผู้ใช้ |
| incident_type | `injury`, `illness`, `accident`, `fainting`, `other` | ประเภทเหตุการณ์ฉุกเฉิน |
| severity_level | `low`, `medium`, `high`, `critical` | ระดับความรุนแรง |
| incident_status | `pending`, `accepted`, `in_progress`, `completed`, `cancelled` | สถานะเหตุการณ์ |
| visit_type | `walk_in`, `emergency`, `appointment`, `follow_up` | ประเภทการเข้ารับการรักษา |
| visit_status | `waiting`, `in_treatment`, `completed`, `referred` | สถานะการรักษา |
| medicine_category | `medicine`, `supply`, `equipment` | หมวดหมู่ยา/เวชภัณฑ์ |
| stock_action | `received`, `dispensed`, `expired`, `adjusted` | ประเภทการเคลื่อนไหวสต็อก |
| appointment_status | `scheduled`, `checked_in`, `completed`, `cancelled`, `no_show` | สถานะการนัดหมาย |
| notification_type | `emergency`, `appointment`, `stock_alert`, `system`, `expiry_alert` | ประเภทการแจ้งเตือน |
| emergency_contact_category | `hospital`, `police`, `rescue`, `fire`, `other` | หมวดหมู่ผู้ติดต่อฉุกเฉิน |
| backup_type | `manual`, `auto` | ประเภทการสำรองข้อมูล |
| backup_status | `in_progress`, `completed`, `failed` | สถานะการสำรองข้อมูล |

---

## Entity Relationship Summary

```
users ──┬── student_health_profiles (1:1)
        ├── refresh_tokens (1:N)
        ├── password_reset_tokens (1:N)
        ├── login_attempts (1:N)
        ├── emergency_incidents (1:N, as reporter)
        ├── incident_responders (1:N, as responder)
        ├── patient_visits (1:N, as patient & staff)
        ├── medical_certificates (1:N, as issued_by)
        ├── visit_medications (1:N, as dispensed_by)
        ├── medicine_batches (1:N, as received_by)
        ├── medicine_stock_logs (1:N, as performed_by)
        ├── appointment_slots (1:N, as staff)
        ├── appointments (1:N, as patient & staff)
        ├── notifications (1:N)
        ├── push_subscriptions (1:N)
        ├── audit_logs (1:N)
        ├── data_backups (1:N, as performed_by)
        └── system_settings (1:N, as updated_by)

emergency_incidents ──┬── incident_images (1:N)
                      ├── incident_responders (1:N)
                      ├── incident_status_logs (1:N)
                      └── patient_visits (1:N)

patient_visits ──┬── visit_medications (1:N)
                 └── medical_certificates (1:N)

medicines ──┬── medicine_batches (1:N)
            └── medicine_stock_logs (1:N)

faculties ──── departments (1:N)

treatment_types ──── patient_visits (1:N)
appointment_slots ──── appointments (1:N)
```
