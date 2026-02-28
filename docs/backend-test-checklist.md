# Backend Testing Checklist
# ใช้ตรวจสอบว่าทุก module ทำงานถูกต้องก่อนขึ้น Frontend

## วิธีใช้
- [ ] = ยังไม่ทดสอบ
- [x] = ผ่าน
- [!] = มี bug (จดไว้แก้)

---

## Pre-Test Setup
- [ ] Backend start ได้ไม่มี error (`npm run start:dev`)
- [ ] Database connected (ดูจาก log)
- [ ] ไฟล์ backend-test.http เปิดใน VS Code + REST Client extension ติดตั้งแล้ว
- [ ] หรือ เปิด Postman/Thunder Client พร้อมใช้

---

## Module 1: Auth
- [ ] Register admin — ได้ 201 + user object
- [ ] Register staff — ได้ 201
- [ ] Register student — ได้ 201 + student_id
- [ ] Register ซ้ำ email — ได้ 409 Conflict
- [ ] Login admin — ได้ accessToken + refreshToken
- [ ] Login wrong password — ได้ 401
- [ ] Login wrong email — ได้ 401
- [ ] Refresh token — ได้ accessToken ใหม่
- [ ] Refresh ด้วย token เก่า/ผิด — ได้ 401
- [ ] Forgot password — ได้ 200 (ตรวจ password_reset_tokens table)
- [ ] Logout — refreshToken ถูก revoke
- [ ] Login ผิด 5+ ครั้ง — ถูก lock

## Module 2: Users
- [ ] GET /users/me — ได้ข้อมูล user ปัจจุบัน
- [ ] PUT /users/me — อัปเดตได้
- [ ] PUT health-profile — สร้าง/อัปเดตได้
- [ ] GET health-profile — ได้ข้อมูลสุขภาพ
- [ ] GET /users (admin) — ได้ list + pagination
- [ ] GET /users (student) — ได้ 403

## Module 3: Emergency
- [ ] POST /incidents (student) — สร้างเหตุ + status=pending
- [ ] GET /incidents — ได้ list
- [ ] GET /incidents?status=pending — filter ทำงาน
- [ ] GET /incidents/:id — ได้รายละเอียด
- [ ] POST /incidents/:id/accept (staff) — status→accepted + สร้าง responder + log
- [ ] PATCH /incidents/:id/status → in_progress — log ถูกสร้าง
- [ ] PATCH /incidents/:id/status → completed — resolved_at ถูก set
- [ ] GET /incidents/:id/logs — เห็น audit trail ครบ
- [ ] POST /incidents/:id/accept (student) — ได้ 403
- [ ] WebSocket: staff ได้รับ incident:new เมื่อ student แจ้งเหตุ
- [ ] WebSocket: student ได้รับ incident:status_update เมื่อ staff เปลี่ยนสถานะ

## Module 4: Patient Visits
- [ ] POST /visits — สร้าง visit ได้ (link กับ incident optional)
- [ ] GET /visits/queue — ได้ list status=waiting
- [ ] GET /visits/:id — ได้รายละเอียด + vital_signs
- [ ] PATCH /visits/:id — อัปเดต diagnosis, treatment, status
- [ ] POST /visits/:id/medications — จ่ายยา + stock ลดลง + stock_log ถูกสร้าง
- [ ] จ่ายยาเกิน stock — ได้ error
- [ ] GET /visits/:id/medications — ได้รายการยาที่จ่าย
- [ ] status flow: waiting → in_treatment → completed

## Module 5: Medical Certificates
- [ ] POST /certificates — ได้ certificate_number อัตโนมัติ (CERT-2025-XXXXXX)
- [ ] GET /certificates — ได้ list + ข้อมูลผู้ป่วย (จาก view)
- [ ] GET /certificates/:id — ได้รายละเอียด
- [ ] GET /certificates/:id/pdf — ได้ PDF file
- [ ] rest_end_date < rest_start_date — ได้ error (CHECK constraint)

## Module 6: Medicines
- [ ] POST /medicines — สร้างยาใหม่
- [ ] GET /medicines — ได้ list + stock info
- [ ] POST /medicines/:id/batches — เพิ่ม batch + stock_quantity อัปเดต
- [ ] เพิ่ม 2 batches ต่าง expiry — stock_quantity = ผลรวมถูกต้อง
- [ ] GET /medicines/:id/batches — ได้ list batches
- [ ] GET /medicines/:id/stock-logs — ได้ประวัติ received + dispensed
- [ ] GET /medicines/alerts/low-stock — แสดงยาที่ stock ต่ำ
- [ ] GET /medicines/alerts/expiring — แสดง batch ใกล้หมดอายุ

## Module 7: Appointments
- [ ] POST /appointment-slots — สร้าง slot ได้
- [ ] GET /appointment-slots/available?date= — ได้ slots ว่าง
- [ ] POST /appointments (student) — จองนัดได้
- [ ] จองซ้ำเกิน max_patients_per_slot — ได้ error
- [ ] GET /appointments/my (student) — ได้นัดของตัวเอง
- [ ] GET /appointments/today (staff) — ได้นัดวันนี้
- [ ] PATCH check-in — status → checked_in
- [ ] PATCH complete — status → completed
- [ ] PATCH cancel — ต้องมี cancelReason
- [ ] Notification ถูกสร้างเมื่อ student จองนัด

## Module 8: Notifications
- [ ] GET /notifications — ได้ list ของ user ปัจจุบัน
- [ ] GET /notifications/unread-count — ได้จำนวน
- [ ] PATCH /notifications/:id/read — is_read=true + read_at set
- [ ] PATCH /notifications/read-all — ทั้งหมดถูก mark
- [ ] มี notifications จาก: emergency, appointment, stock_alert

## Module 9: Reports
- [ ] GET /reports/dashboard — ได้สรุปวันนี้ (incidents, visits, stock, appointments)
- [ ] GET /reports/incidents?from=&to= — ได้สถิติ + breakdown ตาม type/severity
- [ ] GET /reports/visits?from=&to= — ได้สถิติ + top medicines
- [ ] GET /reports/medicines — ได้ low stock + expiring
- [ ] GET /reports/export/pdf — ได้ PDF file

## Module 10: Settings
- [ ] GET /settings — ได้ all settings (admin)
- [ ] GET /settings/infirmary — ได้ lat/lng/name/phone
- [ ] PUT /settings/:key — อัปเดตได้ + updated_by set
- [ ] GET /admin/users — list users (admin only)
- [ ] PATCH /admin/users/:id/deactivate — is_active=false
- [ ] PATCH /admin/users/:id/activate — is_active=true
- [ ] CRUD /emergency-contacts — ทำงานถูกต้อง
- [ ] POST /backups — สร้าง backup ได้
- [ ] GET /backups — ได้ list

## Security Tests
- [ ] No token → 401
- [ ] Invalid token → 401
- [ ] Student → staff route → 403
- [ ] Staff → admin route → 403
- [ ] SQL injection attempt → ไม่สำเร็จ (parameterized queries)
- [ ] Brute force login → locked after N attempts

## WebSocket Tests
- [ ] Connect ได้ + auth ด้วย token
- [ ] Invalid token → disconnect
- [ ] incident:new broadcast ไปหา staff ทุกคน
- [ ] incident:status_update ไปหา reporter
- [ ] notification:new ไปหา user เฉพาะคน
- [ ] Auto reconnect เมื่อ connection หลุด

---

## สรุปผล
- Total tests: ~80
- Passed: ___
- Failed: ___
- Notes: ___

## Bugs Found
| # | Module | Description | Status |
|---|--------|-------------|--------|
| 1 | | | |
| 2 | | | |
| 3 | | | |
