# Backend Testing Checklist

ใช้ตรวจสอบว่าทุก module ทำงานถูกต้องก่อนขึ้น Frontend

## วิธีใช้

- `[ ]` = ยังไม่ทดสอบ
- `[x]` = ผ่าน
- `[!]` = มี bug (จดไว้แก้)

---

## สถานะการทดสอบ (อัปเดต: 2026-03-01)

> **91/91 tests PASSED** — ทดสอบด้วย `docs/test-api.js` (automated test suite)
>
> รันด้วยคำสั่ง: `node docs/test-api.js`

---

## Pre-Test Setup

- [x] Backend start ได้ไม่มี error (`npm run start:dev`)
- [x] Database connected — remote PostgreSQL `iot666.ddns.net:5435/ruts_realaids`
- [x] Automated test suite รันได้: `node docs/test-api.js`

---

## Module 1: Auth (14/14) ✅

- [x] Register admin — ได้ 201 + message
- [x] Register staff — ได้ 201
- [x] Register student — ได้ 201
- [x] Register ซ้ำ email — ได้ 409 Conflict
- [x] Register ส่ง field ไม่รู้จัก (`role`) — ได้ 400 (forbidNonWhitelisted)
- [x] Login wrong password — ได้ 401
- [x] Login wrong email — ได้ 401
- [x] Login admin — ได้ accessToken + refreshToken
- [x] Login staff — ได้ accessToken + refreshToken
- [x] Login student — ได้ accessToken + refreshToken
- [x] Refresh token — ได้ accessToken ใหม่
- [x] Refresh ด้วย token ผิด — ได้ 401
- [x] Forgot password — ได้ 200
- [x] Logout — refreshToken ถูก revoke

## Module 2: Users (7/7) ✅

- [x] GET /users/me (student) — ได้ข้อมูล user ปัจจุบัน
- [x] PUT /users/me — อัปเดต firstName & phone ได้
- [x] PUT /users/me/health-profile — upsert ข้อมูลสุขภาพได้
- [x] GET /users/me/health-profile — ได้ข้อมูลสุขภาพ (blood_type ✓)
- [x] GET /users (staff) — ได้ paginated list
- [x] GET /users (student) — ได้ 403 Forbidden
- [x] GET /users/:id (staff) — ได้รายละเอียด user

## Module 3: Emergency Incidents (11/11) ✅

- [x] POST /incidents (student) — สร้างเหตุ + status=pending
- [x] GET /incidents (staff) — ได้ list + pagination
- [x] GET /incidents?status=pending (staff) — filter ทำงาน
- [x] GET /incidents/:id (staff) — ได้รายละเอียดครบ
- [x] GET /incidents/:id (student — own) — ได้ 200
- [x] POST /incidents/:id/accept (student) — ได้ 403
- [x] POST /incidents/:id/accept (staff) — status→accepted + responder record ถูกสร้าง
- [x] PATCH /incidents/:id/status → in_progress — status_log ถูกสร้าง
- [x] PATCH /incidents/:id/status → completed — status_log ถูกสร้าง
- [x] GET /incidents/:id/logs — เห็น audit trail ≥2 entries
- [x] GET /incidents (student) — เห็นเฉพาะเหตุของตัวเอง

## Module 4: Patient Visits (6/6) ✅

- [x] GET /visits/queue (staff) — ได้ list status=waiting
- [x] POST /visits (staff) — สร้าง visit + link incident ได้
- [x] GET /visits/:id (staff) — ได้รายละเอียด + vital_signs
- [x] PATCH /visits/:id — อัปเดต diagnosis + status=in_treatment
- [x] GET /visits?status=in_treatment — filter ทำงาน
- [x] PATCH /visits/:id — status→completed ได้

## Module 5: Medical Certificates (4/4) ✅

- [x] POST /certificates — ได้ certificate_number อัตโนมัติ (CERT-YYYY-NNNNNN)
- [x] GET /certificates — ได้ list + ข้อมูลผู้ป่วย (จาก view)
- [x] GET /certificates/:id — ได้รายละเอียด
- [x] GET /certificates/:id/pdf — ได้ PDF file

## Module 6: Medicines & Batches (12/12) ✅

- [x] POST /medicines — สร้างยาใหม่ได้ 201
- [x] POST /medicines/:id/batches — เพิ่ม batch + stock_quantity อัปเดต
- [x] GET /medicines — ได้ list + stockQuantity ถูกต้อง
- [x] GET /medicines/:id — ได้รายละเอียด + isLowStock flag
- [x] GET /medicines/:id/batches — ได้ list batches (FIFO order)
- [x] GET /medicines/:id/stock-logs — ได้ประวัติ received + dispensed
- [x] GET /medicines/alerts/low-stock — แสดงยาที่ stock ต่ำ
- [x] GET /medicines/alerts/expiring — แสดง batch ใกล้หมดอายุ
- [x] POST /visits (walk-in) — สร้าง visit แบบ walk-in ได้
- [x] POST /visits/:id/medications — จ่ายยา 10 เม็ด + stock ลดเหลือ 490 ✓
- [x] GET /visits/:id/medications — ได้รายการยาที่จ่าย
- [x] PATCH /visits/:id → completed — ปิด visit ได้

## Module 7: Appointments (8/8) ✅

- [x] POST /appointment-slots (Monday) — สร้าง slot ได้ 201
- [x] GET /appointment-slots/available?date=2026-03-02 — ได้ slots ว่าง
- [x] POST /appointments (student) — จองนัด + status=scheduled
- [x] GET /appointments/my (student) — ได้นัดของตัวเอง
- [x] GET /appointments/today (staff) — ได้นัดวันนี้
- [x] PATCH /appointments/:id/check-in — status→checked_in
- [x] PATCH /appointments/:id/complete — status→completed
- [x] PATCH /appointments/:id/cancel — status→cancelled + cancelReason

## Module 8: Notifications (3/3) ✅

- [x] GET /notifications — ได้ list ของ user ปัจจุบัน
- [x] GET /notifications/unread-count — ได้จำนวน unread
- [x] PATCH /notifications/read-all — mark ทั้งหมดเป็น read

## Module 9: Reports (5/5) ✅

- [x] GET /reports/dashboard — ได้สรุปวันนี้ (incidents, visits, stock, appointments)
- [x] GET /reports/incidents?from=&to= — ได้สถิติ + breakdown ตาม type/severity
- [x] GET /reports/visits?from=&to= — ได้สถิติ + top medicines
- [x] GET /reports/medicines — ได้ low stock + expiring summary
- [x] GET /reports/export/pdf — ได้ PDF file

## Module 10: Settings (13/13) ✅

- [x] GET /settings (admin) — ได้ array of all settings
- [x] GET /settings/infirmary — ได้ lat/lng/name/phone object
- [x] PUT /settings/infirmary_phone — อัปเดตค่าได้
- [x] GET /admin/users (admin) — paginated list
- [x] POST /admin/users — สร้าง staff user ได้
- [x] PUT /admin/users/:id — อัปเดต phone ได้
- [x] PATCH /admin/users/:id/deactivate — isActive=false
- [x] PATCH /admin/users/:id/activate — isActive=true
- [x] POST /emergency-contacts — สร้างได้ 201
- [x] GET /emergency-contacts (staff) — ได้ list
- [x] PUT /emergency-contacts/:id — อัปเดต phone ได้
- [x] DELETE /emergency-contacts/:id — ลบได้ 204
- [x] GET /backups (admin) — ได้ list

## Security Tests (8/8) ✅

- [x] No Authorization header → 401
- [x] Invalid Bearer token → 401
- [x] Student accessing staff-only route → 403
- [x] Staff accessing admin-only route → 403
- [x] Staff trying admin action (backup) → 403
- [x] ส่ง unknown field ใน register body → 400
- [x] GET incident ด้วย UUID ปลอม → 404
- [x] Student accept incident (role guard) → 403

---

## สรุปผล

| รายการ | ค่า |
| ------ | --- |
| Total tests | 91 |
| ✅ Passed | 91 |
| ❌ Failed | 0 |
| เวลารัน | ~12 วินาที |
| วันที่ทดสอบ | 2026-03-01 |

---

## Bugs พบและแก้ไขแล้ว

| # | Module | ปัญหา | สถานะ |
| - | ------ | ------ | ----- |
| 1 | Emergency | `incident_status_logs.old_status` เป็น NOT NULL แต่ service ส่ง NULL สำหรับ initial log | ✅ แก้แล้ว — ลบ initial INSERT ออก |
| 2 | Emergency | `incident_images` ใช้คอลัมน์ `uploaded_at` ไม่ใช่ `created_at` | ✅ แก้แล้ว |
| 3 | Emergency | `ON CONFLICT (incident_id)` ผิด — unique constraint จริงคือ `(incident_id, responder_id)` | ✅ แก้แล้ว |
| 4 | Visits | คอลัมน์ `treatment_notes` ไม่มีใน DB จริง ชื่อคือ `treatment` | ✅ แก้แล้ว |
| 5 | Visits | `visit_medications.dispensed_by` เป็น NOT NULL แต่ไม่ได้ set | ✅ แก้แล้ว |
| 6 | Medicines | คอลัมน์ `note` (singular) ไม่ใช่ `notes` ใน `medicine_stock_logs` | ✅ แก้แล้ว |
| 7 | Medicines | `medicine_stock_logs.remaining_stock` + `performed_by` เป็น NOT NULL | ✅ แก้แล้ว — คำนวณจาก UPDATE RETURNING |
| 8 | Medicines | `medicine_batches.received_by` เป็น NOT NULL แต่ไม่ได้ส่งใน INSERT | ✅ แก้แล้ว — ส่ง caller ID |
| 9 | Appointments | `appointment_date` + `appointment_time` (ไม่ใช่ `date`, `time`) | ✅ แก้แล้ว |
| 10 | Appointments | `appointments.reason` เป็น NOT NULL แต่ไม่ได้ set ใน INSERT | ✅ แก้แล้ว |
| 11 | Certificates | `v_medical_certificates` view มีคอลัมน์ `patient_name`, `issued_at` ไม่ใช่ split first/last | ✅ แก้แล้ว |
| 12 | Settings | `data_backups` ใช้ `file_size_bytes`, `performed_by` (ไม่ใช่ `file_size`, `created_by`) | ✅ แก้แล้ว |
| 13 | Reports | `WHERE date = CURRENT_DATE` → ต้องเป็น `appointment_date` | ✅ แก้แล้ว |

---

## หมายเหตุสำคัญสำหรับ Frontend Dev

### API Response เป็น camelCase เสมอ

```text
firstName, lastName, bloodType, stockQuantity, certificateNumber,
reporterId, vitalSigns, isActive, appointmentDate, appointmentTime
```

### VitalSigns field names (DTO)

```json
{ "temperature": 37.2, "bloodPressure": "120/80", "heartRate": 88, "respiratoryRate": 18 }
```

ไม่ใช่ `temp`, `bp`, `hr`, `rr`

### WebSocket Tests (ยังไม่ได้ทดสอบ automated)

- [ ] Connect ได้ + auth ด้วย token
- [ ] Invalid token → disconnect
- [ ] `incident:new` broadcast ไปหา staff ทุกคน
- [ ] `incident:status_update` ไปหา reporter
- [ ] `notification:new` ไปหา user เฉพาะคน

ทดสอบด้วย wscat หรือ frontend
