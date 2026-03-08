# Claude Code Prompt — Fix All Frontend Bugs
# ปัญหา: ข้อมูลไม่แสดง/หน้าว่าง + กดปุ่มไม่ทำงาน/API error


# =============================================
# PROMPT: สแกนและแก้ไข bug ทั้งระบบ
# =============================================

ระบบมี bug 2 ประเภท ช่วยสแกนและแก้ไขทั้งหมด:

## ปัญหาที่ 1: ข้อมูลไม่แสดง / หน้าว่าง

ตรวจสอบทุกหน้าเหล่านี้ว่า fetch data มาแสดงได้ถูกต้อง:

### ตรวจสอบสาเหตุพบบ่อย:
1. **API URL ผิด** — ตรวจสอบว่า fetch ใช้ URL ถูก endpoint เช่น `${API_URL}/incidents` ไม่ใช่ `/incident` (ขาด s) หรือ path ผิด
2. **ไม่ส่ง Authorization header** — ตรวจว่าทุก API call ส่ง Bearer token
3. **Token หมดอายุ ไม่ refresh** — ตรวจว่า lib/api.ts มี auto refresh เมื่อได้ 401
4. **Response format ไม่ตรง** — ตรวจว่า frontend อ่าน response ถูก field เช่น backend ส่ง `{ success: true, data: [...] }` แต่ frontend อ่าน `response.data` ตรงไหม
5. **CORS blocked** — เปิด browser console ดูว่ามี CORS error ไหม ตรวจ backend CORS config
6. **Loading state ค้าง** — ตรวจว่า loading state ถูก set เป็น false หลัง fetch เสร็จ (ทั้ง success และ error)
7. **Error ไม่ถูก catch** — ตรวจว่ามี try/catch และแสดง error message แทนหน้าว่าง

### ตรวจสอบทุกหน้า:
- [ ] /student/dashboard — แสดง ประวัติการใช้บริการ, การแจ้งเตือน
- [ ] /student/appointments — แสดง นัดหมายที่กำลังจะมาถึง, ประวัติ
- [ ] /student/profile — แสดง ข้อมูลส่วนตัว, ข้อมูลสุขภาพ
- [ ] /staff/dashboard — แสดง สถิติ, คิวผู้รอ, แจ้งเตือน, real-time feed
- [ ] /staff/emergency — แสดง list incidents ทุก tab (pending, in_progress, completed)
- [ ] /staff/emergency (map view) — แสดง แผนที่ Leaflet + markers
- [ ] /staff/patients — แสดง รายชื่อผู้ป่วย + search ทำงาน
- [ ] /staff/patients/:id — แสดง ข้อมูลผู้ป่วย + ประวัติ visits
- [ ] /staff/medicines — แสดง รายการยา + stock + alerts
- [ ] /staff/medicines/:id — แสดง batches + stock logs
- [ ] /staff/appointments — แสดง calendar/list นัดหมาย
- [ ] /staff/reports — แสดง กราฟ Recharts + สถิติ
- [ ] /staff/settings — แสดง settings, user list, emergency contacts

### วิธีแก้:
สำหรับแต่ละหน้าที่มีปัญหา:
1. เปิด browser DevTools → Network tab → ดูว่า API call ไปถูก URL ไหม
2. ดู Response tab → data กลับมาถูกไหม
3. ดู Console tab → มี error อะไร
4. ตรวจ code: component fetch data อย่างไร → map data อย่างไร → render อย่างไร
5. แก้ไขและทดสอบจนข้อมูลแสดงถูกต้อง


## ปัญหาที่ 2: กดปุ่มแล้วไม่ทำงาน / API error

ตรวจสอบทุก action button:

### ตรวจสอบสาเหตุพบบ่อย:
1. **onClick handler ไม่ได้ผูก** — ตรวจว่าปุ่มมี onClick หรือ onSubmit
2. **API method ผิด** — เช่น ใช้ GET แทน POST, ใช้ PUT แทน PATCH
3. **Request body format ผิด** — backend ต้องการ camelCase หรือ snake_case? ตรวจ DTO
4. **Missing required fields** — ตรวจว่า form ส่งครบทุก required field
5. **Path parameter ผิด** — เช่น `/incidents/${id}/status` ตรวจว่า id ไม่เป็น undefined
6. **Error ไม่ถูก handle** — กดแล้วไม่มีอะไรเกิดขึ้น เพราะ error ถูกกลืน
7. **State ไม่ update หลัง action** — เช่น กด accept แล้ว list ไม่ refresh

### ตรวจสอบทุกปุ่ม:
- [ ] ปุ่มฉุกเฉิน (student) — กด → เปิด form → submit → สร้าง incident
- [ ] ปุ่มรับเหตุ (staff) — กด → status เปลี่ยน + list refresh
- [ ] ปุ่มเปลี่ยนสถานะ incident — pending → accepted → in_progress → completed
- [ ] ปุ่มสร้าง visit — กรอก form → submit → สร้างสำเร็จ
- [ ] ปุ่มจ่ายยา — เลือกยา + จำนวน → submit → stock ลด + list refresh
- [ ] ปุ่มออกใบรับรอง — กรอก form → submit → ได้เลขที่
- [ ] ปุ่ม export PDF — กด → download file
- [ ] ปุ่มเพิ่มยา — กรอก form → submit
- [ ] ปุ่มเพิ่ม batch — กรอก form → submit → stock เพิ่ม
- [ ] ปุ่มจองนัด (student) — เลือก slot → submit
- [ ] ปุ่ม check-in / complete / cancel appointment
- [ ] ปุ่ม mark notification as read
- [ ] ปุ่ม save settings
- [ ] ปุ่ม deactivate/activate user
- [ ] ปุ่ม backup
- [ ] ปุ่ม login / register / logout

### วิธีแก้:
สำหรับแต่ละปุ่มที่มีปัญหา:
1. ตรวจ onClick/onSubmit handler ว่า function ถูกเรียก
2. ใส่ console.log ใน handler ดูว่าถูกเรียกไหม
3. ตรวจ API call: URL, method, headers, body
4. ตรวจ backend log: request เข้ามาไหม, error อะไร
5. ตรวจ response handling: success → update state + show message, error → show error
6. แก้ไขและทดสอบจนทุกปุ่มทำงาน


## ขั้นตอนการทำงาน:

1. **Start ทั้ง backend + frontend** ก่อน
2. **เปิดทุกหน้า** ตาม list ด้านบน ดูว่าหน้าไหนมีปัญหา
3. **ตรวจ backend logs** ว่ามี error อะไร
4. **ตรวจ browser console** ว่ามี error อะไร
5. **แก้ไขทีละจุด** — แก้ 1 bug → ทดสอบ → ผ่าน → ไป bug ถัดไป
6. **แก้จนครบทุกหน้า ทุกปุ่ม**

## สิ่งที่ต้องทำเพิ่มถ้าพบ:
- ถ้า Leaflet map ไม่แสดง → ตรวจว่า import CSS: `import 'leaflet/dist/leaflet.css'` และใช้ dynamic import (next/dynamic with ssr: false)
- ถ้า Recharts ไม่แสดง → ตรวจว่า data format ถูกต้อง + container มี width/height
- ถ้า WebSocket ไม่ connect → ตรวจ WS URL + auth token
- ถ้า PDF download ไม่ได้ → ตรวจว่า response type เป็น blob + สร้าง download link ถูกต้อง

## เมื่อแก้เสร็จ:
แสดงสรุปว่าแก้อะไรบ้าง ในรูปแบบ:
| # | หน้า/ปุ่ม | ปัญหา | สาเหตุ | วิธีแก้ |
