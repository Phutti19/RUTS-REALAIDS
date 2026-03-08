# Claude Code Prompt — Diagnose Data Flow (Database → Backend → Frontend)
# ปัญหา: ข้อมูลใน database มีพร้อมแสดง แต่หน้า web app ไม่แสดงข้อมูล
# ต้องหาว่า data หลุดตรงจุดไหน


# =============================================
# STEP 1: ตรวจสอบ Database มีข้อมูลจริงไหม
# =============================================

เชื่อมต่อ database ruts_realaids แล้วรัน SQL เหล่านี้ตรวจสอบว่ามีข้อมูลจริง:

```sql
-- ตรวจว่าแต่ละตารางมีข้อมูลกี่ rows
SELECT 'users' AS table_name, COUNT(*) AS rows FROM users
UNION ALL SELECT 'emergency_incidents', COUNT(*) FROM emergency_incidents
UNION ALL SELECT 'patient_visits', COUNT(*) FROM patient_visits
UNION ALL SELECT 'medicines', COUNT(*) FROM medicines
UNION ALL SELECT 'medicine_batches', COUNT(*) FROM medicine_batches
UNION ALL SELECT 'appointments', COUNT(*) FROM appointments
UNION ALL SELECT 'appointment_slots', COUNT(*) FROM appointment_slots
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL SELECT 'treatment_types', COUNT(*) FROM treatment_types
UNION ALL SELECT 'system_settings', COUNT(*) FROM system_settings
UNION ALL SELECT 'emergency_contacts_directory', COUNT(*) FROM emergency_contacts_directory
ORDER BY table_name;
```

ถ้าตารางไหนมี 0 rows ให้สร้าง seed data ผ่าน API:
- Register users (admin, staff, student) ผ่าน POST /api/v1/auth/register
- Login เก็บ tokens
- สร้าง medicines + batches ผ่าน API
- สร้าง incidents ผ่าน API (ใช้ student token)
- สร้าง visits ผ่าน API (ใช้ staff token)
- สร้าง appointments ผ่าน API

แสดงผลว่าแต่ละตารางมีกี่ rows


# =============================================
# STEP 2: ตรวจสอบ Backend API ดึงข้อมูลได้ไหม
# =============================================

ใช้ curl หรือ fetch ทดสอบ API ทุก endpoint หลัก:

1. Login ก่อนเพื่อเอา token:
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ruts.ac.th","password":"Admin@1234"}'
```

2. ทดสอบทุก GET endpoint ด้วย token ที่ได้:
```bash
# ใส่ token ที่ได้จาก login
TOKEN="<paste-token>"

# Users
curl -s http://localhost:4000/api/v1/users/me -H "Authorization: Bearer $TOKEN" | head -200

# Incidents
curl -s "http://localhost:4000/api/v1/incidents?page=1&limit=10" -H "Authorization: Bearer $TOKEN" | head -200

# Visits
curl -s "http://localhost:4000/api/v1/visits?page=1&limit=10" -H "Authorization: Bearer $TOKEN" | head -200

# Medicines
curl -s "http://localhost:4000/api/v1/medicines?page=1&limit=10" -H "Authorization: Bearer $TOKEN" | head -200

# Appointments
curl -s "http://localhost:4000/api/v1/appointments?page=1&limit=10" -H "Authorization: Bearer $TOKEN" | head -200

# Notifications
curl -s "http://localhost:4000/api/v1/notifications?page=1&limit=20" -H "Authorization: Bearer $TOKEN" | head -200

# Reports Dashboard
curl -s http://localhost:4000/api/v1/reports/dashboard -H "Authorization: Bearer $TOKEN" | head -200

# Settings
curl -s http://localhost:4000/api/v1/settings -H "Authorization: Bearer $TOKEN" | head -200

# Emergency Contacts
curl -s http://localhost:4000/api/v1/emergency-contacts -H "Authorization: Bearer $TOKEN" | head -200

# Low Stock
curl -s http://localhost:4000/api/v1/medicines/alerts/low-stock -H "Authorization: Bearer $TOKEN" | head -200

# Queue
curl -s http://localhost:4000/api/v1/visits/queue -H "Authorization: Bearer $TOKEN" | head -200
```

สำหรับแต่ละ endpoint ให้ตรวจสอบ:
- Response status code (200? 401? 404? 500?)
- Response body format: `{ success: true/false, data: ... }` หรือ format อื่น?
- data เป็น array หรือ object?
- data มีข้อมูลจริงไหม หรือ empty array?
- ถ้า 500 → ดู backend terminal log ว่า error อะไร → แก้ไข backend

แสดงผลลัพธ์ทุก endpoint: status code + จำนวน data items + response format


# =============================================
# STEP 3: ตรวจสอบ Frontend อ่าน Response ถูกไหม
# =============================================

ตรวจสอบทุกหน้าใน frontend ว่าอ่าน API response ตรง format กับ backend:

### 3.1 ตรวจ lib/api.ts (API Client)
ดูว่า fetch wrapper:
- Base URL ตรงกับ backend (`http://localhost:4000/api/v1`)
- ส่ง Authorization header ทุก request
- Handle 401 → refresh token → retry
- Return data ในรูปแบบไหน? (`response.json()` ทั้งก้อน? หรือ `response.json().data`?)

### 3.2 ตรวจ Response Format Mismatch
นี่คือสาเหตุ #1 ที่พบบ่อยที่สุด!

ตรวจว่า backend ส่ง format ไหน:
```
แบบ A: { success: true, data: [...], total: 10, page: 1 }
แบบ B: { data: [...], meta: { total: 10 } }
แบบ C: [...] (ส่ง array ตรงๆ)
แบบ D: { items: [...], count: 10 }
```

แล้วตรวจว่า frontend แต่ละหน้าอ่านอย่างไร:
```typescript
// ตัวอย่าง: frontend อาจอ่าน
const data = response.data        // ✅ ถ้า backend ส่งแบบ A
const data = response.data.data   // ❌ ซ้อนกัน 2 ชั้น
const data = response              // ❌ ถ้า backend ส่งแบบ A จะได้ทั้ง object
```

### 3.3 ตรวจทุกหน้าที่ fetch data
สำหรับแต่ละหน้า ให้ตรวจ:

**หน้า Student Dashboard:**
- ไฟล์ไหน fetch data?
- เรียก API endpoint อะไร?
- อ่าน response อย่างไร?
- set state อย่างไร?
- render data อย่างไร?
- ถ้าไม่ตรง → แก้ไข

**หน้า Staff Dashboard:**
- เหมือนกัน ตรวจทุกจุด

**หน้า Emergency:**
- เหมือนกัน ตรวจทุกจุด

**หน้า Patients:**
- เหมือนกัน ตรวจทุกจุด

**หน้า Medicines:**
- เหมือนกัน ตรวจทุกจุด

**หน้า Appointments:**
- เหมือนกัน ตรวจทุกจุด

**หน้า Reports:**
- เหมือนกัน ตรวจทุกจุด

**หน้า Settings:**
- เหมือนกัน ตรวจทุกจุด


# =============================================
# STEP 4: ตรวจสอบ Common Bugs แล้วแก้ไข
# =============================================

ตรวจสอบปัญหาเหล่านี้ ถ้าพบให้แก้ไขทันที:

### 4.1 API Base URL
```typescript
// ตรวจว่า .env.local ของ frontend มี:
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1

// ตรวจว่า lib/api.ts ใช้:
const BASE_URL = process.env.NEXT_PUBLIC_API_URL
// ไม่ใช่ hardcode ผิด port หรือ path
```

### 4.2 CORS
```typescript
// ตรวจ backend main.ts ว่า enable CORS:
app.enableCors({
  origin: 'http://localhost:3000',
  credentials: true,
});
```

### 4.3 Token Storage
```typescript
// ตรวจว่า token ถูกเก็บ + ส่งถูกต้อง
// ถ้าเก็บใน memory → refresh หน้าแล้วหลุด
// ถ้าเก็บใน cookie → ตรวจว่า cookie ถูก set
```

### 4.4 Leaflet Map (ถ้าไม่แสดง)
```typescript
// ต้อง dynamic import + ssr: false
import dynamic from 'next/dynamic'
const Map = dynamic(() => import('./Map'), { ssr: false })

// ต้อง import CSS
import 'leaflet/dist/leaflet.css'
```

### 4.5 Recharts (ถ้ากราฟไม่แสดง)
```typescript
// ต้องมี ResponsiveContainer ครอบ + กำหนด width/height
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={data}>...</BarChart>
</ResponsiveContainer>

// data ต้องเป็น array ไม่ใช่ undefined
```

### 4.6 Date/Time Format
```typescript
// backend ส่ง ISO string: "2025-03-01T10:30:00.000Z"
// frontend ต้อง parse ถูก:
new Date(dateString).toLocaleDateString('th-TH')
// ไม่ใช่แสดง raw string
```


# =============================================
# STEP 5: แก้ไขทั้งหมดแล้วทดสอบ
# =============================================

1. แก้ไขทุก bug ที่พบจาก Step 1-4
2. Restart backend + frontend
3. เปิดทุกหน้าตรวจสอบว่าข้อมูลแสดงถูกต้อง
4. ทดสอบทุกปุ่มว่าทำงาน
5. แสดงสรุปสิ่งที่แก้:

| # | จุดที่หลุด | ปัญหา | สาเหตุ | วิธีแก้ |
|---|-----------|--------|--------|---------|
| 1 | DB → API | | | |
| 2 | API → Frontend | | | |
| 3 | Frontend render | | | |
