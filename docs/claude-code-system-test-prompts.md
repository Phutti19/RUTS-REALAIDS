# Claude Code Prompt — Full System Test & Fix

# =============================================
# PROMPT 1: ตรวจสอบ + Fix ก่อนเริ่มทดสอบ
# =============================================

ช่วยตรวจสอบระบบก่อนเริ่มทดสอบ:

1. ตรวจสอบ backend start ได้ไหม (`npm run start:dev`) — ถ้ามี error ให้แก้
2. ตรวจสอบ frontend start ได้ไหม (`npm run dev`) — ถ้ามี error ให้แก้
3. ตรวจสอบ database connection — .env ถูกต้อง, user มีสิทธิ์
4. ตรวจสอบว่า seed data มีครบ (system_settings, treatment_types, emergency_contacts_directory)
5. ตรวจสอบว่าทุก API endpoint ที่อยู่ใน controller ถูก register ใน module ถูกต้อง
6. ตรวจสอบว่า frontend API base URL ตรงกับ backend port
7. ตรวจสอบ CORS setting ว่า frontend origin ถูก allow
8. ตรวจสอบ WebSocket connection ระหว่าง frontend กับ backend
9. ถ้าพบปัญหาให้แก้ไขทันที


# =============================================
# PROMPT 2: สร้าง Test Data
# =============================================

สร้าง seed script สำหรับข้อมูลทดสอบ:

1. สร้างไฟล์ database/seed-test-data.sql
2. ใส่ข้อมูลทดสอบ:
   - 1 admin user (admin@ruts.ac.th / Admin@1234)
   - 2 staff users (nurse1@ruts.ac.th, nurse2@ruts.ac.th / Nurse@1234)
   - 3 student users (student1@ruts.ac.th, student2@ruts.ac.th, student3@ruts.ac.th / Student@1234)
   - student health profiles สำหรับทุก student
   - 10 medicines พร้อม batches (มี 2 ตัวที่ stock ต่ำ, 1 ตัวที่ใกล้หมดอายุ)
   - 5 emergency incidents (หลากหลาย status: pending, accepted, in_progress, completed)
   - 5 patient visits (หลากหลาย status)
   - 3 appointments (scheduled, completed, cancelled)
   - appointment slots สำหรับ staff
   - notifications สำหรับ users
   - password ต้อง hash ด้วย bcrypt ก่อน insert
3. สร้างเป็น Node.js script ที่เรียก API register + login แล้วสร้างข้อมูลผ่าน API (เพื่อให้ business logic ทำงานถูกต้อง)
4. รัน script และตรวจสอบว่าข้อมูลถูกสร้างครบ


# =============================================
# PROMPT 3: ทดสอบ Frontend ทุกหน้า
# =============================================

ช่วยตรวจสอบ frontend ทุกหน้าว่าทำงานได้ไม่มี error:

1. ทดสอบทุก route ที่มีใน app/ ว่า:
   - หน้า render ได้ไม่มี build error
   - เรียก API ถูก endpoint
   - ส่ง Authorization header
   - จัดการ loading state
   - จัดการ error state
   - จัดการ empty state

2. ตรวจสอบ flow เหล่านี้ทำงานได้:
   - Login → redirect ไปหน้าที่ถูกตาม role
   - Student: กดปุ่มฉุกเฉิน → แจ้งเหตุ → ติดตามสถานะ
   - Staff: เห็น incident ใหม่ → รับเหตุ → เปลี่ยนสถานะ
   - Staff: สร้าง visit → จ่ายยา → เสร็จสิ้น → ออกใบรับรอง
   - Student: จองนัดหมาย → ดูนัดของตัวเอง

3. ตรวจสอบ components:
   - แผนที่ Leaflet แสดงได้
   - กราฟ Recharts แสดงได้
   - WebSocket connected (ดูจาก console log)

4. ถ้าพบ bug ให้แก้ไขทันที + แจ้งว่าแก้อะไรบ้าง


# =============================================
# PROMPT 4: ทดสอบ Security
# =============================================

ช่วยทดสอบ security ของระบบ:

1. ทดสอบว่า route ที่ต้อง login → ไม่มี token ได้ 401
2. ทดสอบว่า staff-only route → student token ได้ 403
3. ทดสอบว่า admin-only route → staff token ได้ 403
4. ทดสอบว่า frontend ป้องกัน route ตาม role (middleware.ts)
5. ทดสอบว่า login ผิด 5 ครั้ง → ถูก lock
6. ทดสอบว่า SQL injection ไม่ทำงาน (ลองส่ง ' OR 1=1 ใน field ต่างๆ)
7. ตรวจสอบว่า password ถูก hash (ไม่เก็บ plaintext ใน database)
8. ตรวจสอบว่า token expired ถูก handle (401 → refresh → retry)
9. ถ้าพบช่องโหว่ให้แก้ไขทันที


# =============================================
# PROMPT 5: ทดสอบ WebSocket Real-time
# =============================================

ช่วยทดสอบ WebSocket ของระบบ:

1. สร้าง test script ที่:
   - เปิด WebSocket connection 2 ตัว (student + staff)
   - Authenticate ทั้ง 2 connections
   - Student สร้าง incident ผ่าน API
   - ตรวจสอบว่า staff connection ได้รับ event "incident:new"
   - Staff accept incident ผ่าน API
   - ตรวจสอบว่า student connection ได้รับ event "incident:accepted"
   - Staff เปลี่ยนสถานะเป็น completed
   - ตรวจสอบว่า student ได้รับ event "incident:status_update"

2. ทดสอบ reconnection:
   - Disconnect WebSocket → reconnect อัตโนมัติ

3. ถ้าพบปัญหาให้แก้ไขทันที


# =============================================
# PROMPT 6: Fix All Bugs
# =============================================

ช่วยแก้ไข bugs ทั้งหมดที่พบจากการทดสอบ:

[วาง list bugs ที่พบจาก checklist ตรงนี้]

แก้ไขทุก bug แล้วทดสอบซ้ำจนผ่านทั้งหมด
