# Claude Code — Remaining Steps (9-15)
# ต่อจาก Step 8 (Medicines Module) ที่ทำเสร็จแล้ว


# =============================================
# STEP 9: Appointments Module
# =============================================

สร้าง appointments module ใน backend ตาม CLAUDE.md:
- POST /api/v1/appointment-slots — สร้าง slot เวลาว่าง (staff only)
- GET /api/v1/appointment-slots — ดู slots ทั้งหมด
- GET /api/v1/appointment-slots/available?date=2025-03-01 — slots ที่ว่างในวันนั้น
- PUT /api/v1/appointment-slots/:id — แก้ไข slot
- DELETE /api/v1/appointment-slots/:id — ปิด slot (set is_active=false)
- POST /api/v1/appointments — นักศึกษาจองนัดหมาย (ตรวจสอบ slot ว่าง + max_patients_per_slot)
- GET /api/v1/appointments — รายการนัดหมาย (filter by date, status, patient_id)
- GET /api/v1/appointments/my — นัดหมายของตัวเอง (student)
- GET /api/v1/appointments/today — นัดหมายวันนี้ (staff)
- GET /api/v1/appointments/:id — รายละเอียดนัดหมาย
- PATCH /api/v1/appointments/:id/check-in — เช็คอิน (staff เปลี่ยน status เป็น checked_in)
- PATCH /api/v1/appointments/:id/complete — เสร็จสิ้น
- PATCH /api/v1/appointments/:id/cancel — ยกเลิก (ต้องมี cancel_reason)
- PATCH /api/v1/appointments/:id/no-show — ไม่มา
- เมื่อสร้าง appointment สำเร็จ ให้สร้าง notification แจ้ง staff ด้วย
- ใช้ตาราง: appointment_slots, appointments, notifications


# =============================================
# STEP 10: Notifications Module
# =============================================

สร้าง notifications module ใน backend ตาม CLAUDE.md:
- GET /api/v1/notifications — รายการแจ้งเตือนของ user ปัจจุบัน (pagination, filter by type, is_read)
- GET /api/v1/notifications/unread-count — จำนวนที่ยังไม่อ่าน
- PATCH /api/v1/notifications/:id/read — mark as read
- PATCH /api/v1/notifications/read-all — mark all as read
- DELETE /api/v1/notifications/:id — ลบ notification
- POST /api/v1/push-subscriptions — subscribe push notification (เก็บ endpoint, p256dh, auth)
- DELETE /api/v1/push-subscriptions — unsubscribe
- สร้าง NotificationService ที่ module อื่นเรียกใช้ได้:
  - createNotification(userId, type, title, message, referenceType?, referenceId?)
  - notifyAllStaff(type, title, message, referenceType?, referenceId?)
  - ส่ง WebSocket event notification:new ทุกครั้งที่สร้าง notification
- ใช้ตาราง: notifications, push_subscriptions


# =============================================
# STEP 11: Reports Module
# =============================================

สร้าง reports module ใน backend ตาม CLAUDE.md:
- GET /api/v1/reports/dashboard — สรุปภาพรวมวันนี้:
  - จำนวน incidents วันนี้ (แยกตาม status)
  - จำนวน patient visits วันนี้
  - ยาสต๊อกต่ำ (count)
  - ยาใกล้หมดอายุ (count)
  - นัดหมายวันนี้ (count)
  - average response time วันนี้
- GET /api/v1/reports/incidents?from=2025-01-01&to=2025-01-31 — สถิติเหตุฉุกเฉิน:
  - ใช้ view v_daily_incident_stats
  - จำนวนตาม incident_type
  - จำนวนตาม severity
  - จำนวนตาม status
  - top 5 locations (location_name)
  - peak hours (GROUP BY EXTRACT(HOUR FROM created_at))
- GET /api/v1/reports/visits?from=&to= — สถิติการรับบริการ:
  - จำนวนตาม visit_type
  - จำนวนตาม treatment_type
  - top 10 medicines ที่จ่ายมากสุด
- GET /api/v1/reports/medicines — สถิติคลังยา:
  - ใช้ view v_medicines_low_stock
  - ใช้ view v_medicines_expiring_soon
  - stock movement summary
- GET /api/v1/reports/export/pdf?type=daily&date=2025-03-01 — export report เป็น PDF
  - ใช้ library เช่น pdfkit หรือ puppeteer
  - รวมข้อมูล incidents + visits + medicines ของวันนั้น
- staff/admin only ทุก endpoint


# =============================================
# STEP 12: Settings Module
# =============================================

สร้าง settings module ใน backend ตาม CLAUDE.md:

System Settings (admin only):
- GET /api/v1/settings — ดู settings ทั้งหมด
- PUT /api/v1/settings/:key — อัปเดต setting (บันทึก updated_by)
- GET /api/v1/settings/infirmary — ดูข้อมูลห้องพยาบาล (lat, lng, name, phone)

User Management (admin only):
- GET /api/v1/admin/users — รายชื่อ users ทั้งหมด (pagination, filter by role)
- POST /api/v1/admin/users — สร้าง user ใหม่ (staff/admin)
- PUT /api/v1/admin/users/:id — แก้ไข user
- PATCH /api/v1/admin/users/:id/deactivate — ปิดการใช้งาน (is_active=false)
- PATCH /api/v1/admin/users/:id/activate — เปิดการใช้งาน

Data Backup (admin only):
- POST /api/v1/backups — สร้าง backup ใหม่ (pg_dump)
- GET /api/v1/backups — ประวัติ backups
- GET /api/v1/backups/:id/download — download backup file

Emergency Contacts (staff/admin):
- CRUD /api/v1/emergency-contacts — จัดการสมุดโทรศัพท์ฉุกเฉิน

- ใช้ตาราง: system_settings, users, data_backups, emergency_contacts_directory, audit_logs


# =============================================
# STEP 13: Frontend Setup (Next.js)
# =============================================

สร้าง Next.js 16 project ใน folder frontend/ ตาม CLAUDE.md:
- ใช้ App Router
- TypeScript strict mode
- Tailwind CSS 4
- ติดตั้ง dependencies: @radix-ui/react-* (dialog, dropdown-menu, tabs, toast, tooltip, avatar, checkbox, select, label, input), recharts, leaflet, react-leaflet, jose, lucide-react
- สร้าง folder structure ตาม CLAUDE.md
- สร้าง lib/api.ts — fetch wrapper ที่:
  - auto attach Authorization header จาก access token
  - auto refresh token เมื่อ 401
  - base URL จาก NEXT_PUBLIC_API_URL
- สร้าง lib/auth.ts — JWT decode ด้วย jose, store token ใน memory
- สร้าง lib/websocket.ts — WebSocket client auto-reconnect
- สร้าง hooks/useAuth.ts — login, logout, user state
- สร้าง hooks/useWebSocket.ts — subscribe to events
- สร้าง types/ — interfaces สำหรับ User, Incident, Visit, Medicine, etc.
- สร้าง middleware.ts — protect routes ตาม role
- สร้าง PWA manifest.json + basic service worker
- Layout: (auth) layout ไม่มี sidebar, (student) layout มี bottom nav, (staff) layout มี sidebar


# =============================================
# STEP 14: Student Portal (Frontend)
# =============================================

สร้างหน้า Student Portal ใน frontend ตาม CLAUDE.md:

14.1 Login Page (/login):
- เลือกประเภท: นักศึกษา / บุคลากรทางการแพทย์
- form email + password
- ลืมรหัสผ่าน link
- design สวยงาม โทนสี มทร.ศรีวิชัย

14.2 Student Dashboard (/student/dashboard):
- ปุ่มฉุกเฉินใหญ่สีแดง ตรงกลาง (กดแล้วดึง GPS + เปิด form แจ้งเหตุ)
- Quick Actions: นัดหมาย, ประวัติ, โปรไฟล์
- ประวัติการใช้บริการล่าสุด 5 รายการ
- การแจ้งเตือนล่าสุด
- Bottom Navigation: หน้าหลัก | นัดหมาย | โปรไฟล์

14.3 Emergency Report Flow:
- กดปุ่มฉุกเฉิน → ดึง GPS อัตโนมัติ
- เลือกประเภทเหตุ (injury/illness/accident/fainting/other)
- เลือกความรุนแรง (low/medium/high/critical)
- ช่องรายละเอียด (optional)
- แนบรูป (optional)
- ปุ่มแจ้งเหตุ + ปุ่มโทรฉุกเฉิน (tel: link)
- หลังแจ้ง → หน้าติดตามสถานะ real-time (WebSocket)

14.4 Appointments (/student/appointments):
- นัดที่กำลังจะมาถึง
- สร้างนัดใหม่ (เลือก slot ว่าง จาก calendar)
- ประวัตินัดหมาย

14.5 Profile (/student/profile):
- ข้อมูลส่วนตัว (แก้ไขได้)
- ข้อมูลสุขภาพ (กรุ๊ปเลือด, แพ้ยา, โรคประจำตัว, ผู้ติดต่อฉุกเฉิน)


# =============================================
# STEP 15: Staff Portal (Frontend)
# =============================================

สร้างหน้า Staff Portal ใน frontend ตาม CLAUDE.md:

15.1 Staff Dashboard (/staff/dashboard):
- สถิติภาพรวมวันนี้ (cards: incidents, visits, low stock, appointments)
- เหตุฉุกเฉินใหม่ real-time feed (WebSocket) พร้อมเสียงแจ้งเตือน
- คิวผู้รอรับบริการ
- แจ้งเตือนสำคัญ (ยาหมดอายุ, สต๊อกต่ำ)
- Sidebar Navigation

15.2 Emergency Management (/staff/emergency):
- Tabs: เหตุใหม่ | กำลังดำเนินการ | เสร็จสิ้น
- แต่ละ card แสดง: ชื่อผู้แจ้ง, ประเภท, ความรุนแรง, เวลา, ระยะทาง
- ปุ่ม: รับเหตุ → กำลังช่วยเหลือ → เสร็จสิ้น
- Map View tab: แผนที่ Leaflet แสดง markers ทุกเหตุ + ตำแหน่งห้องพยาบาล
- คลิก marker → ดูรายละเอียด + นำทาง
- real-time update ผ่าน WebSocket

15.3 Patient Management (/staff/patients):
- ตารางรายชื่อผู้รับบริการ (search, filter, pagination)
- หน้ารายละเอียดผู้ป่วย: ข้อมูลส่วนตัว, ข้อมูลสุขภาพ, ประวัติ visits ทั้งหมด
- สร้าง visit ใหม่: เลือกผู้ป่วย → บันทึกอาการ → วินิจฉัย → จ่ายยา → เสร็จสิ้น
- ปุ่มพิมพ์ใบรับรองแพทย์

15.4 Medicine Inventory (/staff/medicines):
- ตารางยาทั้งหมด (แสดง stock, สถานะ)
- Highlight แดง: สต๊อกต่ำ
- Highlight ส้ม: ใกล้หมดอายุ
- หน้ารายละเอียดยา: batches, stock logs
- เพิ่ม batch ใหม่ (รับยาเข้า)
- ปรับ stock

15.5 Appointments (/staff/appointments):
- Calendar view (week/day)
- สร้าง/จัดการ slots
- รายชื่อนัดหมายวันนี้ + check-in

15.6 Reports (/staff/reports):
- Dashboard สถิติ (Recharts: bar chart, line chart, pie chart)
- กรองตามช่วงเวลา
- Top statistics
- ปุ่ม export PDF

15.7 Settings (/staff/settings):
- โปรไฟล์
- การแจ้งเตือน
- จัดการผู้ใช้งาน (admin)
- ตั้งค่าระบบ (admin)
- สำรองข้อมูล (admin)
- สมุดโทรศัพท์ฉุกเฉิน
