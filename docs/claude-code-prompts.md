# Claude Code — Quick Start Prompts
# คำสั่งแนะนำสำหรับใช้กับ Claude Code ทีละ step

# =============================================
# STEP 1: สร้างโครงสร้างโปรเจค
# =============================================

# พิมพ์ใน Claude Code:

สร้างโครงสร้าง folder สำหรับโปรเจค ruts-realaids ตาม CLAUDE.md
- สร้าง folder: frontend/, backend/, database/, docs/
- copy ไฟล์ .env.example ไปที่ root
- สร้าง .gitignore สำหรับ Node.js + Next.js


# =============================================
# STEP 2: ตั้งค่า Backend (Nest.js)
# =============================================

สร้าง Nest.js project ใน folder backend/ ตาม CLAUDE.md:
- TypeScript strict mode
- PostgreSQL connection ด้วย pg library (raw SQL, ไม่ใช้ ORM)
- สร้าง DatabaseService สำหรับ query
- ตั้งค่า Helmet, Morgan, CORS
- ตั้งค่า WebSocket ด้วย ws library
- สร้าง folder structure ตาม CLAUDE.md (modules/, common/, database/, websocket/)
- อ่าน config จาก .env


# =============================================
# STEP 3: Auth Module
# =============================================

สร้าง auth module ใน backend ตาม CLAUDE.md:
- POST /api/v1/auth/login — login ด้วย email + password
- POST /api/v1/auth/register — register user ใหม่
- POST /api/v1/auth/refresh — refresh access token
- POST /api/v1/auth/logout — revoke refresh token
- POST /api/v1/auth/forgot-password — ส่ง reset token
- POST /api/v1/auth/reset-password — reset password ด้วย token
- สร้าง AuthGuard, RolesGuard, @CurrentUser() decorator
- Password hash ด้วย bcrypt (12 rounds)
- JWT access token 15min, refresh token 7days
- บันทึก login_attempts ทุกครั้ง
- Lock account หลัง 5 failed attempts (15 นาที)
- ใช้ตาราง: users, refresh_tokens, password_reset_tokens, login_attempts


# =============================================
# STEP 4: Users Module
# =============================================

สร้าง users module ใน backend:
- GET /api/v1/users/me — ข้อมูล user ปัจจุบัน
- PUT /api/v1/users/me — อัปเดต profile
- GET /api/v1/users/me/health-profile — ข้อมูลสุขภาพ
- PUT /api/v1/users/me/health-profile — อัปเดตข้อมูลสุขภาพ
- GET /api/v1/users — รายชื่อ users (staff/admin only, with pagination)
- Staff only: GET /api/v1/users/:id
- ใช้ตาราง: users, student_health_profiles


# =============================================
# STEP 5: Emergency Module
# =============================================

สร้าง emergency module ใน backend:
- POST /api/v1/incidents — แจ้งเหตุใหม่ (student)
- GET /api/v1/incidents — รายการเหตุ (filter by status, type, date)
- GET /api/v1/incidents/:id — รายละเอียดเหตุ
- PATCH /api/v1/incidents/:id/status — เปลี่ยนสถานะ (staff)
- POST /api/v1/incidents/:id/accept — รับเหตุ (staff)
- POST /api/v1/incidents/:id/images — upload รูป
- GET /api/v1/incidents/:id/images — รูปทั้งหมด
- GET /api/v1/incidents/:id/logs — ประวัติสถานะ
- WebSocket: broadcast incident:new, incident:status_update เมื่อมีการเปลี่ยนแปลง
- คำนวณระยะทางจาก GPS ถึงห้องพยาบาล (จาก system_settings)
- ใช้ตาราง: emergency_incidents, incident_images, incident_responders, incident_status_logs


# =============================================
# STEP 6: Visits Module
# =============================================

สร้าง visits module ใน backend:
- POST /api/v1/visits — สร้าง visit ใหม่ (staff)
- GET /api/v1/visits — รายการ visits (filter, pagination)
- GET /api/v1/visits/:id — รายละเอียด visit
- PATCH /api/v1/visits/:id — อัปเดต visit (diagnosis, treatment, status)
- POST /api/v1/visits/:id/medications — จ่ายยา (ตัด stock อัตโนมัติ)
- GET /api/v1/visits/:id/medications — รายการยาที่จ่าย
- GET /api/v1/visits/queue — คิวผู้รอ (status=waiting)
- ใช้ตาราง: patient_visits, visit_medications, treatment_types, medicines, medicine_batches


# =============================================
# STEP 7: Certificates Module
# =============================================

สร้าง certificates module ใน backend:
- POST /api/v1/certificates — สร้างใบรับรอง (auto certificate_number)
- GET /api/v1/certificates — รายการใบรับรอง
- GET /api/v1/certificates/:id — รายละเอียด
- GET /api/v1/certificates/:id/pdf — export PDF
- ใช้ view: v_medical_certificates


# =============================================
# STEP 8: Medicines Module
# =============================================

สร้าง medicines module ใน backend:
- CRUD /api/v1/medicines
- POST /api/v1/medicines/:id/batches — เพิ่ม batch ใหม่ (อัปเดต stock_quantity)
- GET /api/v1/medicines/:id/batches — รายการ batches
- GET /api/v1/medicines/:id/stock-logs — ประวัติเคลื่อนไหว
- GET /api/v1/medicines/alerts/low-stock — ยาสต๊อกต่ำ (ใช้ view)
- GET /api/v1/medicines/alerts/expiring — ยาใกล้หมดอายุ (ใช้ view)
- ใช้ตาราง: medicines, medicine_batches, medicine_stock_logs


# =============================================
# STEP 9: ต่อไปทำ Appointments, Notifications, Reports, Settings
# แล้วค่อยเริ่ม Frontend
# =============================================
