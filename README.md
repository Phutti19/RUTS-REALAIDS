# RUTS-REALAIDS

**Real-time Emergency Alert & First Aid Management System**

ระบบแจ้งเหตุและจัดการการปฐมพยาบาลแบบเรียลไทม์ — มหาวิทยาลัยเทคโนโลยีราชมงคลศรีวิชัย

## Features

- 🚨 Real-time emergency reporting with GPS location
- 🗺️ Map view with incident tracking (Leaflet + OpenStreetMap)
- 📱 PWA — works on iOS/Android as web app
- 🏥 Patient visit management & medical certificates
- 💊 Medicine inventory with batch tracking & expiry alerts
- 📅 Appointment booking system
- 📊 Reports & statistics dashboard
- 🔔 Push notifications (WebSocket + Web Push)
- 🔒 JWT authentication with role-based access

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Radix UI |
| Backend | Nest.js 4, Node.js 20, TypeScript, ws (WebSocket) |
| Database | PostgreSQL 16 |
| Maps | Leaflet + OpenStreetMap |
| Charts | Recharts |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- npm or yarn

### 1. Clone & Install

```bash
git clone <repo-url>
cd ruts-realaids

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Database Setup

โครงสร้างฐานข้อมูลในโปรเจกต์นี้คาดหวังให้ใช้ฐานข้อมูลชื่อ `ruts_realaids` และผู้ใช้ `realaids` ตามค่าเริ่มต้นในไฟล์ `.env` ของโปรเจกต์

```bash
# 1) สร้างผู้ใช้และฐานข้อมูล (ถ้ายังไม่มี)
psql -U postgres -c "CREATE USER realaids WITH PASSWORD 'realaids1234';"
psql -U postgres -c "CREATE DATABASE ruts_realaids OWNER realaids;"

# 2) สร้างโครงสร้างตารางและ enum ที่จำเป็น
psql -U realaids -d ruts_realaids -f database/schema.sql

# 3) ใช้ migration/seed เพิ่มเติมสำหรับ faculties, departments และคอลัมน์เสริม
psql -U realaids -d ruts_realaids -f database/migration.sql

# 4) ตรวจสอบสถานะฐานข้อมูล (ถ้าต้องการ)
psql -U realaids -d ruts_realaids -f database/verify.sql
```

> หมายเหตุ: หากคุณต้องการใช้ข้อมูลทดสอบเพิ่มเติม สามารถรันไฟล์ `database/seed-data.sql` หรือ `database/seed-test-data.js` ได้ตามลำดับที่ต้องการ

### 3. Environment Variables

```bash
cp .env.example .env
# Edit .env with your values
```

### 4. Run Development

```bash
# Backend (port 4000)
cd backend
npm run start:dev

# Frontend (port 3000)
cd frontend
npm run dev
```

## Project Structure

```
ruts-realaids/
├── frontend/          # Next.js 16 (App Router)
├── backend/           # Nest.js 4 API
├── database/          # SQL migration files
├── docs/              # Documentation
├── .env.example
├── CLAUDE.md          # AI coding assistant context
└── README.md
```

## License

Private — Rajamangala University of Technology Srivijaya
