# Claude Code Prompt — Automated E2E Testing
# สั่ง Claude Code ให้สร้าง + รัน auto test ทั้งระบบ


# =============================================
# PROMPT: สร้าง Automated E2E Test ทั้งระบบ
# =============================================

สร้าง automated end-to-end test สำหรับโปรเจค ruts-realaids โดย:

## Setup
1. ติดตั้ง Playwright ใน root โปรเจค: `npm init playwright@latest`
2. สร้าง folder `e2e/` ที่ root
3. Config Playwright ให้:
   - baseURL: http://localhost:3000
   - webServer: start ทั้ง backend (port 4000) และ frontend (port 3000) อัตโนมัติก่อนรัน test
   - ใช้ chromium browser
   - screenshot on failure
   - video on failure

## Test Files — สร้างทั้งหมดนี้:

### e2e/setup/seed-data.ts
- สร้าง test data ผ่าน API ก่อนรัน test ทั้งหมด:
  - Register: admin, staff, student (3 users)
  - Login แต่ละ user เก็บ token
  - สร้าง medicines 5 รายการ + batches
  - สร้าง appointment slots
  - สร้าง treatment types (ถ้ายังไม่มี)
- export tokens + IDs ให้ test อื่นใช้

### e2e/auth.spec.ts (Flow 1: Registration & Login)
- test: เปิดหน้า login → แสดง 2 ตัวเลือก (นักศึกษา/บุคลากร)
- test: register student ใหม่ → สำเร็จ → redirect ไป login
- test: register ซ้ำ email → แสดง error
- test: login student สำเร็จ → redirect ไป /student/dashboard
- test: login staff สำเร็จ → redirect ไป /staff/dashboard
- test: login password ผิด → แสดง error message
- test: logout → กลับไปหน้า login
- test: ไม่มี token เข้า /student/dashboard → redirect ไป login

### e2e/emergency.spec.ts (Flow 2: Emergency Report)
- test: student เปิด dashboard → เห็นปุ่มฉุกเฉินสีแดง
- test: student กดปุ่มฉุกเฉิน → เปิด form แจ้งเหตุ
- test: student กรอกข้อมูล + submit → สร้างสำเร็จ → แสดงหน้าติดตามสถานะ
- test: staff เปิดหน้าจัดการเหตุฉุกเฉิน → เห็น incident ใหม่
- test: staff กด "รับเหตุ" → status เปลี่ยน
- test: staff กด "กำลังช่วยเหลือ" → status เปลี่ยน
- test: staff กด "เสร็จสิ้น" → status เปลี่ยน
- test: staff ดูบนแผนที่ → แสดง marker บน Leaflet map

### e2e/visits.spec.ts (Flow 3: Patient Visit)
- test: staff สร้าง visit ใหม่ → เลือกผู้ป่วย → กรอกอาการ
- test: staff เห็น visit ในคิวผู้รอ
- test: staff กรอก diagnosis + treatment → อัปเดตสำเร็จ
- test: staff จ่ายยา → เลือกยา + batch + จำนวน → stock ลดลง
- test: staff เปลี่ยน status → completed
- test: staff กดออกใบรับรอง → สร้างสำเร็จ + ได้เลขที่ CERT-

### e2e/medicines.spec.ts (Flow 5: Medicine Inventory)
- test: staff เปิดหน้าคลังยา → แสดงรายการ
- test: staff เพิ่มยาใหม่ → สำเร็จ
- test: staff เพิ่ม batch → stock เพิ่มขึ้น
- test: แสดง alert สต๊อกต่ำ (ถ้ามียาที่ stock ต่ำ)
- test: แสดง alert ใกล้หมดอายุ (ถ้ามี batch ใกล้หมดอายุ)

### e2e/appointments.spec.ts (Flow 6: Appointments)
- test: staff สร้าง slot → สำเร็จ
- test: student ดู slots ว่าง → แสดงรายการ
- test: student จองนัด → สำเร็จ → แสดงในรายการนัดหมาย
- test: staff เห็นนัดหมาย → check-in → complete
- test: student ยกเลิกนัด → ต้องกรอกเหตุผล → สำเร็จ

### e2e/notifications.spec.ts (Flow 7: Notifications)
- test: student เปิด notifications → แสดงรายการ
- test: student กด mark as read → unread count ลดลง
- test: student กด read all → unread count = 0

### e2e/reports.spec.ts (Flow 8: Reports)
- test: staff เปิด dashboard → แสดงสถิติ (ตัวเลขไม่ใช่ 0 หลังมี test data)
- test: staff เปิดรายงาน → แสดงกราฟ (Recharts render ได้)
- test: staff กด export PDF → ได้ไฟล์ download

### e2e/settings.spec.ts (Flow 9: Settings)
- test: admin เปิดตั้งค่าระบบ → แสดง settings
- test: admin แก้ไข setting → save สำเร็จ
- test: admin เปิดจัดการผู้ใช้ → แสดง list users
- test: admin deactivate user → สำเร็จ
- test: admin เปิดสมุดโทรศัพท์ฉุกเฉิน → แสดงรายการ
- test: staff (ไม่ใช่ admin) เข้าหน้า user management → ไม่แสดง หรือ redirect

### e2e/responsive.spec.ts (Flow 10: Responsive)
- test: เปิดหน้า student dashboard ขนาด 375px (iPhone SE) → ไม่มี horizontal scroll
- test: เปิดหน้า staff dashboard ขนาด 768px (iPad) → sidebar แสดงถูกต้อง
- test: เปิดหน้า staff dashboard ขนาด 1920px (Desktop) → layout ถูกต้อง

### e2e/security.spec.ts (Flow 11: Security)
- test: เข้า /student/dashboard โดยไม่ login → redirect ไป /login
- test: student เข้า /staff/dashboard → redirect หรือ 403
- test: staff เข้า /staff/settings/users (admin only) → redirect หรือซ่อน

## Running
4. รัน test ทั้งหมด: `npx playwright test`
5. ถ้า test fail → แก้ไข code (backend หรือ frontend) จนผ่าน
6. รัน test ซ้ำจนผ่านทั้งหมด
7. แสดงสรุปผล: passed/failed/total

## Important Notes
- Mock GPS location สำหรับ emergency report test (ใช้ Playwright geolocation permission)
- ใช้ page.waitForResponse() รอ API response ก่อน assert
- ใช้ page.waitForSelector() รอ element render
- จัดการ async operations ด้วย proper waits (ไม่ใช้ fixed timeout)
- ถ้า test เกี่ยวกับ WebSocket real-time ให้ใช้ 2 browser contexts (student + staff) ใน test เดียวกัน
- สร้าง test ให้รันได้ซ้ำ (idempotent) — ลบ test data ก่อนสร้างใหม่ หรือใช้ unique email ทุกรอบ
