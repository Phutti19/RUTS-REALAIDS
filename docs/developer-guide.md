# คู่มือการพัฒนาระบบ RUTS REALAIDS

## Developer Guide — Real-time Emergency Alert & First Aid Management System

**เวอร์ชัน**: 1.0
**ปรับปรุงล่าสุด**: มีนาคม 2569
**จัดทำสำหรับ**: ทีมพัฒนา มหาวิทยาลัยเทคโนโลยีราชมงคลศรีวิชัย

---

## สารบัญ

1. [ภาพรวมสถาปัตยกรรม](#1-ภาพรวมสถาปัตยกรรม)
2. [Technology Stack](#2-technology-stack)
3. [การติดตั้งสภาพแวดล้อมพัฒนา](#3-การติดตั้งสภาพแวดล้อมพัฒนา)
4. [โครงสร้างโปรเจค](#4-โครงสร้างโปรเจค)
5. [ฐานข้อมูล (Database)](#5-ฐานข้อมูล-database)
6. [Backend — NestJS API](#6-backend--nestjs-api)
   - 6.1 [Bootstrap & Middleware](#61-bootstrap--middleware)
   - 6.2 [Database Service](#62-database-service)
   - 6.3 [ระบบ Authentication](#63-ระบบ-authentication)
   - 6.4 [Guards & Decorators](#64-guards--decorators)
   - 6.5 [WebSocket Service](#65-websocket-service)
   - 6.6 [โครงสร้าง Module](#66-โครงสร้าง-module)
   - 6.7 [DTO & Validation](#67-dto--validation)
   - 6.8 [Error Handling](#68-error-handling)
   - 6.9 [Audit Log](#69-audit-log)
   - 6.10 [Cron Jobs](#610-cron-jobs)
7. [Frontend — Next.js App](#7-frontend--nextjs-app)
   - 7.1 [โครงสร้างหน้าเว็บ](#71-โครงสร้างหน้าเว็บ)
   - 7.2 [API Client](#72-api-client)
   - 7.3 [Authentication (Client-side)](#73-authentication-client-side)
   - 7.4 [WebSocket Client](#74-websocket-client)
   - 7.5 [Context Providers](#75-context-providers)
   - 7.6 [Custom Hooks](#76-custom-hooks)
   - 7.7 [Components ที่ใช้ร่วมกัน](#77-components-ที่ใช้ร่วมกัน)
   - 7.8 [Map Components](#78-map-components)
   - 7.9 [PWA & Service Worker](#79-pwa--service-worker)
   - 7.10 [Styling & Theming](#710-styling--theming)
   - 7.11 [TypeScript Types](#711-typescript-types)
8. [API Design & Response Format](#8-api-design--response-format)
9. [การ Deploy ระบบ (Docker)](#9-การ-deploy-ระบบ-docker)
10. [การทดสอบระบบ](#10-การทดสอบระบบ)
11. [แนวทางการเพิ่ม Feature ใหม่](#11-แนวทางการเพิ่ม-feature-ใหม่)
12. [ข้อควรระวังและ Best Practices](#12-ข้อควรระวังและ-best-practices)
13. [ภาคผนวก: Environment Variables](#13-ภาคผนวก-environment-variables)

---

## 1. ภาพรวมสถาปัตยกรรม

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Caddy Reverse Proxy                       │
│                 (SSL/TLS + Let's Encrypt)                    │
│              Port 4443 (HTTPS) / 4080 (HTTP)                 │
├──────────────┬────────────────────┬──────────────────────────┤
│              │                    │                          │
│   /api/*     │     /ws            │     /* (catch-all)       │
│              │                    │                          │
▼              ▼                    ▼                          │
┌──────────────────────────┐  ┌───────────────────────┐       │
│   Backend (NestJS 10)    │  │  Frontend (Next.js 16) │       │
│   Port 4000              │  │  Port 4002 (prod)      │       │
│                          │  │  Port 3000 (dev)       │       │
│  ┌─────────────────────┐ │  │                       │       │
│  │  REST API (/api/v1) │ │  │  ┌─────────────────┐ │       │
│  │  WebSocket (ws://)  │◄┼──┼──┤  API Client     │ │       │
│  │  Push Notification  │ │  │  │  WS Client      │ │       │
│  └────────┬────────────┘ │  │  │  Push Subscriber│ │       │
│           │              │  │  └─────────────────┘ │       │
│           ▼              │  └───────────────────────┘       │
│  ┌─────────────────────┐ │                                   │
│  │  PostgreSQL 16      │ │                                   │
│  │  26 Tables, 4 Views │ │                                   │
│  │  13 Enum Types      │ │                                   │
│  └─────────────────────┘ │                                   │
└──────────────────────────┘                                   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
นักศึกษาแจ้งเหตุ → Frontend → REST API → Database INSERT
                                       → WebSocket broadcast → เจ้าหน้าที่ทุกคน
                                       → Push Notification → เจ้าหน้าที่ที่ subscribe
```

---

## 2. Technology Stack

### Backend

| เทคโนโลยี | เวอร์ชัน | หน้าที่ |
|-----------|---------|--------|
| Node.js | 20.x | Runtime |
| NestJS | 10.x | Web Framework |
| TypeScript | 5.x | Language |
| pg | 8.x | PostgreSQL Driver (raw SQL) |
| ws | 8.x | WebSocket Server |
| jsonwebtoken | 9.x | JWT สร้าง/ตรวจสอบ Token |
| bcryptjs | 2.x | Hash รหัสผ่าน |
| pdfkit | 0.17.x | สร้าง PDF (ใบรับรองแพทย์/รายงาน) |
| web-push | 3.x | Push Notification (VAPID) |
| helmet | 7.x | Security Headers |
| morgan | 1.x | HTTP Request Logging |
| @nestjs/config | 3.x | Environment Configuration |
| @nestjs/schedule | 6.x | Cron Jobs |
| @nestjs/throttler | 5.x | Rate Limiting |
| cookie-parser | 1.x | Parse httpOnly Cookies |
| compression | 1.x | Gzip Compression |

### Frontend

| เทคโนโลยี | เวอร์ชัน | หน้าที่ |
|-----------|---------|--------|
| Next.js | 16.x | React Framework (App Router) |
| React | 19.x | UI Library |
| TypeScript | 5.x | Language |
| Tailwind CSS | 4.x | Utility-first CSS |
| Radix UI | latest | Headless UI Components |
| Lucide React | latest | Icon Library |
| Recharts | 3.x | Charts & Graphs |
| Leaflet + react-leaflet | 1.9 / 5.x | Interactive Maps |
| Jose | 6.x | JWT Decode (client-side) |
| clsx + tailwind-merge | latest | CSS Class Helpers |

### Database

| เทคโนโลยี | เวอร์ชัน | หน้าที่ |
|-----------|---------|--------|
| PostgreSQL | 16+ | Relational Database |

### Infrastructure

| เทคโนโลยี | หน้าที่ |
|-----------|--------|
| Docker + Docker Compose | Containerization |
| Caddy | Reverse Proxy + Auto SSL |
| DuckDNS | Dynamic DNS |

> **สำคัญ**: ระบบใช้ **raw SQL queries** ด้วย `pg` library เท่านั้น — ไม่ใช้ ORM (TypeORM, Prisma, Drizzle)

---

## 3. การติดตั้งสภาพแวดล้อมพัฒนา

### Prerequisites

- **Node.js 20.x** — [https://nodejs.org/](https://nodejs.org/)
- **PostgreSQL 16+** — [https://www.postgresql.org/](https://www.postgresql.org/)
- **Git** — [https://git-scm.com/](https://git-scm.com/)
- **Docker** (สำหรับ production) — [https://www.docker.com/](https://www.docker.com/)

### ขั้นตอนการติดตั้ง

#### 1. Clone โปรเจค

```bash
git clone <repository-url>
cd ruts-realaids
```

#### 2. ตั้งค่าฐานข้อมูล

```bash
# สร้างฐานข้อมูล (ถ้ายังไม่มี)
psql -U postgres -c "CREATE USER realaids WITH PASSWORD 'realaids1234';"
psql -U postgres -c "CREATE DATABASE ruts_realaids OWNER realaids;"

# รัน migrations ตามลำดับ
psql -U realaids -d ruts_realaids -f database/migration.sql
psql -U realaids -d ruts_realaids -f database/migration_faculties.sql
psql -U realaids -d ruts_realaids -f database/add_patient_fields.sql

# ตรวจสอบว่าสร้างครบ
psql -U realaids -d ruts_realaids -f database/verify.sql
```

#### 3. ตั้งค่า Backend

```bash
cd backend
npm install
```

สร้างไฟล์ `backend/.env`:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=ruts_realaids
DATABASE_USER=realaids
DATABASE_PASSWORD=realaids1234

JWT_SECRET=your-random-secret-key-at-least-32-chars
JWT_REFRESH_SECRET=your-random-refresh-secret-key-at-least-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Push Notification (optional สำหรับ dev)
# VAPID_SUBJECT=mailto:your-email@example.com
# VAPID_PUBLIC_KEY=<generated-key>
# VAPID_PRIVATE_KEY=<generated-key>
```

เริ่มรัน Backend:

```bash
npm run start:dev    # development (auto-reload)
# หรือ
npm run build && npm start    # production
```

Backend จะรันที่ `http://localhost:4000`

#### 4. ตั้งค่า Frontend

```bash
cd frontend
npm install
```

สร้างไฟล์ `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:4000
NEXT_PUBLIC_MAP_CENTER_LAT=7.1907
NEXT_PUBLIC_MAP_CENTER_LNG=100.5930
# NEXT_PUBLIC_VAPID_PUBLIC_KEY=<same-as-backend-public-key>
```

เริ่มรัน Frontend:

```bash
npm run dev     # development (port 3000)
# หรือ
npm run build && npm start    # production
```

Frontend จะรันที่ `http://localhost:3000`

#### 5. Seed ข้อมูลทดสอบ (Optional)

```bash
# ต้องรัน Backend ก่อน
node database/seed-test-data.js
```

จะสร้าง:
- 1 admin, 2 staff, 3 students
- 10 medicines, 5 emergency incidents, 5 visits
- 4 appointment slots, 3 appointments

**บัญชีทดสอบ**:

| อีเมล | รหัสผ่าน | ประเภท |
|-------|---------|--------|
| admin@ruts.ac.th | Admin@1234 | admin |
| staff1@ruts.ac.th | Staff@1234 | staff |
| staff2@ruts.ac.th | Staff@1234 | staff |
ของนักศึกษา 3 คน จะเป็น เลขประจำตัวนักศึกษา (student_id) 
เช่น `66706000062`, รหัสผ่าน `66706000062` (ตรงกับ student_id) การใช้งานจริงรหัสดังกล่าวไม่ปลอดภัย — ควรเปลี่ยนรหัสผ่านหลังจากล็อกอินครั้งแรก

---

## 4. โครงสร้างโปรเจค

```
ruts-realaids/
│
├── backend/                          # NestJS 10 Backend API
│   ├── src/
│   │   ├── main.ts                   # ★ Server bootstrap, middleware stack
│   │   ├── app.module.ts             # ★ Root module (imports ทุก module)
│   │   ├── app.controller.ts         # Health check endpoint
│   │   │
│   │   ├── common/                   # ★ Shared infrastructure
│   │   │   ├── guards/
│   │   │   │   ├── auth.guard.ts     # JWT verification guard
│   │   │   │   └── roles.guard.ts    # Role-based access guard
│   │   │   ├── decorators/
│   │   │   │   ├── roles.decorator.ts       # @Roles('staff','admin')
│   │   │   │   └── current-user.decorator.ts # @CurrentUser()
│   │   │   ├── interceptors/
│   │   │   │   └── audit-log.interceptor.ts  # Auto audit logging
│   │   │   ├── filters/
│   │   │   │   └── http-exception.filter.ts  # Error response format
│   │   │   └── pipes/
│   │   │       └── validation.pipe.ts        # DTO validation
│   │   │
│   │   ├── database/                 # ★ PostgreSQL connection
│   │   │   ├── db.module.ts          # @Global database module
│   │   │   └── db.service.ts         # Query helpers, transactions, pagination
│   │   │
│   │   ├── websocket/                # ★ Real-time events
│   │   │   ├── ws.module.ts          # @Global WebSocket module
│   │   │   └── ws.service.ts         # WS server, broadcast helpers
│   │   │
│   │   └── modules/                  # ★ Feature modules (business logic)
│   │       ├── auth/                 # Login, register, JWT, password reset
│   │       ├── users/                # User CRUD, health profiles
│   │       ├── emergency/            # Incidents, responders, status logs
│   │       ├── visits/               # Patient visits, medications
│   │       ├── medicines/            # Medicines, batches, stock logs
│   │       ├── certificates/         # Medical certificates, PDF
│   │       ├── appointments/         # Slots, bookings, cron no-show
│   │       ├── notifications/        # Notifications, Web Push
│   │       ├── reports/              # Statistics, PDF export
│   │       └── settings/             # System config, backups, admin
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env                          # Environment variables
│   └── Dockerfile                    # Production Docker build
│
├── frontend/                         # Next.js 16 Frontend
│   ├── src/
│   │   ├── app/                      # ★ Pages (App Router)
│   │   │   ├── layout.tsx            # Root layout (providers, fonts, PWA)
│   │   │   ├── (auth)/              # Auth pages (login, register, etc.)
│   │   │   ├── student/             # Student portal pages
│   │   │   └── staff/               # Staff portal pages
│   │   │
│   │   ├── lib/                      # ★ Core utilities
│   │   │   ├── api.ts               # REST API client (auto token refresh)
│   │   │   ├── auth.ts              # JWT utilities (token storage)
│   │   │   ├── websocket.ts         # WebSocket singleton client
│   │   │   └── utils.ts             # Formatting, Thai locale helpers
│   │   │
│   │   ├── hooks/                    # ★ Custom React hooks
│   │   │   ├── useAuth.ts           # Authentication hook
│   │   │   ├── useWebSocket.ts      # WebSocket subscription hook
│   │   │   ├── usePushNotification.ts # Push notification hook
│   │   │   └── useFaculties.ts      # Faculty data hook
│   │   │
│   │   ├── contexts/                 # ★ React Context providers
│   │   │   ├── AuthContext.tsx       # Auth state (user, login, logout)
│   │   │   └── ThemeContext.tsx      # Theme state (light/dark)
│   │   │
│   │   ├── components/
│   │   │   ├── shared/              # ServiceWorker, OfflineBanner, ThemeToggle
│   │   │   └── maps/               # LocationPicker, EmergencyMap
│   │   │
│   │   └── types/
│   │       └── index.ts             # ★ TypeScript type definitions ทั้งหมด
│   │
│   ├── public/
│   │   ├── sw.js                    # Service Worker
│   │   ├── manifest.json            # PWA manifest
│   │   ├── offline.html             # Offline fallback page
│   │   └── icons/                   # PWA icons
│   │
│   ├── next.config.ts               # Next.js + React Compiler config
│   ├── postcss.config.mjs           # Tailwind CSS 4 PostCSS plugin
│   ├── package.json
│   ├── .env.local                   # Frontend env vars
│   └── Dockerfile                   # Production Docker build
│
├── database/                         # SQL files
│   ├── migration.sql                # Main schema (26 tables)
│   ├── migration_faculties.sql      # Faculties & departments + seed
│   ├── add_patient_fields.sql       # Extra patient/visit columns
│   ├── seed-test-data.js            # Test data seeder
│   ├── drop_all.sql                 # Rollback script
│   └── verify.sql                   # Verification queries
│
├── docs/                            # Documentation & tests
│   ├── test-api.js                  # API test suite (91 tests)
│   ├── test-security.js             # Security test suite
│   ├── test-websocket.js            # WebSocket test suite
│   ├── data-dictionary.md           # Data dictionary
│   ├── user-manual.md               # User manual (ภาษาไทย)
│   └── developer-guide.md           # THIS FILE
│
├── caddy/                           # Caddy reverse proxy (production)
│   ├── Dockerfile
│   └── Caddyfile
│
├── docker-compose.yml               # Production deployment
├── .env                             # Production environment
├── CLAUDE.md                        # Project context documentation
└── README.md
```

---

## 5. ฐานข้อมูล (Database)

### 5.1 ภาพรวม Schema

- **26 ตาราง** (Tables)
- **4 วิว** (Views)
- **13 Enum Types**
- ใช้ **UUID v4** เป็น Primary Key ทุกตาราง (`gen_random_uuid()`)
- ใช้ **TIMESTAMPTZ** ทุก timestamp (เวลา Asia/Bangkok)

### 5.2 ER Diagram (แผนผังความสัมพันธ์)

```
┌──────────┐     ┌─────────────────────┐     ┌───────────────────┐
│  users   │────<│ emergency_incidents  │────<│ incident_images   │
│          │     │                     │     └───────────────────┘
│          │     │                     │────<┌───────────────────────┐
│          │     └─────────────────────┘     │ incident_responders   │
│          │                                 └───────────────────────┘
│          │     ┌─────────────────────┐     ┌───────────────────────┐
│          │────<│ incident_status_logs│     │ incident_status_logs  │
│          │     └─────────────────────┘     └───────────────────────┘
│          │
│          │     ┌──────────────────┐     ┌─────────────────────┐
│          │────<│  patient_visits  │────<│  visit_medications  │
│          │     │                  │     └─────────────────────┘
│          │     │                  │────<┌──────────────────────┐
│          │     └──────────────────┘     │ medical_certificates │
│          │                              └──────────────────────┘
│          │
│          │     ┌──────────────┐     ┌───────────────────┐
│          │────<│  medicines   │────<│ medicine_batches   │
│          │     │              │     └───────────────────┘
│          │     │              │────<┌────────────────────┐
│          │     └──────────────┘     │ medicine_stock_logs│
│          │                          └────────────────────┘
│          │
│          │     ┌───────────────────┐     ┌──────────────┐
│          │────<│ appointment_slots │────<│ appointments  │
│          │     └───────────────────┘     └──────────────┘
│          │
│          │────<┌───────────────────────┐
│          │     │ student_health_profiles│ (1:1)
│          │     └───────────────────────┘
│          │────<┌────────────────┐
│          │     │ notifications  │
│          │     └────────────────┘
│          │────<┌───────────────────┐
│          │     │ push_subscriptions│
│          │     └───────────────────┘
│          │────<┌─────────────────┐
│          │     │ refresh_tokens  │
│          │     └─────────────────┘
│          │────<┌────────────────────────┐
│          │     │ password_reset_tokens  │
│          │     └────────────────────────┘
│          │────<┌─────────────────┐
│          │     │ login_attempts  │
│          │     └─────────────────┘
└──────────┘
               ┌──────────────┐     ┌──────────────┐
               │  faculties   │────<│ departments  │
               └──────────────┘     └──────────────┘

     ┌───────────────────┐  ┌──────────────┐  ┌────────────────┐
     │ system_settings   │  │  audit_logs  │  │  data_backups  │
     └───────────────────┘  └──────────────┘  └────────────────┘

     ┌─────────────────────────────┐
     │ emergency_contacts_directory│
     └─────────────────────────────┘

     ┌──────────────────┐
     │ treatment_types  │
     └──────────────────┘
```

### 5.3 Enum Types

```sql
-- ประเภทผู้ใช้
CREATE TYPE user_role AS ENUM ('student', 'staff', 'admin');

-- เหตุฉุกเฉิน
CREATE TYPE incident_type AS ENUM ('injury', 'illness', 'accident', 'fainting', 'other');
CREATE TYPE severity_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE incident_status AS ENUM ('pending', 'accepted', 'in_progress', 'completed', 'cancelled');

-- การเข้าพบ
CREATE TYPE visit_type AS ENUM ('walk_in', 'emergency', 'appointment', 'follow_up');
CREATE TYPE visit_status AS ENUM ('waiting', 'in_treatment', 'completed', 'referred');

-- ยา
CREATE TYPE medicine_category AS ENUM ('medicine', 'supply', 'equipment');
CREATE TYPE stock_action AS ENUM ('received', 'dispensed', 'expired', 'adjusted');

-- นัดหมาย
CREATE TYPE appointment_status AS ENUM ('scheduled', 'checked_in', 'completed', 'cancelled', 'no_show');

-- แจ้งเตือน
CREATE TYPE notification_type AS ENUM ('emergency', 'appointment', 'stock_alert', 'system', 'expiry_alert');

-- อื่นๆ
CREATE TYPE emergency_contact_category AS ENUM ('hospital', 'police', 'rescue', 'fire', 'other');
CREATE TYPE backup_type AS ENUM ('manual', 'auto');
CREATE TYPE backup_status AS ENUM ('in_progress', 'completed', 'failed');
```

### 5.4 ตารางสำคัญ — คอลัมน์ที่ต้องระวัง

> ⚠️ รายการนี้รวบรวมจากบั๊กที่เคยเจอจริง — **ต้องใช้ชื่อคอลัมน์ตามนี้เท่านั้น**

| ตาราง | คอลัมน์ที่ถูกต้อง | ❌ อย่าใช้ |
|-------|-------------------|-----------|
| `patient_visits` | `treatment` | ~~treatment_notes~~ |
| `patient_visits` | `completed_at` | ~~updated_at~~ |
| `appointments` | `appointment_date`, `appointment_time` | ~~date~~, ~~time~~ |
| `appointments` | `reason` (NOT NULL) | - |
| `incident_images` | `uploaded_at` | ~~created_at~~ |
| `incident_responders` | UNIQUE (`incident_id`, `responder_id`) | ~~UNIQUE (incident_id)~~ |
| `incident_status_logs` | `old_status` (NOT NULL) | ~~NULL allowed~~ |
| `medicine_stock_logs` | `note` (singular) | ~~notes~~ |
| `medicine_stock_logs` | `remaining_stock` (NOT NULL) | - |
| `medicine_stock_logs` | `performed_by` (NOT NULL) | - |
| `medicine_batches` | `received_by` (NOT NULL) | - |
| `visit_medications` | `dispensed_by` (NOT NULL) | - |
| `data_backups` | `file_size_bytes`, `performed_by` | ~~file_size~~, ~~created_by~~ |
| `medical_certificates` | `issued_by` (NOT NULL) | - |
| `v_medical_certificates` | `patient_name`, `issued_by_name` | ~~patient_first_name~~ |

### 5.5 Foreign Key Policies

```
ON DELETE RESTRICT  → ตารางข้อมูลหลัก (incidents, visits, medicines, ฯลฯ)
ON DELETE CASCADE   → ตารางที่ผูกกับ user (tokens, health profiles, notifications)
ON DELETE SET NULL  → ตาราง log/metadata (audit_logs, login_attempts, backups)
```

### 5.6 Polymorphic References (ไม่มี FK constraint)

```
medicine_stock_logs.reference_id → patient_visits.id (เมื่อ action='dispensed')

notifications.reference_type + reference_id:
  'incident'    → emergency_incidents.id
  'appointment' → appointments.id
  'visit'       → patient_visits.id
  'medicine'    → medicines.id
```

### 5.7 Views

```sql
-- ยาที่ใกล้หมดอายุ (30 วัน)
v_medicines_expiring_soon

-- ยาที่สต็อกต่ำกว่าเกณฑ์
v_medicines_low_stock

-- สถิติเหตุฉุกเฉินรายวัน
v_daily_incident_stats

-- ใบรับรองแพทย์ (JOIN users + certificates)
v_medical_certificates
  → คอลัมน์: patient_name, student_id, issued_by_name, issued_at
```

### 5.8 การเพิ่ม Migration ใหม่

```bash
# 1. สร้างไฟล์ SQL ใหม่
# ใช้ชื่อ: database/<description>.sql

# 2. ใช้ IF NOT EXISTS เพื่อให้รันซ้ำได้
ALTER TABLE users ADD COLUMN IF NOT EXISTS new_column VARCHAR(100);

# 3. สำหรับ Enum ใหม่
DO $$ BEGIN
  CREATE TYPE new_enum AS ENUM ('val1', 'val2');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

# 4. สำหรับ Seed data
INSERT INTO table (...) VALUES (...) ON CONFLICT (unique_col) DO NOTHING;

# 5. รัน migration
psql -U realaids -d ruts_realaids -f database/<description>.sql
```

---

## 6. Backend — NestJS API

### 6.1 Bootstrap & Middleware

**ไฟล์**: `backend/src/main.ts`

ลำดับการ initialize (สำคัญ):

```
1. Helmet          → Security headers
2. Compression     → Gzip response (ลดขนาด 50-70%)
3. Body parsers    → JSON/urlencoded limit 10MB
4. Cookie parser   → สำหรับ httpOnly refresh token cookie
5. Morgan          → HTTP request logging
6. CORS            → จาก CORS_ORIGIN env var
7. Global prefix   → /api/v1
8. ValidationPipe  → DTO validation (class-validator)
9. ExceptionFilter → Error response standardization
10. WebSocket      → Attach to HTTP server หลัง listen
```

**Rate Limiting** (Throttler):
- ทั่วไป: **20 requests/นาที** ต่อ IP
- Auth routes: **5 requests/นาที** ต่อ IP

### 6.2 Database Service

**ไฟล์**: `backend/src/database/db.service.ts`

DatabaseService เป็น `@Global` module — inject ได้จากทุก module โดยไม่ต้อง import

#### Methods หลัก

```typescript
// 1. Query ทั่วไป — ได้ QueryResult เต็ม
async query<T>(text: string, values?: any[]): Promise<QueryResult<T>>

// 2. ดึงแถวเดียว — ได้ T หรือ null
async queryOne<T>(text: string, values?: any[]): Promise<T | null>

// 3. ดึงหลายแถว — ได้ T[]
async queryMany<T>(text: string, values?: any[]): Promise<T[]>

// 4. Execute (INSERT/UPDATE/DELETE) — ได้จำนวนแถวที่ affected
async execute(text: string, values?: any[]): Promise<number>

// 5. Transaction — ACID กับ auto rollback
async transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T>

// 6. Pagination — นับ + ดึงข้อมูล + คำนวณหน้า
async queryPaginated<T>(
  countSql: string,
  dataSql: string,
  values: any[],
  options: { page: number; limit: number }
): Promise<PaginatedResult<T>>
```

#### ตัวอย่างการใช้งาน

```typescript
// ดึงข้อมูลเดียว
const user = await this.db.queryOne<UserRow>(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);
if (!user) throw new NotFoundException('User not found');

// ดึงหลายรายการ
const medicines = await this.db.queryMany<MedicineRow>(
  'SELECT * FROM medicines WHERE is_active = true ORDER BY name',
  []
);

// Insert
await this.db.execute(
  'INSERT INTO notifications (user_id, type, title, message) VALUES ($1, $2, $3, $4)',
  [userId, 'system', title, message]
);

// Transaction
const certificate = await this.db.transaction(async (client) => {
  // Lock เพื่อป้องกันเลขซ้ำ
  await client.query('LOCK TABLE medical_certificates IN SHARE ROW EXCLUSIVE MODE');

  // ดึงเลขล่าสุด
  const lastNum = await client.query('SELECT certificate_number FROM ...');

  // สร้างใบรับรอง
  const result = await client.query('INSERT INTO medical_certificates ...', [...]);
  return result.rows[0];
});

// Pagination
const result = await this.db.queryPaginated<IncidentRow>(
  'SELECT COUNT(*) FROM emergency_incidents WHERE status = $1',
  'SELECT * FROM emergency_incidents WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
  ['pending'],
  { page: dto.page, limit: dto.limit }
);
// result = { data: [...], total: 50, page: 1, limit: 20, totalPages: 3 }
```

#### Pool Configuration

```typescript
{
  max: 50,                    // Maximum connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 10000  // Timeout connecting after 10s
}
```

#### Date Type Override

```typescript
// PostgreSQL 'date' type → ส่งกลับเป็น "YYYY-MM-DD" string (ไม่ใช่ JS Date object)
types.setTypeParser(types.builtins.DATE, (val: string) => val);
```

### 6.3 ระบบ Authentication

**ไฟล์**: `backend/src/modules/auth/`

#### Login Flow

```
1. ตรวจสอบ Brute-force (5 ครั้งใน 15 นาที → lock)
2. ค้นหา user จาก email หรือ student_id
3. ตรวจสอบ is_active = true
4. เทียบรหัสผ่านด้วย bcryptjs.compare()
5. บันทึก login_attempts (สำเร็จ/ล้มเหลว)
6. สร้าง Access Token (JWT, 15 นาที)
7. สร้าง Refresh Token (UUID, hash ลง DB, 7 วัน)
8. Set refresh token เป็น httpOnly cookie
9. ส่งกลับ { accessToken, user }
```

#### Token Structure

```typescript
// JWT Access Token Payload
{
  sub: "user-uuid",        // User ID
  role: "student",         // user_role enum
  iat: 1710000000,         // Issued at (epoch)
  exp: 1710000900          // Expires at (15 min later)
}

// Refresh Token
// UUID stored as bcrypt hash in refresh_tokens table
// Sent via httpOnly, secure, sameSite cookie
```

#### Password Hashing

```typescript
// Hash (สำหรับ register/reset)
const hash = await bcrypt.hash(password, 12);  // salt rounds = 12

// Compare (สำหรับ login)
const match = await bcrypt.compare(inputPassword, storedHash);
```

### 6.4 Guards & Decorators

#### AuthGuard

```typescript
// ตรวจสอบ JWT จาก Authorization header
// Set req.user = { id: string, role: string }

@UseGuards(AuthGuard)
@Get('profile')
getProfile(@CurrentUser() user: RequestUser) { ... }
```

#### RolesGuard

```typescript
// ตรวจสอบ role จาก req.user.role
// ถ้าไม่มี @Roles() → อนุญาตทุก role ที่ authenticated

@UseGuards(AuthGuard, RolesGuard)
@Roles('staff', 'admin')
@Post()
createMedicine(@Body() dto: CreateMedicineDto) { ... }
```

#### @CurrentUser() Decorator

```typescript
// ดึง user ทั้งหมด
@CurrentUser() user: RequestUser
// user = { id: "uuid", role: "staff" }

// ดึงเฉพาะ field
@CurrentUser('id') userId: string
// userId = "uuid"
```

#### การใช้งานร่วมกัน (Pattern มาตรฐาน)

```typescript
@Controller('incidents')
@UseGuards(AuthGuard, RolesGuard)   // ← ใส่ทั้ง class
export class EmergencyController {

  @Get()                              // ← ไม่มี @Roles = ทุก role เข้าได้
  list(@CurrentUser() user: RequestUser) { ... }

  @Post(':id/accept')
  @Roles('staff', 'admin')           // ← เฉพาะ staff/admin
  accept(
    @Param('id') id: string,
    @CurrentUser('id') userId: string
  ) { ... }
}
```

### 6.5 WebSocket Service

**ไฟล์**: `backend/src/websocket/ws.service.ts`

#### การเชื่อมต่อ

```
Client connects: ws://localhost:4000?token=<JWT_ACCESS_TOKEN>
→ Server verifies JWT signature
→ Extracts userId, role from token
→ Stores connection in Map<connectionId, WsClient>
→ One user can have multiple connections (หลาย tab)
```

#### Heartbeat

```
ทุก 30 วินาที: Server → ping → Client
                Client → pong → Server
ถ้าไม่มี pong → terminate connection
```

#### Events & Broadcast Methods

```typescript
// ★ Constants
const WS_EVENTS = {
  INCIDENT_NEW: 'incident:new',
  INCIDENT_STATUS_UPDATE: 'incident:status_update',
  INCIDENT_ACCEPTED: 'incident:accepted',
  QUEUE_UPDATE: 'queue:update',
  NOTIFICATION_NEW: 'notification:new',
  STOCK_ALERT: 'stock:alert',
  APPOINTMENT_UPDATE: 'appointment:update',
};

// ★ Broadcast methods
sendToUser(userId, event, data)       // → ส่งถึง user คนเดียว (ทุก tab)
broadcastToStaff(event, data)         // → ส่งถึง staff/admin ทุกคน
broadcastToAll(event, data)           // → ส่งถึงทุกคน

// ★ Domain-specific helpers (ใช้ใน service)
notifyNewIncident(incident)           // → broadcastToStaff + sendToUser(reporter)
notifyIncidentStatusUpdate(incident)  // → broadcastToStaff + sendToUser(reporter)
notifyIncidentAccepted(incident, responder) // → sendToUser(reporter)
notifyQueueUpdate()                   // → broadcastToStaff
notifyStockAlert(medicine)            // → broadcastToStaff
```

#### การใช้งานใน Service

```typescript
@Injectable()
export class EmergencyService {
  constructor(
    private readonly db: DatabaseService,
    private readonly wsService: WsService,      // ← inject WsService
    private readonly notificationsService: NotificationsService,
  ) {}

  async createIncident(dto, reporterId) {
    // 1. INSERT ลง DB
    const incident = await this.db.queryOne<IncidentRow>(...);

    // 2. Broadcast ผ่าน WebSocket (fire-and-forget)
    this.wsService.notifyNewIncident(formattedIncident);

    // 3. สร้าง notification + push
    await this.notificationsService.notifyAllStaff(
      'emergency', 'เหตุฉุกเฉินใหม่', message, 'incident', incident.id
    );

    return formattedIncident;
  }
}
```

### 6.6 โครงสร้าง Module

ทุก feature module มีโครงสร้างเดียวกัน:

```
modules/
└── [module-name]/
    ├── [name].module.ts           # NestJS Module definition
    ├── [name].controller.ts       # Route handlers
    ├── [name].service.ts          # Business logic + SQL queries
    ├── dto/                       # Request validation DTOs
    │   ├── create-[name].dto.ts
    │   ├── update-[name].dto.ts
    │   └── list-[name].dto.ts     # Query params (page, limit, filters)
    └── interfaces/
        └── [name].interfaces.ts   # DB row types + API response types
```

#### Module (ตัวอย่าง)

```typescript
// medicines.module.ts
@Module({
  controllers: [MedicinesController],
  providers: [MedicinesService],
  exports: [MedicinesService],      // ← export ถ้า module อื่นต้องใช้
})
export class MedicinesModule {}
```

#### Controller Pattern

```typescript
// medicines.controller.ts
@Controller('medicines')
@UseGuards(AuthGuard, RolesGuard)
export class MedicinesController {
  constructor(private readonly medicinesService: MedicinesService) {}

  @Get()
  async list(@Query() dto: ListMedicinesDto) {
    return this.medicinesService.list(dto);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.medicinesService.getById(id);
  }

  @Post()
  @Roles('staff', 'admin')
  async create(
    @Body() dto: CreateMedicineDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.medicinesService.create(dto, userId);
  }

  @Patch(':id')
  @Roles('staff', 'admin')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMedicineDto,
  ) {
    return this.medicinesService.update(id, dto);
  }
}
```

#### Service Pattern

```typescript
// medicines.service.ts
@Injectable()
export class MedicinesService {
  private readonly logger = new Logger(MedicinesService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly wsService: WsService,
  ) {}

  // ★ List with pagination
  async list(dto: ListMedicinesDto) {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.search) {
      conditions.push(`(name ILIKE $${paramIndex} OR generic_name ILIKE $${paramIndex})`);
      values.push(`%${dto.search}%`);
      paramIndex++;
    }

    if (dto.category) {
      conditions.push(`category = $${paramIndex}`);
      values.push(dto.category);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) FROM medicines ${where}`;
    const dataSql = `SELECT * FROM medicines ${where} ORDER BY name LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

    return this.db.queryPaginated<MedicineRow>(countSql, dataSql, values, {
      page: dto.page,
      limit: dto.limit,
    });
  }

  // ★ Format DB row → API response (snake_case → camelCase)
  private formatMedicine(row: MedicineRow): Medicine {
    return {
      id: row.id,
      name: row.name,
      genericName: row.generic_name,
      category: row.category,
      unit: row.unit,
      stockQuantity: row.stock_quantity,
      minStockLevel: row.min_stock_level,
      isLowStock: row.stock_quantity <= (row.min_stock_level || 0),
      description: row.description,
      location: row.location,
      isActive: row.is_active,
      createdAt: row.created_at,
    };
  }
}
```

### 6.7 DTO & Validation

**ใช้ `class-validator` + `class-transformer`**

```typescript
// dto/create-medicine.dto.ts
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsInt, Min, MaxLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateMedicineDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  genericName?: string;

  @IsEnum(['medicine', 'supply', 'equipment'])
  category: string;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minStockLevel?: number;
}
```

```typescript
// dto/list-medicine.dto.ts (query params)
export class ListMedicinesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['medicine', 'supply', 'equipment'])
  category?: string;
}
```

**Decorators ที่ใช้บ่อย**:

| Decorator | ใช้สำหรับ |
|-----------|----------|
| `@IsString()` | ต้องเป็น string |
| `@IsNotEmpty()` | ห้ามว่าง |
| `@IsOptional()` | ไม่บังคับ |
| `@IsEnum([...])` | ต้องอยู่ในค่าที่กำหนด |
| `@IsEmail()` | ต้องเป็น email |
| `@IsUUID()` | ต้องเป็น UUID |
| `@IsInt()`, `@IsNumber()` | ต้องเป็นตัวเลข |
| `@IsDateString()` | ต้องเป็นวันที่ (ISO string) |
| `@IsBoolean()` | ต้องเป็น boolean |
| `@IsArray()` | ต้องเป็น array |
| `@MinLength(n)`, `@MaxLength(n)` | ความยาว string |
| `@Min(n)`, `@Max(n)` | ค่าต่ำสุด/สูงสุดของตัวเลข |
| `@Transform()` | แปลงค่า (เช่น trim, lowercase) |
| `@Type(() => Number)` | แปลง type (สำหรับ query params) |

### 6.8 Error Handling

**ไฟล์**: `backend/src/common/filters/http-exception.filter.ts`

#### Response Format (ทุก error)

```json
{
  "success": false,
  "error": "NOT_FOUND",
  "message": "ไม่พบข้อมูลที่ร้องขอ",
  "timestamp": "2025-03-23T10:30:00.000Z",
  "path": "/api/v1/incidents/invalid-id",
  "errors": []
}
```

#### Error Codes

| HTTP Status | Error Code | ใช้เมื่อ |
|------------|------------|----------|
| 400 | BAD_REQUEST | ข้อมูลไม่ถูกต้อง / validation error |
| 401 | UNAUTHORIZED | ไม่ได้ login / token หมดอายุ |
| 403 | FORBIDDEN | ไม่มีสิทธิ์เข้าถึง (role ไม่ตรง) |
| 404 | NOT_FOUND | ไม่พบข้อมูล |
| 409 | CONFLICT | ข้อมูลซ้ำ (เช่น email ซ้ำ) |
| 429 | TOO_MANY_REQUESTS | Rate limit exceeded |
| 500 | INTERNAL_SERVER_ERROR | Server error |

#### การ throw error ใน Service

```typescript
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

// ไม่พบข้อมูล
if (!medicine) throw new NotFoundException('ไม่พบข้อมูลยา');

// ข้อมูลไม่ถูกต้อง
if (quantity < 0) throw new BadRequestException('จำนวนต้องมากกว่า 0');

// ข้อมูลซ้ำ
if (existing) throw new ConflictException('ชื่อยานี้มีอยู่แล้ว');

// ไม่มีสิทธิ์
if (user.role !== 'admin') throw new ForbiddenException('ต้องเป็น admin เท่านั้น');
```

### 6.9 Audit Log

**ไฟล์**: `backend/src/common/interceptors/audit-log.interceptor.ts`

- ทำงานอัตโนมัติกับทุก **POST/PUT/PATCH/DELETE** request
- ข้ามคำสั่ง GET/HEAD/OPTIONS
- บันทึกลง `audit_logs` table:
  - `user_id` — ใครทำ
  - `action` — HTTP method (POST, PATCH, DELETE ฯลฯ)
  - `entity_type` — จาก URL path (เช่น "incidents", "medicines")
  - `entity_id` — จาก URL params (ถ้ามี)
  - `new_values` — JSON ของ request body
- **ไม่ block main flow** — ถ้า audit log ล้มเหลว จะ log error แต่ไม่กระทบ response

### 6.10 Cron Jobs

**ไฟล์**: `backend/src/modules/appointments/appointments.service.ts`

```typescript
@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timeZone: 'Asia/Bangkok' })
async handleAutoNoShow(): Promise<void> {
  // ทุกเที่ยงคืน: เปลี่ยนนัดที่สถานะ 'scheduled' + วันนัดผ่านไปแล้ว → 'no_show'
  await this.db.execute(`
    UPDATE appointments
    SET status = 'no_show'
    WHERE status = 'scheduled'
    AND appointment_date < CURRENT_DATE
  `);
}
```

---

## 7. Frontend — Next.js App

### 7.1 โครงสร้างหน้าเว็บ

#### Layout Hierarchy

```
layout.tsx (Root)
├── ThemeProvider
├── AuthProvider
├── ServiceWorkerRegister
├── OfflineBanner
│
├── (auth)/layout.tsx          → Gradient background
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── forgot-password/page.tsx
│   └── reset-password/page.tsx
│
├── student/layout.tsx         → Bottom Navigation (3 tabs)
│   ├── dashboard/page.tsx
│   ├── emergency/report/page.tsx
│   ├── emergency/track/[id]/page.tsx
│   ├── appointments/page.tsx
│   ├── history/page.tsx
│   ├── notifications/page.tsx
│   └── profile/page.tsx
│
└── staff/layout.tsx           → Sidebar + Top Bar
    ├── dashboard/page.tsx
    ├── emergency/page.tsx
    ├── patients/page.tsx
    ├── patients/new/page.tsx
    ├── patients/[id]/page.tsx
    ├── patients/[id]/certificate/page.tsx
    ├── medicines/page.tsx
    ├── medicines/new/page.tsx
    ├── medicines/[id]/page.tsx
    ├── appointments/page.tsx
    ├── appointments/slots/page.tsx
    ├── reports/page.tsx
    ├── notifications/page.tsx
    └── settings/page.tsx
```

#### Student Layout — Bottom Navigation

```typescript
// student/layout.tsx
// แถบเมนูด้านล่าง (mobile-first)
const navItems = [
  { href: '/student/dashboard', icon: Home, label: 'หน้าหลัก' },
  { href: '/student/appointments', icon: Calendar, label: 'นัดหมาย' },
  { href: '/student/profile', icon: User, label: 'โปรไฟล์' },
];
```

#### Staff Layout — Sidebar

```typescript
// staff/layout.tsx
// แถบเมนูด้านข้าง (collapsible)
const navItems = [
  { href: '/staff/dashboard', icon: LayoutDashboard, label: 'แดชบอร์ด' },
  { href: '/staff/emergency', icon: AlertTriangle, label: 'เหตุฉุกเฉิน' },
  { href: '/staff/patients', icon: Users, label: 'ผู้ป่วย' },
  { href: '/staff/medicines', icon: Pill, label: 'คลังยา' },
  { href: '/staff/appointments', icon: Calendar, label: 'นัดหมาย' },
  { href: '/staff/reports', icon: BarChart3, label: 'รายงาน' },
  { href: '/staff/settings', icon: Settings, label: 'ตั้งค่า' },
];
```

### 7.2 API Client

**ไฟล์**: `frontend/src/lib/api.ts`

```typescript
// ★ การใช้งาน
import { api, extractError } from '@/lib/api';

// GET
const res = await api.get<Medicine[]>('/medicines?page=1&limit=20');
if (res.success && res.data) {
  setMedicines(res.data);
}

// POST
const res = await api.post<Incident>('/incidents', {
  incidentType: 'injury',
  severity: 'high',
  latitude: 7.1907,
  longitude: 100.5930,
  description: 'นักศึกษาบาดเจ็บ',
});

// PATCH
const res = await api.patch<void>(`/incidents/${id}/status`, {
  status: 'in_progress',
  note: 'กำลังเดินทางไป',
});

// DELETE
const res = await api.delete<void>(`/medicines/${id}`);

// Error extraction
if (!res.success) {
  const errorMsg = extractError(res, 'เกิดข้อผิดพลาด');
  setError(errorMsg);
}

// File download
const response = await api.download(`/certificates/${id}/pdf`);
const blob = await response.blob();
```

#### Auto Token Refresh

```
Request → ตรวจสอบ token หมดอายุหรือยัง
  ├── ยังไม่หมด → ส่ง request พร้อม Authorization header
  └── หมดแล้ว → เรียก /auth/refresh → ได้ token ใหม่ → ส่ง request
       └── refresh ล้มเหลว → redirect ไป /login
```

- ป้องกัน race condition: ถ้ามีหลาย request พร้อมกัน จะ refresh แค่ครั้งเดียว
- `credentials: "include"` ทุก request เพื่อส่ง httpOnly cookie

### 7.3 Authentication (Client-side)

**ไฟล์**: `frontend/src/lib/auth.ts`

```typescript
// Token เก็บใน memory เท่านั้น (ไม่ใช่ localStorage)
let accessToken: string | null = null;

export function getAccessToken(): string | null
export function setAccessToken(token: string | null): void
export function clearAccessToken(): void

// Decode JWT (ไม่ verify signature — ไม่มี public key)
export function decodeToken(token: string): JwtPayload | null

// ตรวจสอบ token หมดอายุ (มี buffer 10 วินาที)
export function isTokenExpired(token: string): boolean

// ดึง user info จาก token (ถ้ายังไม่หมดอายุ)
export function getUserFromToken(token: string): JwtPayload | null
```

### 7.4 WebSocket Client

**ไฟล์**: `frontend/src/lib/websocket.ts`

```typescript
// Singleton instance
import { wsClient } from '@/lib/websocket';

// เชื่อมต่อ (เรียกหลัง login)
wsClient.connect();

// ตัดการเชื่อมต่อ (เรียกเมื่อ logout)
wsClient.disconnect();

// Subscribe to events
const unsubscribe = wsClient.on('incident:new', (data) => {
  console.log('New incident:', data);
});

// Unsubscribe
unsubscribe();

// ตรวจสอบสถานะ
wsClient.isConnected(); // boolean
```

**Auto-reconnect**: Exponential backoff (2s → 4s → 8s → ... → 30s max)

### 7.5 Context Providers

#### AuthContext

```typescript
// ★ contexts/AuthContext.tsx

// ใน layout.tsx:
<AuthProvider>
  {children}
</AuthProvider>

// ใน component:
import { useAuthContext } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, isLoading, isAuthenticated, login, logout, refreshUser } = useAuthContext();

  if (isLoading) return <Spinner />;
  if (!isAuthenticated) redirect('/login');

  return <div>Welcome, {user.firstName}</div>;
}
```

#### ThemeContext

```typescript
// ★ contexts/ThemeContext.tsx

// ใน component:
import { useTheme } from '@/contexts/ThemeContext';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  // theme = 'light' | 'dark'
  return <button onClick={toggleTheme}>{theme === 'dark' ? <Sun /> : <Moon />}</button>;
}
```

### 7.6 Custom Hooks

#### useWebSocket

```typescript
// ★ hooks/useWebSocket.ts
import { useWebSocket, useWebSocketEvents } from '@/hooks/useWebSocket';

// Single event
useWebSocket<Incident>('incident:new', (incident) => {
  setIncidents(prev => [incident, ...prev]);
});

// Multiple events
useWebSocketEvents([
  {
    event: 'incident:new',
    handler: (data) => { /* ... */ },
  },
  {
    event: 'incident:status_update',
    handler: (data) => { /* ... */ },
  },
]);
```

#### usePushNotification

```typescript
// ★ hooks/usePushNotification.ts
const {
  isSupported,   // browser รองรับ Push API หรือไม่
  permission,    // 'default' | 'granted' | 'denied'
  isSubscribed,  // subscribe อยู่หรือไม่
  isLoading,
  subscribe,     // () => Promise<boolean>
  unsubscribe,   // () => Promise<boolean>
} = usePushNotification();
```

#### useFaculties

```typescript
// ★ hooks/useFaculties.ts
const {
  facultyDepartments,  // Record<string, string[]> = { "คณะวิศวกรรมศาสตร์": ["สาขา..."] }
  loading,
} = useFaculties();
```

### 7.7 Components ที่ใช้ร่วมกัน

| Component | ไฟล์ | หน้าที่ |
|-----------|------|--------|
| `ServiceWorkerRegister` | `components/shared/ServiceWorkerRegister.tsx` | ลงทะเบียน SW, แสดง banner อัพเดทเวอร์ชัน |
| `OfflineBanner` | `components/shared/OfflineBanner.tsx` | แสดง banner เมื่อ offline |
| `ThemeToggle` | `components/shared/ThemeToggle.tsx` | ปุ่มสลับ Light/Dark mode |
| `InstallPrompt` | `components/shared/InstallPrompt.tsx` | Prompt ติดตั้ง PWA |

### 7.8 Map Components

#### LocationPicker (นักศึกษา — แจ้งเหตุ)

```typescript
// ★ components/maps/LocationPicker.tsx
import LocationPicker from '@/components/maps/LocationPicker';

<LocationPicker
  lat={7.1907}
  lng={100.5930}
  onChange={(lat, lng) => {
    setLatitude(lat);
    setLongitude(lng);
  }}
/>
```

- แสดงแผนที่พร้อมหมุดลากได้
- กดแผนที่เพื่อวางหมุด

#### EmergencyMap (เจ้าหน้าที่ — dashboard)

```typescript
// ★ components/maps/EmergencyMap.tsx
import dynamic from 'next/dynamic';

const EmergencyMap = dynamic(
  () => import('@/components/maps/EmergencyMap'),
  { ssr: false }  // ← สำคัญ! Leaflet ไม่รองรับ SSR
);

<EmergencyMap
  incidents={incidents}
  onSelectIncident={(incident) => setSelected(incident)}
  selectedId={selected?.id}
  infirmaryLat={7.1907}
  infirmaryLng={100.5930}
  infirmaryName="ห้องพยาบาล"
/>
```

- แสดงหมุดเหตุฉุกเฉินพร้อมสีตามความรุนแรง
- Popup แสดงรายละเอียดเมื่อกดหมุด
- หมุดกระพริบสำหรับเหตุ critical

> **⚠️ สำคัญ**: ใช้ `dynamic()` กับ `{ ssr: false }` เสมอสำหรับ Leaflet components เพราะ Leaflet ต้องใช้ `window` object

### 7.9 PWA & Service Worker

#### Service Worker (`public/sw.js`)

**Cache Strategy:**

| ประเภท | Strategy | คำอธิบาย |
|--------|----------|----------|
| Static assets | Cache-first | ใช้ cache ก่อน, fallback network |
| Navigation | Network-first | ใช้ network ก่อน, fallback offline.html |
| API requests | Network only | ไม่ cache (ข้อมูลต้องเป็นปัจจุบัน) |
| Cross-origin | Skip | ไม่ cache resources จาก domain อื่น |

**Push Notification Handling:**

```javascript
// sw.js
self.addEventListener('push', (event) => {
  const data = event.data?.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: data,
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // เปิดหน้าเว็บ หรือ focus tab ที่เปิดอยู่
  clients.openWindow(data.url || '/');
});
```

#### PWA Manifest (`public/manifest.json`)

```json
{
  "name": "RUTS REALAIDS",
  "short_name": "REALAIDS",
  "description": "ระบบแจ้งเหตุฉุกเฉินและบริหารจัดการห้องพยาบาล มทร.ศรีวิชัย",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#1a56db",
  "background_color": "#ffffff",
  "orientation": "portrait-primary",
  "lang": "th",
  "shortcuts": [
    { "name": "แจ้งเหตุฉุกเฉิน", "url": "/student/emergency/report" },
    { "name": "นัดหมาย", "url": "/student/appointments" }
  ]
}
```

### 7.10 Styling & Theming

#### Tailwind CSS 4 (PostCSS-first)

```javascript
// postcss.config.mjs — ไม่ต้องมี tailwind.config.ts
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

#### CSS Class Composition

```typescript
import { cn } from '@/lib/utils';

// cn() = clsx() + tailwind-merge() — รวม class และจัดการ conflict
<div className={cn(
  "rounded-xl p-4 transition-all",           // base
  isActive && "bg-blue-50 border-blue-200",  // conditional
  className                                   // props override
)} />
```

#### Dark Mode

```typescript
// ใช้ dark: prefix ของ Tailwind
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">

// Toggle ด้วย class 'dark' บน <html>
document.documentElement.classList.toggle('dark');
```

#### Fonts

```typescript
// layout.tsx — Google Fonts
const kanit = Kanit({ subsets: ['thai', 'latin'], weight: ['300', '400', '500', '600', '700'] });
const prompt = Prompt({ subsets: ['thai', 'latin'], weight: ['300', '400', '500'] });
```

### 7.11 TypeScript Types

**ไฟล์**: `frontend/src/types/index.ts`

**Pattern**: Types แยกตาม domain:

```typescript
// ★ Auth & User
type UserRole = 'student' | 'staff' | 'admin';
interface User { id, email, firstName, lastName, role, phone, ... }
interface HealthProfile { userId, bloodType, allergies, ... }

// ★ Emergency
type IncidentType = 'injury' | 'illness' | 'accident' | 'fainting' | 'other';
type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
type IncidentStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
interface Incident { id, reporterId, incidentType, severity, latitude, longitude, status, ... }
interface IncidentDetail extends Incident { reporter, responder, images }

// ★ Visits
type VisitType = 'walk_in' | 'emergency' | 'appointment' | 'follow_up';
type VisitStatus = 'waiting' | 'in_treatment' | 'completed' | 'referred';
interface VitalSigns { temperature?, bloodPressure?, heartRate?, ... }
interface Visit { id, patientId, staffId, chiefComplaint, diagnosis, vitalSigns, ... }

// ★ Medicines
type MedicineCategory = 'medicine' | 'supply' | 'equipment';
interface Medicine { id, name, genericName, category, unit, stockQuantity, ... }
interface MedicineBatch { id, medicineId, batchNumber, quantity, expiryDate, ... }

// ★ Appointments
type AppointmentStatus = 'scheduled' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';
interface AppointmentSlot { id, staffId, dayOfWeek, startTime, endTime, ... }
interface Appointment { id, patientId, appointmentDate, appointmentTime, reason, status, ... }

// ★ Notifications
type NotificationType = 'emergency' | 'appointment' | 'stock_alert' | 'system' | 'expiry_alert';
interface Notification { id, userId, type, title, message, isRead, ... }

// ★ Common
interface PaginatedResponse<T> { data: T[], total, page, limit, totalPages }
interface ApiResponse<T> { success, data?, error?, message?, ... }
```

---

## 8. API Design & Response Format

### 8.1 URL Pattern

```
GET    /api/v1/incidents              → list (paginated)
GET    /api/v1/incidents/:id          → get by ID
POST   /api/v1/incidents              → create
PATCH  /api/v1/incidents/:id          → update
DELETE /api/v1/incidents/:id          → delete
POST   /api/v1/incidents/:id/accept   → custom action
```

### 8.2 Query Parameters

```
?page=1&limit=20               → pagination
?status=pending&severity=high  → filtering
?sortBy=created_at&order=desc  → sorting
?search=keyword                → search
?from=2025-01-01&to=2025-01-31 → date range
```

### 8.3 Response Formats

**Success (single)**:
```json
{
  "success": true,
  "data": { "id": "uuid", "name": "..." },
  "message": "สร้างสำเร็จ"
}
```

**Success (list)**:
```json
{
  "success": true,
  "data": [{ "id": "..." }, { "id": "..." }],
  "total": 50,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

**Error**:
```json
{
  "success": false,
  "error": "NOT_FOUND",
  "message": "ไม่พบข้อมูลที่ร้องขอ",
  "timestamp": "2025-03-23T10:30:00.000Z",
  "path": "/api/v1/incidents/invalid-id"
}
```

**Validation Error**:
```json
{
  "success": false,
  "error": "BAD_REQUEST",
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "email must be an email" },
    { "field": "name", "message": "name should not be empty" }
  ]
}
```

---

## 9. การ Deploy ระบบ (Docker)

### 9.1 Architecture

```
Docker Compose
├── caddy          (Reverse Proxy + SSL)  → port 4443 (HTTPS), 4080 (HTTP)
├── backend        (NestJS API)           → port 4000 (internal)
└── frontend       (Next.js)              → port 4002 (internal)
```

### 9.2 Caddy Configuration

```
Caddy → /api/*    → backend:4000    (REST API)
      → /ws       → backend:4000    (WebSocket passthrough)
      → /*        → frontend:4002   (Next.js pages)

SSL: Let's Encrypt + DuckDNS DNS validation
Domain: ruts-realaids.duckdns.org
```

### 9.3 Deploy Steps

```bash
# 1. ตั้งค่า .env ที่ root
cp .env.example .env
# แก้ไขค่า JWT_SECRET, DATABASE_*, VAPID_*, DUCKDNS_TOKEN

# 2. Build & Run
docker-compose up -d --build

# 3. ตรวจสอบ
docker-compose ps
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f caddy

# 4. เข้าใช้งาน
# https://ruts-realaids.duckdns.org:4443
```

### 9.4 Docker Files

#### Backend Dockerfile (Multi-stage)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/main"]
```

#### Frontend Dockerfile (Multi-stage)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
EXPOSE 4002
CMD ["npm", "start"]
```

> **หมายเหตุ**: Frontend ต้องส่ง `NEXT_PUBLIC_*` env vars ตอน build time (ไม่ใช่ runtime)

### 9.5 docker-compose.yml

```yaml
services:
  caddy:
    build: ./caddy
    ports:
      - "4443:4443"
      - "4080:4080"
    environment:
      - DUCKDNS_TOKEN=${DUCKDNS_TOKEN}
    volumes:
      - ./caddy/Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - backend
      - frontend

  backend:
    build: ./backend
    expose:
      - "4000"
    environment:
      - DATABASE_HOST=${DATABASE_HOST}
      - DATABASE_PORT=${DATABASE_PORT}
      - DATABASE_NAME=${DATABASE_NAME}
      - DATABASE_USER=${DATABASE_USER}
      - DATABASE_PASSWORD=${DATABASE_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - PORT=4000
      - NODE_ENV=production
      - TZ=Asia/Bangkok
      # ... (ดู .env เต็มใน ภาคผนวก)

  frontend:
    build:
      context: ./frontend
      args:
        - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
        - NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
    expose:
      - "4002"
    environment:
      - PORT=4002
    depends_on:
      - backend

volumes:
  caddy_data:
  caddy_config:
```

---

## 10. การทดสอบระบบ

### 10.1 API Tests (91 tests)

```bash
# ต้องรัน backend ก่อน (localhost:4000)
node docs/test-api.js
```

**ครอบคลุม**:
- Auth (login, register, refresh, password reset)
- Users (CRUD, health profiles)
- Emergency (incidents, responders, status updates)
- Visits (create, update, medications)
- Certificates (create, PDF)
- Medicines (CRUD, batches, stock logs)
- Appointments (slots, bookings, check-in, cancel)
- Notifications (CRUD, push)
- Reports (statistics, PDF export)
- Settings (system, backups, admin)

### 10.2 Security Tests

```bash
node docs/test-security.js
```

**ครอบคลุม**:
- Protected routes (401 without token)
- Role enforcement (403 wrong role)
- Brute-force protection (lock after 5 attempts)
- Password hashing verification
- Token expiry & refresh
- SQL injection prevention
- CORS handling

### 10.3 WebSocket Tests

```bash
node docs/test-websocket.js
```

**ครอบคลุม**:
- Connection with JWT auth
- Real-time events (incident:new, status_update, accepted)
- Ping/pong heartbeat
- Reconnection behavior

### 10.4 การเขียน Test ใหม่

Pattern ที่ใช้ใน `test-api.js`:

```javascript
const state = {};  // shared state ระหว่าง tests

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}: ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function apiCall(method, endpoint, { body, token, expectedStatus = 200 } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`http://localhost:4000/api/v1${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  assert(res.status === expectedStatus, `Expected ${expectedStatus}, got ${res.status}`);
  return res.json();
}

// ตัวอย่าง test
await test('Login as admin', async () => {
  const data = await apiCall('POST', '/auth/login', {
    body: { email: 'admin@ruts.ac.th', password: 'Admin@1234' },
  });
  assert(data.success, 'Login should succeed');
  assert(data.data.accessToken, 'Should return access token');
  state.adminToken = data.data.accessToken;
});
```

---

## 11. แนวทางการเพิ่ม Feature ใหม่

### 11.1 เพิ่ม Backend Module ใหม่

**ตัวอย่าง: เพิ่มระบบ "แบบประเมินความเสี่ยง" (Risk Assessment)**

#### ขั้นตอนที่ 1: สร้าง Database Table

```sql
-- database/add_risk_assessments.sql
CREATE TABLE IF NOT EXISTS risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assessed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  risk_level severity_level NOT NULL,   -- ใช้ enum ที่มีอยู่
  assessment_data JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_risk_assessments_patient ON risk_assessments(patient_id);
```

#### ขั้นตอนที่ 2: สร้าง Module Structure

```bash
mkdir -p backend/src/modules/risk-assessments/dto
mkdir -p backend/src/modules/risk-assessments/interfaces
```

#### ขั้นตอนที่ 3: สร้าง Interface

```typescript
// backend/src/modules/risk-assessments/interfaces/risk-assessment.interfaces.ts

export interface RiskAssessmentRow {
  id: string;
  patient_id: string;
  assessed_by: string;
  risk_level: string;
  assessment_data: Record<string, any>;
  notes: string | null;
  created_at: Date;
}

export interface RiskAssessment {
  id: string;
  patientId: string;
  assessedBy: string;
  riskLevel: string;
  assessmentData: Record<string, any>;
  notes: string | null;
  createdAt: Date;
}
```

#### ขั้นตอนที่ 4: สร้าง DTO

```typescript
// backend/src/modules/risk-assessments/dto/create-risk-assessment.dto.ts
import { IsUUID, IsEnum, IsOptional, IsString, IsObject } from 'class-validator';

export class CreateRiskAssessmentDto {
  @IsUUID()
  patientId: string;

  @IsEnum(['low', 'medium', 'high', 'critical'])
  riskLevel: string;

  @IsObject()
  assessmentData: Record<string, any>;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

#### ขั้นตอนที่ 5: สร้าง Service

```typescript
// backend/src/modules/risk-assessments/risk-assessments.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/db.service';
import { RiskAssessmentRow, RiskAssessment } from './interfaces/risk-assessment.interfaces';
import { CreateRiskAssessmentDto } from './dto/create-risk-assessment.dto';

@Injectable()
export class RiskAssessmentsService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateRiskAssessmentDto, assessedBy: string): Promise<RiskAssessment> {
    const row = await this.db.queryOne<RiskAssessmentRow>(
      `INSERT INTO risk_assessments (patient_id, assessed_by, risk_level, assessment_data, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [dto.patientId, assessedBy, dto.riskLevel, JSON.stringify(dto.assessmentData), dto.notes],
    );
    return this.format(row!);
  }

  async getByPatient(patientId: string): Promise<RiskAssessment[]> {
    const rows = await this.db.queryMany<RiskAssessmentRow>(
      'SELECT * FROM risk_assessments WHERE patient_id = $1 ORDER BY created_at DESC',
      [patientId],
    );
    return rows.map(r => this.format(r));
  }

  private format(row: RiskAssessmentRow): RiskAssessment {
    return {
      id: row.id,
      patientId: row.patient_id,
      assessedBy: row.assessed_by,
      riskLevel: row.risk_level,
      assessmentData: row.assessment_data,
      notes: row.notes,
      createdAt: row.created_at,
    };
  }
}
```

#### ขั้นตอนที่ 6: สร้าง Controller

```typescript
// backend/src/modules/risk-assessments/risk-assessments.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RiskAssessmentsService } from './risk-assessments.service';
import { CreateRiskAssessmentDto } from './dto/create-risk-assessment.dto';

@Controller('risk-assessments')
@UseGuards(AuthGuard, RolesGuard)
export class RiskAssessmentsController {
  constructor(private readonly service: RiskAssessmentsService) {}

  @Post()
  @Roles('staff', 'admin')
  create(@Body() dto: CreateRiskAssessmentDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Get('patient/:patientId')
  getByPatient(@Param('patientId') patientId: string) {
    return this.service.getByPatient(patientId);
  }
}
```

#### ขั้นตอนที่ 7: สร้าง Module

```typescript
// backend/src/modules/risk-assessments/risk-assessments.module.ts
import { Module } from '@nestjs/common';
import { RiskAssessmentsController } from './risk-assessments.controller';
import { RiskAssessmentsService } from './risk-assessments.service';

@Module({
  controllers: [RiskAssessmentsController],
  providers: [RiskAssessmentsService],
  exports: [RiskAssessmentsService],
})
export class RiskAssessmentsModule {}
```

#### ขั้นตอนที่ 8: Register ใน App Module

```typescript
// backend/src/app.module.ts
import { RiskAssessmentsModule } from './modules/risk-assessments/risk-assessments.module';

@Module({
  imports: [
    // ... existing modules
    RiskAssessmentsModule,    // ← เพิ่มบรรทัดนี้
  ],
})
export class AppModule {}
```

### 11.2 เพิ่ม Frontend Page ใหม่

#### ขั้นตอนที่ 1: เพิ่ม Type Definition

```typescript
// frontend/src/types/index.ts — เพิ่มท้ายไฟล์
export interface RiskAssessment {
  id: string;
  patientId: string;
  assessedBy: string;
  riskLevel: SeverityLevel;
  assessmentData: Record<string, any>;
  notes: string | null;
  createdAt: string;
}
```

#### ขั้นตอนที่ 2: สร้าง Page

```typescript
// frontend/src/app/staff/patients/[id]/risk-assessment/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { api, extractError } from '@/lib/api';
import { useAuthContext } from '@/contexts/AuthContext';
import { RiskAssessment } from '@/types';
import { cn, formatDateTime, severityColor, severityLabel } from '@/lib/utils';

export default function RiskAssessmentPage() {
  const { id } = useParams();
  const { user } = useAuthContext();
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const res = await api.get<RiskAssessment[]>(`/risk-assessments/patient/${id}`);
    if (res.success && res.data) {
      setAssessments(res.data);
    } else {
      setError(extractError(res, 'เกิดข้อผิดพลาด'));
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="p-6 text-center">กำลังโหลด...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">แบบประเมินความเสี่ยง</h1>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      {assessments.map(a => (
        <div key={a.id} className={cn("p-4 rounded-xl border mb-3", severityColor(a.riskLevel))}>
          <p className="font-medium">{severityLabel(a.riskLevel)}</p>
          <p className="text-sm text-gray-500">{formatDateTime(a.createdAt)}</p>
          {a.notes && <p className="mt-2">{a.notes}</p>}
        </div>
      ))}
    </div>
  );
}
```

#### ขั้นตอนที่ 3: เพิ่มลิงก์ในหน้าผู้ป่วย (ถ้าต้องการ)

แก้ไขหน้า `/staff/patients/[id]/page.tsx` เพิ่มปุ่มหรือลิงก์ไปยังหน้าใหม่

### 11.3 เพิ่ม WebSocket Event ใหม่

#### Backend

```typescript
// 1. เพิ่ม event constant ใน ws.service.ts
const WS_EVENTS = {
  // ... existing events
  RISK_ALERT: 'risk:alert',
};

// 2. เพิ่ม broadcast method
notifyRiskAlert(assessment: RiskAssessment) {
  this.broadcastToStaff(WS_EVENTS.RISK_ALERT, assessment);
}

// 3. เรียกใช้ใน service
this.wsService.notifyRiskAlert(assessment);
```

#### Frontend

```typescript
// ใน component ที่ต้องการรับ event
import { useWebSocket } from '@/hooks/useWebSocket';

useWebSocket<RiskAssessment>('risk:alert', (assessment) => {
  // แสดง toast notification
  // อัพเดท state
  setAlerts(prev => [assessment, ...prev]);
});
```

---

## 12. ข้อควรระวังและ Best Practices

### 12.1 Database

| ✅ ทำ | ❌ อย่าทำ |
|------|----------|
| ใช้ parameterized queries (`$1, $2`) | ❌ String interpolation ใน SQL |
| ใช้ Transaction สำหรับ multi-step operations | ❌ หลาย queries แยกกันที่ต้อง atomic |
| ตรวจสอบ NOT NULL constraints ก่อน INSERT | ❌ INSERT โดยไม่ตรวจสอบค่าบังคับ |
| ใช้ `ON CONFLICT` สำหรับ upsert | ❌ SELECT ก่อนแล้ว INSERT/UPDATE |
| ใช้ `IF NOT EXISTS` ใน migrations | ❌ Migration ที่รันซ้ำแล้วพัง |

### 12.2 Backend

| ✅ ทำ | ❌ อย่าทำ |
|------|----------|
| แปลง snake_case → camelCase ใน response | ❌ ส่ง DB row ตรงๆ |
| Validate ทุก input ด้วย DTO | ❌ Trust user input |
| ใช้ NestJS exceptions (NotFoundException, etc.) | ❌ throw generic Error |
| Log สำคัญด้วย `this.logger` | ❌ console.log ใน production |
| Check role + ownership ก่อนให้ข้อมูล | ❌ ส่งข้อมูลโดยไม่ตรวจสิทธิ์ |
| WebSocket broadcast fire-and-forget | ❌ await WebSocket ใน main flow |

### 12.3 Frontend

| ✅ ทำ | ❌ อย่าทำ |
|------|----------|
| ใช้ `'use client'` directive เมื่อใช้ hooks | ❌ ลืม directive → runtime error |
| ใช้ `dynamic()` + `{ ssr: false }` สำหรับ Leaflet | ❌ Import Leaflet ตรงๆ |
| Type API response: `api.get<Medicine[]>(...)` | ❌ ใช้ `any` type |
| ใช้ `extractError()` สำหรับ error messages | ❌ แสดง raw error object |
| Cleanup subscriptions ใน useEffect return | ❌ Memory leak จาก unsubscribe |
| ใช้ `cn()` สำหรับ conditional classes | ❌ String concatenation ที่อ่านยาก |

### 12.4 Security

| ✅ ทำ | ❌ อย่าทำ |
|------|----------|
| Hash password ด้วย bcryptjs (salt 12) | ❌ เก็บ password เป็น plaintext |
| เก็บ Access Token ใน memory | ❌ เก็บใน localStorage |
| ใช้ httpOnly cookie สำหรับ Refresh Token | ❌ เก็บ Refresh Token ใน JS |
| Rate limiting บน auth routes | ❌ ไม่จำกัด login attempts |
| Validate/sanitize ทุก user input | ❌ Trust user input ใน SQL |
| ใช้ Helmet security headers | ❌ ไม่มี security headers |

### 12.5 Naming Conventions

| ประเภท | Convention | ตัวอย่าง |
|--------|-----------|----------|
| ชื่อไฟล์ | kebab-case | `risk-assessment.service.ts` |
| Class | PascalCase | `RiskAssessmentService` |
| Variable/Method | camelCase | `getRiskLevel()` |
| DB Column | snake_case | `risk_level` |
| API Field (response) | camelCase | `riskLevel` |
| Enum Value | snake_case | `'in_progress'` |
| CSS Class | kebab-case (Tailwind) | `bg-blue-500` |

---

## 13. ภาคผนวก: Environment Variables

### Backend (.env)

```env
# ========== Database ==========
DATABASE_HOST=localhost          # PostgreSQL host
DATABASE_PORT=5432               # PostgreSQL port
DATABASE_NAME=ruts_realaids      # Database name
DATABASE_USER=realaids           # Database user
DATABASE_PASSWORD=realaids1234   # Database password

# ========== JWT ==========
JWT_SECRET=<min-32-char-random>          # Access token signing key
JWT_REFRESH_SECRET=<min-32-char-random>  # Refresh token signing key
JWT_ACCESS_EXPIRY=15m                    # Access token expiry
JWT_REFRESH_EXPIRY=7d                    # Refresh token expiry

# ========== Server ==========
PORT=4000                        # Backend port
NODE_ENV=development             # development | production
CORS_ORIGIN=http://localhost:3000  # Allowed origins (comma-separated)
TZ=Asia/Bangkok                  # Timezone

# ========== Cookie (production) ==========
COOKIE_SECURE=true               # Set true for HTTPS

# ========== Push Notification (optional) ==========
VAPID_SUBJECT=mailto:admin@ruts.ac.th
VAPID_PUBLIC_KEY=<generated-base64-key>
VAPID_PRIVATE_KEY=<generated-base64-key>
```

### Frontend (.env.local)

```env
# ========== API ==========
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1  # Backend API URL
NEXT_PUBLIC_WS_URL=ws://localhost:4000            # WebSocket URL

# ========== Map ==========
NEXT_PUBLIC_MAP_CENTER_LAT=7.1907     # Default map center (RUTS)
NEXT_PUBLIC_MAP_CENTER_LNG=100.5930   # Default map center (RUTS)

# ========== Push Notification ==========
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<same-as-backend>
```

### Production (.env at root)

```env
# All backend env vars +
NEXT_PUBLIC_API_URL=https://your-domain:4443/api/v1
NEXT_PUBLIC_WS_URL=wss://your-domain:4443
DUCKDNS_TOKEN=<your-duckdns-token>
```

### สร้าง VAPID Keys

```bash
# ใช้ web-push CLI
npx web-push generate-vapid-keys
# Output:
# Public Key: BM...
# Private Key: ij...
```

---

## Quick Reference

### คำสั่งที่ใช้บ่อย

```bash
# ====== Development ======
cd backend && npm run start:dev       # Start backend (dev)
cd frontend && npm run dev            # Start frontend (dev)

# ====== Build ======
cd backend && npm run build           # Build backend
cd frontend && npm run build          # Build frontend

# ====== Testing ======
node docs/test-api.js                 # Run API tests (91 tests)
node docs/test-security.js            # Run security tests
node docs/test-websocket.js           # Run WebSocket tests

# ====== Database ======
psql -U realaids -d ruts_realaids     # Connect to DB
node database/seed-test-data.js       # Seed test data

# ====== Docker (Production) ======
docker-compose up -d --build          # Deploy
docker-compose down                   # Stop
docker-compose logs -f                # View logs

# ====== VAPID Keys ======
npx web-push generate-vapid-keys     # Generate push notification keys
```

### API Endpoints Reference

| Method | Endpoint | Auth | Roles |
|--------|----------|------|-------|
| POST | `/auth/login` | ❌ | - |
| POST | `/auth/register` | ❌ | - |
| POST | `/auth/refresh` | Cookie | - |
| POST | `/auth/logout` | ✅ | - |
| POST | `/auth/forgot-password` | ❌ | - |
| POST | `/auth/reset-password` | ❌ | - |
| GET | `/users/me` | ✅ | all |
| PATCH | `/users/me` | ✅ | all |
| GET/PUT | `/users/me/health-profile` | ✅ | student |
| GET/POST | `/incidents` | ✅ | all/student |
| GET | `/incidents/:id` | ✅ | all |
| POST | `/incidents/:id/accept` | ✅ | staff, admin |
| PATCH | `/incidents/:id/status` | ✅ | staff, admin |
| GET/POST | `/visits` | ✅ | staff, admin |
| GET | `/visits/:id` | ✅ | all |
| PATCH | `/visits/:id` | ✅ | staff, admin |
| POST | `/visits/:id/medications` | ✅ | staff, admin |
| GET/POST | `/certificates` | ✅ | staff, admin |
| GET | `/certificates/:id/pdf` | ✅ | all |
| GET/POST | `/medicines` | ✅ | staff, admin |
| GET/PATCH | `/medicines/:id` | ✅ | staff, admin |
| POST | `/medicines/:id/batches` | ✅ | staff, admin |
| GET | `/medicines/alerts/low-stock` | ✅ | staff, admin |
| GET | `/medicines/alerts/expiring` | ✅ | staff, admin |
| GET/POST | `/appointments` | ✅ | all |
| PATCH | `/appointments/:id` | ✅ | all |
| GET/POST | `/appointment-slots` | ✅ | staff, admin |
| GET/POST | `/notifications` | ✅ | all |
| PATCH | `/notifications/:id/read` | ✅ | all |
| POST | `/push-subscriptions` | ✅ | all |
| GET | `/reports/dashboard` | ✅ | staff, admin |
| GET | `/reports/incidents` | ✅ | staff, admin |
| GET | `/reports/visits` | ✅ | staff, admin |
| GET/PUT | `/settings` | ✅ | admin |
| GET | `/settings/infirmary` | ✅ | all |
| GET/POST | `/admin/users` | ✅ | admin |
| PATCH | `/admin/users/:id` | ✅ | admin |
| GET/POST | `/admin/backups` | ✅ | admin |
| GET/POST | `/admin/emergency-contacts` | ✅ | staff, admin |
| GET/POST | `/admin/treatment-types` | ✅ | staff, admin |
| GET/POST | `/admin/faculties` | ✅ | admin |
| GET | `/admin/audit-logs` | ✅ | admin |
| POST | `/admin/broadcast` | ✅ | admin |

---

> **จบคู่มือการพัฒนาระบบ RUTS REALAIDS**
>
> หากมีข้อสงสัยเพิ่มเติม สามารถศึกษาจาก:
> - `CLAUDE.md` — Project context ฉบับเต็ม
> - `docs/data-dictionary.md` — Data Dictionary (ทุกตาราง, คอลัมน์, enum)
> - `docs/test-api.js` — ดู API usage patterns จาก test cases
> - Source code ของแต่ละ module — ดู pattern จริงที่ใช้
