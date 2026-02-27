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

```bash
# Create database
psql -U realaids -c "CREATE DATABASE ruts_realaids;"

# Run migration
psql -U realaids -d ruts_realaids -f database/migration.sql

# Verify
psql -U realaids -d ruts_realaids -f database/verify.sql
```

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
