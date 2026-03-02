# RUTS-REALAIDS Full System Test Plan
# ทดสอบ Frontend + Backend ร่วมกัน (Integration Test)
# ทดสอบตาม User Flow จริง

## Pre-Test Checklist

- [ ] Backend running: `cd backend && npm run start:dev` (port 4000)
- [ ] Frontend running: `cd frontend && npm run dev` (port 3000)
- [ ] Database ruts_realaids มีข้อมูล seed (system_settings, treatment_types, emergency_contacts)
- [ ] เปิด Browser 2 tabs (จำลอง student + staff)
- [ ] เปิด Browser DevTools → Console (ดู errors)
- [ ] เปิด Browser DevTools → Network (ดู API calls)
- [ ] เปิด Backend terminal (ดู logs)

---

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ruts.ac.th | Admin@1234 |
| Staff | nurse@ruts.ac.th | Nurse@1234 |
| Student | student@ruts.ac.th | Student@1234 |

> ถ้ายังไม่มี accounts ให้ register ก่อน หรือ seed ผ่าน API

---

## FLOW 1: Registration & Login
**ผู้ทดสอบ: ทดสอบคนเดียว**

### 1.1 หน้า Login
- [ ] เปิด http://localhost:3000 → redirect ไปหน้า login
- [ ] แสดง 2 ตัวเลือก: นักศึกษา / บุคลากรทางการแพทย์
- [ ] หน้าตาสวยงาม ไม่มี layout เพี้ยน
- [ ] Responsive: ย่อหน้าจอแล้วไม่เพี้ยน

### 1.2 Register Student
- [ ] กด นักศึกษา → ไปหน้า login student
- [ ] มีลิงก์ สมัครสมาชิก / Register
- [ ] กรอก: email, password, ชื่อ, นามสกุล, เบอร์โทร, รหัสนักศึกษา
- [ ] กด submit → สร้างสำเร็จ → redirect ไป login
- [ ] Register ซ้ำ email → แสดง error

### 1.3 Login Student
- [ ] กรอก email + password → login สำเร็จ
- [ ] Redirect ไป /student/dashboard
- [ ] แสดงชื่อ user ถูกต้อง
- [ ] Password ผิด → แสดง error message
- [ ] กรอก email ไม่มีในระบบ → แสดง error

### 1.4 Login Staff
- [ ] เปิด tab ใหม่ → http://localhost:3000/login
- [ ] กด บุคลากรทางการแพทย์
- [ ] Login ด้วย nurse@ruts.ac.th → redirect ไป /staff/dashboard
- [ ] แสดง sidebar navigation ถูกต้อง

### 1.5 Session & Token
- [ ] Refresh หน้า (F5) → ยังอยู่ในระบบ (ไม่ถูก logout)
- [ ] เปิด DevTools → Network → API calls มี Authorization header
- [ ] ปล่อยทิ้งไว้ 15+ นาที → ระบบ refresh token อัตโนมัติ (ไม่ถูก logout)

### 1.6 Logout
- [ ] กดปุ่ม Logout → กลับไปหน้า login
- [ ] กดปุ่ม Back ของ browser → ไม่สามารถกลับไปหน้า dashboard ได้

---

## FLOW 2: Emergency Report (Student → Staff)
**ใช้ 2 browser tabs: Tab A = Student, Tab B = Staff**

### 2.1 Student แจ้งเหตุ (Tab A)
- [ ] Student dashboard → เห็นปุ่มฉุกเฉินสีแดงใหญ่
- [ ] กดปุ่มฉุกเฉิน → Browser ขอ permission GPS
- [ ] อนุญาต GPS → แสดงพิกัดปัจจุบัน
- [ ] เลือกประเภทเหตุ: injury
- [ ] เลือกความรุนแรง: high
- [ ] กรอกรายละเอียด: "หกล้มบันไดอาคาร 5"
- [ ] (Optional) แนบรูป
- [ ] กด แจ้งเหตุ → สำเร็จ
- [ ] แสดงหน้าติดตามสถานะ → status = "รอรับเรื่อง" (pending)

### 2.2 Staff ได้รับแจ้งเตือน (Tab B)
- [ ] Staff dashboard → มี notification ใหม่ (real-time, ไม่ต้อง refresh)
- [ ] แสดงข้อมูล: ชื่อผู้แจ้ง, ประเภท, ความรุนแรง, เวลา
- [ ] มีเสียงหรือ visual alert (ถ้ามี)

### 2.3 Staff จัดการเหตุ (Tab B)
- [ ] ไปหน้า จัดการเหตุฉุกเฉิน → tab "เหตุใหม่"
- [ ] เห็น incident ที่ student แจ้ง
- [ ] แสดงระยะทางจากห้องพยาบาล
- [ ] กดดูบนแผนที่ → เห็น marker บนแผนที่ Leaflet + ตำแหน่งห้องพยาบาล
- [ ] กดปุ่ม "รับเหตุ" → status เปลี่ยนเป็น "accepted"

### 2.4 Student เห็นอัปเดต (Tab A)
- [ ] หน้าติดตามสถานะ → status เปลี่ยนเป็น "รับเรื่องแล้ว" (real-time)
- [ ] แสดงชื่อเจ้าหน้าที่ที่รับเรื่อง

### 2.5 Staff อัปเดตสถานะ (Tab B)
- [ ] กด "กำลังช่วยเหลือ" → status = in_progress
- [ ] Student (Tab A) เห็นอัปเดต real-time
- [ ] กด "เสร็จสิ้น" → status = completed
- [ ] Student (Tab A) เห็นอัปเดต real-time
- [ ] เหตุย้ายไป tab "เสร็จสิ้น"

---

## FLOW 3: Patient Visit (Walk-in)
**ทดสอบ: Staff tab**

### 3.1 สร้าง Visit ใหม่
- [ ] ไปหน้า จัดการผู้ป่วย
- [ ] กด สร้าง Visit ใหม่
- [ ] เลือกผู้ป่วย (search ชื่อหรือรหัสนักศึกษา)
- [ ] ประเภท: walk_in
- [ ] กรอกอาการ: "ปวดหัว มีไข้"
- [ ] กรอก vital signs: BP 120/80, HR 88, Temp 38.2, RR 18
- [ ] กด สร้าง → visit ถูกสร้าง status = waiting

### 3.2 คิวผู้รอ
- [ ] Dashboard → เห็น "คิวผู้รอรับบริการ" เพิ่ม 1 คน
- [ ] หน้าจัดการผู้ป่วย → เห็น visit ใหม่

### 3.3 รักษาผู้ป่วย
- [ ] เปิด visit → กรอก diagnosis: "ไข้หวัด"
- [ ] เลือกประเภทการรักษา: จ่ายยา
- [ ] กรอก treatment: "จ่ายยาพาราเซตามอล + ให้พัก"
- [ ] เปลี่ยน status → in_treatment

### 3.4 จ่ายยา
- [ ] กดปุ่ม จ่ายยา
- [ ] เลือกยา: Paracetamol 500mg
- [ ] เลือก batch (แสดง expiry date ของแต่ละ batch)
- [ ] จำนวน: 10 เม็ด
- [ ] กรอกวิธีรับประทาน: "1 เม็ด วันละ 3 ครั้ง หลังอาหาร"
- [ ] กด จ่ายยา → สำเร็จ
- [ ] ✅ ตรวจสอบ: stock ของยาลดลง 10

### 3.5 เสร็จสิ้น Visit
- [ ] เปลี่ยน status → completed
- [ ] กรอก notes: "แนะนำให้พัก 1 วัน"
- [ ] Visit ย้ายไป list เสร็จสิ้น

### 3.6 ออกใบรับรองแพทย์
- [ ] กดปุ่ม พิมพ์ใบรับรอง
- [ ] กรอก: diagnosis, recommendation, จำนวนวันพัก, วันเริ่ม-สิ้นสุด
- [ ] กด สร้าง → ได้เลขที่ใบรับรอง (CERT-2025-XXXXXX)
- [ ] กด Export PDF → ได้ไฟล์ PDF → เปิดดูข้อมูลถูกต้อง

---

## FLOW 4: Emergency → Visit (เชื่อมกัน)
**ทดสอบ flow ต่อเนื่อง: แจ้งเหตุ → รับเรื่อง → สร้าง visit จาก incident**

### 4.1 Student แจ้งเหตุใหม่ (Tab A)
- [ ] แจ้งเหตุ: fainting, critical, "นักศึกษาเป็นลมที่โรงอาหาร"

### 4.2 Staff รับเหตุ + สร้าง Visit (Tab B)
- [ ] รับเหตุ → in_progress → completed
- [ ] จากหน้า incident → กดปุ่ม "สร้าง Visit"
- [ ] ข้อมูล patient ถูก fill อัตโนมัติ (จาก incident)
- [ ] visit_type = emergency
- [ ] incident_id ถูกเชื่อมอัตโนมัติ
- [ ] ✅ ตรวจสอบ: visit แสดง link กลับไปหา incident ได้

---

## FLOW 5: Medicine Inventory
**ทดสอบ: Staff tab**

### 5.1 ดูรายการยา
- [ ] ไปหน้า คลังยาและเวชภัณฑ์
- [ ] แสดงรายการยาทั้งหมด + stock level
- [ ] ยาสต๊อกต่ำ → highlight แดง
- [ ] ยาใกล้หมดอายุ → highlight ส้ม

### 5.2 เพิ่มยาใหม่
- [ ] กด เพิ่มยา
- [ ] กรอก: ชื่อ, ชื่อสามัญ, หมวดหมู่, หน่วย, จำนวนขั้นต่ำ
- [ ] สร้างสำเร็จ → stock = 0

### 5.3 รับยาเข้า (เพิ่ม Batch)
- [ ] เลือกยา → กด เพิ่ม Batch
- [ ] กรอก: batch number, จำนวน 500, วันหมดอายุ 2026-12-31
- [ ] สร้างสำเร็จ → stock เพิ่มเป็น 500
- [ ] เพิ่ม batch 2: จำนวน 200, หมดอายุ 2025-04-15
- [ ] Stock รวม = 700

### 5.4 ดูประวัติ Stock
- [ ] เปิดยา → tab ประวัติเคลื่อนไหว
- [ ] เห็น: received +500, received +200, (dispensed -10 จาก flow 3)

### 5.5 Alerts
- [ ] ยาที่ stock < min_stock_level → แสดงใน alert สต๊อกต่ำ
- [ ] Batch ที่หมดอายุใน 30 วัน → แสดงใน alert ใกล้หมดอายุ

---

## FLOW 6: Appointments
**ใช้ 2 tabs: Student + Staff**

### 6.1 Staff สร้าง Slot (Tab B)
- [ ] ไปหน้า นัดหมาย → จัดการ slots
- [ ] สร้าง slot: วันจันทร์, 09:00-12:00, 30 นาที/slot, max 2 คน
- [ ] สร้าง slot: วันพุธ, 13:00-16:00, 30 นาที/slot, max 1 คน

### 6.2 Student จองนัด (Tab A)
- [ ] ไปหน้า นัดหมาย → สร้างนัดใหม่
- [ ] เลือกวันที่ → แสดง slots ว่าง
- [ ] เลือก slot → กรอกเหตุผล: "ติดตามอาการข้อเท้า"
- [ ] กด จอง → สำเร็จ
- [ ] แสดงในรายการ "นัดที่กำลังจะมาถึง"

### 6.3 Staff เห็นนัดหมาย (Tab B)
- [ ] Dashboard → แสดงจำนวนนัดวันนี้ (ถ้านัดวันนี้)
- [ ] หน้านัดหมาย → เห็นนัดใหม่ใน calendar
- [ ] กด Check-in → status = checked_in
- [ ] กด เสร็จสิ้น → status = completed

### 6.4 ยกเลิกนัด (Tab A)
- [ ] สร้างนัดใหม่อีก 1 รายการ
- [ ] กด ยกเลิก → ต้องกรอกเหตุผล
- [ ] กด ยืนยัน → status = cancelled
- [ ] ปรากฏใน ประวัตินัดหมาย

---

## FLOW 7: Notifications
**ทดสอบ: ทั้ง Student + Staff**

### 7.1 Student Notifications (Tab A)
- [ ] กดไอคอน notification bell
- [ ] เห็น notifications จาก: incident status update, appointment confirmation
- [ ] แสดงจำนวน unread (badge ตัวเลข)
- [ ] กด notification → mark as read + navigate ไปหน้าที่เกี่ยวข้อง
- [ ] กด "อ่านทั้งหมด" → unread count = 0

### 7.2 Staff Notifications (Tab B)
- [ ] เห็น notifications จาก: new incident, new appointment, stock alert
- [ ] Real-time: เมื่อ student แจ้งเหตุ → notification ขึ้นทันที (ไม่ต้อง refresh)

---

## FLOW 8: Reports & Statistics
**ทดสอบ: Staff tab**

### 8.1 Dashboard Overview
- [ ] แสดงสถิติวันนี้: incidents, visits, low stock, appointments
- [ ] ตัวเลขตรงกับข้อมูลจริง (นับจากที่ทดสอบมา)

### 8.2 Incident Report
- [ ] ไปหน้า รายงานและสถิติ
- [ ] เลือกช่วงวันที่ → แสดงกราฟ
- [ ] กราฟแท่ง: จำนวนเหตุตามประเภท
- [ ] กราฟแท่ง: จำนวนเหตุตามความรุนแรง
- [ ] เวลาตอบสนองเฉลี่ย
- [ ] จุดเกิดเหตุบ่อย (top locations)

### 8.3 Visit Report
- [ ] แสดงจำนวน visits ตาม visit_type
- [ ] Top 10 ยาที่จ่ายมากสุด

### 8.4 Export PDF
- [ ] กดปุ่ม Export PDF
- [ ] ได้ไฟล์ PDF → เปิดดูข้อมูลถูกต้อง

---

## FLOW 9: Settings (Admin)
**ทดสอบ: Login ด้วย Admin account**

### 9.1 System Settings
- [ ] ไปหน้า ตั้งค่า → ตั้งค่าระบบ
- [ ] เห็น settings ทั้งหมด (infirmary lat/lng, alert thresholds)
- [ ] แก้ไข เบอร์โทรห้องพยาบาล → save สำเร็จ
- [ ] Refresh หน้า → ค่าที่แก้ยังอยู่

### 9.2 User Management
- [ ] ไปหน้า จัดการผู้ใช้งาน
- [ ] แสดงรายชื่อ users ทั้งหมด (search + filter by role)
- [ ] สร้าง staff user ใหม่
- [ ] Deactivate user → user นั้น login ไม่ได้
- [ ] Activate user → login ได้ปกติ

### 9.3 Emergency Contacts
- [ ] ดูสมุดโทรศัพท์ฉุกเฉิน
- [ ] เพิ่มหน่วยงานใหม่
- [ ] แก้ไข เบอร์โทร → save สำเร็จ

### 9.4 Data Backup
- [ ] กด สำรองข้อมูล → สร้าง backup สำเร็จ
- [ ] แสดงประวัติ backups (filename, size, status, วันที่)

---

## FLOW 10: PWA & Mobile
**ทดสอบ: เปิด Chrome DevTools → Toggle Device Toolbar (Ctrl+Shift+M)**

### 10.1 Responsive Design
- [ ] iPhone SE (375px) → layout ไม่เพี้ยน
- [ ] iPhone 14 (390px) → layout ถูกต้อง
- [ ] iPad (768px) → layout ถูกต้อง
- [ ] Desktop (1920px) → layout ถูกต้อง

### 10.2 Student Portal (Mobile)
- [ ] Bottom navigation แสดงถูกต้อง
- [ ] ปุ่มฉุกเฉิน ใหญ่ กดง่าย
- [ ] ทุกหน้า scroll ได้ปกติ
- [ ] ไม่มี horizontal scroll

### 10.3 Staff Portal (Tablet/Desktop)
- [ ] Sidebar navigation ทำงานถูกต้อง
- [ ] ตาราง responsive (scroll horizontal ถ้าจอเล็ก)
- [ ] แผนที่ แสดงถูกต้อง + zoom ได้

### 10.4 PWA Install
- [ ] เปิด Chrome → แถบ URL มีไอคอน install app
- [ ] กด install → ได้ app บน desktop/home screen
- [ ] เปิดจาก icon → ทำงานเหมือน native app

---

## FLOW 11: Edge Cases & Error Handling

### 11.1 Network Issues
- [ ] ปิด backend → frontend แสดง error message สวยงาม (ไม่ใช่หน้าว่าง)
- [ ] เปิด backend กลับ → frontend reconnect ได้

### 11.2 Empty States
- [ ] ไม่มี incidents → แสดง "ไม่มีเหตุการณ์" (ไม่ใช่หน้าว่าง)
- [ ] ไม่มี visits → แสดง empty state
- [ ] ไม่มี medicines → แสดง empty state
- [ ] ไม่มี appointments → แสดง empty state
- [ ] ไม่มี notifications → แสดง "ไม่มีการแจ้งเตือน"

### 11.3 Validation
- [ ] สร้าง visit ไม่กรอก required fields → แสดง error ที่ field
- [ ] จ่ายยาเกิน stock → แสดง error
- [ ] จองนัดหมายซ้ำ slot เต็ม → แสดง error

### 11.4 Permission
- [ ] Student พิมพ์ URL /staff/dashboard → redirect ไป login หรือ 403
- [ ] Staff พิมพ์ URL /staff/settings/users (admin only) → redirect หรือซ่อนเมนู

---

## Summary

| Flow | Tests | Passed | Failed |
|------|-------|--------|--------|
| 1. Registration & Login | 16 | | |
| 2. Emergency Report | 14 | | |
| 3. Patient Visit | 14 | | |
| 4. Emergency → Visit | 5 | | |
| 5. Medicine Inventory | 12 | | |
| 6. Appointments | 12 | | |
| 7. Notifications | 6 | | |
| 8. Reports | 7 | | |
| 9. Settings (Admin) | 11 | | |
| 10. PWA & Mobile | 10 | | |
| 11. Edge Cases | 10 | | |
| **TOTAL** | **~117** | | |

## Bugs Found

| # | Flow | Description | Severity | Status |
|---|------|-------------|----------|--------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
