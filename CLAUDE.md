# RUTS-REALAIDS

Real-time Emergency Alert & First Aid Management System for Rajamangala University of Technology Srivijaya (RUTS).

## Project Overview

A web application (PWA) for reporting emergencies and managing the university infirmary. Students report incidents via mobile with GPS location. Staff receive real-time alerts, manage patient visits, medicines, and generate reports.

## Tech Stack

### Frontend (`/frontend`)
- **Next.js 16.x** — App Router, Server Components
- **React 19.x**
- **TypeScript 5.x**
- **Tailwind CSS 4.x** — PostCSS plugin (no `tailwind.config.ts`, uses CSS-first config)
- **Radix UI** — Headless UI components (dialog, select, tabs, toast, tooltip, dropdown-menu, etc.)
- **Lucide React** — Icon library
- **Recharts 3.x** — Charts & graphs for dashboard
- **Leaflet 1.9.x + react-leaflet 5.x + OpenStreetMap** — Interactive maps (GPS incidents)
- **Jose 6.x** — JWT handling on client side
- **class-variance-authority + clsx + tailwind-merge** — Utility CSS class helpers
- **PWA** — Service Worker, Web Push Notifications

### Backend (`/backend`)
- **Node.js 20.x**
- **NestJS 10.x** (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`)
- **TypeScript 5.x**
- **ws 8.x** — WebSocket server for real-time updates
- **pg 8.x** — PostgreSQL driver (raw queries, NOT TypeORM/Prisma)
- **Helmet 7.x** — Security headers
- **Morgan 1.x** — HTTP request logging
- **jsonwebtoken 9.x** — JWT token auth on server side
- **bcryptjs 2.x** — Password hashing (bcryptjs, NOT native bcrypt)
- **@nestjs/config 3.x** — Environment configuration
- **@nestjs/schedule 6.x** — Cron jobs (e.g. appointment no-show)
- **cookie-parser 1.x** — Parse cookies (refresh token)
- **pdfkit 0.17.x** — PDF generation (certificates, reports)
- **web-push 3.x** — Web Push Notifications (VAPID)

### Database
- **PostgreSQL 16+** — Main database
- Database name: `ruts_realaids`
- Schema: `public`
- 26 tables, 4 views, 13 enum types
- Data Dictionary: [`docs/data-dictionary.md`](docs/data-dictionary.md)

### Infrastructure
- Timezone: `Asia/Bangkok`
- All timestamps use `TIMESTAMPTZ`
- All IDs use `UUID v4`

## Project Structure

```
ruts-realaids/
├── frontend/                    # Next.js 16 App
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/         # Auth pages (route group with layout)
│   │   │   │   ├── login/
│   │   │   │   ├── register/
│   │   │   │   ├── forgot-password/
│   │   │   │   └── reset-password/
│   │   │   ├── staff/          # Staff portal (with layout.tsx)
│   │   │   │   ├── dashboard/
│   │   │   │   ├── emergency/
│   │   │   │   ├── patients/        # list, [id], [id]/certificate, new
│   │   │   │   ├── medicines/       # list, [id], new
│   │   │   │   ├── appointments/    # list, slots/
│   │   │   │   ├── reports/
│   │   │   │   ├── settings/
│   │   │   │   └── notifications/
│   │   │   ├── student/        # Student portal (with layout.tsx)
│   │   │   │   ├── dashboard/
│   │   │   │   ├── emergency/       # report/, track/[id]/
│   │   │   │   ├── appointments/
│   │   │   │   ├── history/
│   │   │   │   ├── notifications/
│   │   │   │   └── profile/
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── maps/           # Leaflet map components
│   │   │   └── shared/         # Common components
│   │   ├── lib/
│   │   │   ├── api.ts          # API client (fetch wrapper)
│   │   │   ├── auth.ts         # JWT utilities (jose)
│   │   │   ├── websocket.ts    # WebSocket client
│   │   │   └── utils.ts
│   │   ├── hooks/              # useAuth, useWebSocket, usePushNotification, useFaculties
│   │   └── types/              # TypeScript type definitions (index.ts)
│   ├── public/
│   │   ├── manifest.json       # PWA manifest
│   │   ├── sw.js               # Service Worker
│   │   ├── offline.html        # Offline fallback page
│   │   └── icons/              # PWA icons
│   ├── next.config.ts
│   ├── postcss.config.mjs      # Tailwind CSS 4 PostCSS plugin
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                     # NestJS 10 API
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/           # Login, register, JWT, refresh, password reset
│   │   │   ├── users/          # User CRUD, health profiles
│   │   │   ├── emergency/      # Incidents, responders, status logs, images
│   │   │   ├── visits/         # Patient visits, visit medications
│   │   │   ├── medicines/      # Medicines, batches, stock logs
│   │   │   ├── certificates/   # Medical certificates, PDF generation
│   │   │   ├── appointments/   # Appointments, slots, cron (no-show)
│   │   │   ├── notifications/  # Notifications, push subscriptions
│   │   │   ├── reports/        # Reports, statistics, PDF export
│   │   │   └── settings/       # System settings, backups, admin users,
│   │   │                       #   emergency contacts, treatment types,
│   │   │                       #   faculties, audit logs, login attempts,
│   │   │                       #   broadcast notifications
│   │   ├── common/
│   │   │   ├── guards/         # AuthGuard, RolesGuard
│   │   │   ├── decorators/     # @Roles(), @CurrentUser()
│   │   │   ├── interceptors/   # AuditLog interceptor
│   │   │   ├── filters/        # HttpException filter
│   │   │   └── pipes/          # Validation pipe
│   │   ├── database/
│   │   │   ├── db.module.ts    # PostgreSQL connection (pg Pool)
│   │   │   └── db.service.ts   # Query helper methods
│   │   ├── websocket/
│   │   │   ├── ws.module.ts    # WebSocket module
│   │   │   └── ws.service.ts   # WebSocket server + broadcast helpers
│   │   ├── app.module.ts
│   │   ├── app.controller.ts   # Health check
│   │   ├── app.service.ts
│   │   └── main.ts
│   ├── tsconfig.json
│   └── package.json
│
├── database/                    # SQL files
│   ├── migration.sql            # Main schema
│   ├── migration_faculties.sql  # Faculties & departments tables + seed data
│   ├── add_patient_fields.sql   # Extra patient_visits columns migration
│   ├── seed-test-data.js        # Test data seeder (Node.js script)
│   ├── drop_all.sql             # Rollback script
│   └── verify.sql               # Verification script
│
├── docs/                        # Documentation
│   ├── data-dictionary.md       # Data Dictionary (all tables, views, enums)
│   ├── test-api.js              # API test script (91 tests)
│   ├── test-security.js         # Security test script
│   ├── test-websocket.js        # WebSocket test script
│   └── *.md                     # Various prompt/checklist docs
├── CLAUDE.md                    # THIS FILE
└── README.md
```

## User Roles

| Role | Description | Portal |
|------|-------------|--------|
| `student` | Students — report emergencies, book appointments, view profile | Student Portal |
| `staff` | Infirmary staff — manage incidents, patients, medicines | Staff Portal |
| `admin` | Same as staff but can manage users, settings, backups | Staff Portal (full) |

## Authentication Flow

1. User selects role type on login page (student / staff)
2. Login with email + password → returns `accessToken` (15min) + `refreshToken` (7days)
3. Access token stored in memory, refresh token in httpOnly cookie
4. JWT payload: `{ sub: user.id, role: user.role, iat, exp }`
5. All API routes require `Authorization: Bearer <accessToken>`
6. Role-based guards: `@Roles('staff', 'admin')` on staff-only routes
7. Failed login attempts tracked in `login_attempts` table (brute force protection)

## Database Schema (26 Tables)

### Users & Security (5 tables)
- `users` — id, student_id, email, password_hash, first_name, last_name, phone, role, avatar_url, is_active, last_login_at; extra profile fields: **national_id** (varchar 13), **title**, **birth_date**, **department**, **year_of_study** (smallint), **position**, **faculty** — student-specific: student_id/department/faculty/year_of_study; staff-specific: position
- `student_health_profiles` — user_id (1:1 UNIQUE), blood_type, allergies, chronic_diseases, **current_medications**, **emergency_contact_name** (NOT NULL), **emergency_contact_phone** (NOT NULL), **emergency_contact_relation**
- `refresh_tokens` — user_id, token_hash, **device_info**, expires_at, revoked_at
- `password_reset_tokens` — user_id, token_hash, expires_at, used_at
- `login_attempts` — user_id (nullable), email, ip_address, **user_agent**, success, failure_reason

### Emergency (5 tables)

- `emergency_incidents` — reporter_id, incident_type, severity, **description** (nullable text), latitude (NOT NULL), longitude (NOT NULL), location_name (nullable), status (pending→accepted→in_progress→completed), responded_at, resolved_at
- `incident_images` — incident_id, image_url, caption, sort_order (default 0), **uploaded_at** (NOT NULL, ไม่ใช่ created_at)
- `incident_responders` — incident_id, responder_id, accepted_at, arrived_at, **notes** (nullable) — unique constraint: **(incident_id, responder_id)**
- `incident_status_logs` — incident_id, changed_by, **old_status** (NOT NULL), new_status, note — ห้าม INSERT NULL สำหรับ old_status
- `emergency_contacts_directory` — name, category (hospital/police/rescue/fire/**other**), phone, phone_secondary, address, latitude, longitude, note, is_primary, is_active

### Infirmary (4 tables)
- `treatment_types` — name (wound care, medication, vital signs, etc.), **description** (nullable), is_active
- `patient_visits` — patient_id, staff_id, incident_id, visit_type, chief_complaint, diagnosis, **treatment** (nullable text, ไม่ใช่ treatment_notes), treatment_type_id (FK treatment_types), vital_signs (JSONB), status, referred_to, notes, visited_at, completed_at (ไม่ใช่ updated_at); extra fields: **illness_history**, **wound_care** (boolean NOT NULL default false), **rest_hours** (numeric 4,1), **consultation_types** (text[] NOT NULL default '{}'), **is_referred** (boolean NOT NULL default false)
- `visit_medications` — visit_id, medicine_id, batch_id, quantity, dosage_instruction, **dispensed_by** (NOT NULL)
- `medical_certificates` — visit_id, **issued_by** (NOT NULL FK users), certificate_number (auto CERT-YYYY-NNNNNN), diagnosis_text, rest_days, recommendation, rest_start_date, rest_end_date, **issued_at**

### Medicines (3 tables)
- `medicines` — name, generic_name, category (medicine/supply/equipment), unit (NOT NULL), description, stock_quantity (cached), min_stock_level, location, is_active
- `medicine_batches` — medicine_id, batch_number, quantity, expiry_date, **received_by** (NOT NULL), received_at (default now()), note
- `medicine_stock_logs` — medicine_id, batch_id, action (received/dispensed/expired/adjusted), quantity_change, **remaining_stock** (NOT NULL), **reference_id** (uuid nullable — polymorphic link to visit/etc), **performed_by** (NOT NULL), **note** (ไม่ใช่ notes)

### Appointments (2 tables)
- `appointment_slots` — staff_id, day_of_week (0-6), start_time, end_time, slot_duration_minutes, **max_patients_per_slot** (NOT NULL default 1), is_active
- `appointments` — patient_id, staff_id, slot_id, **appointment_date** (NOT NULL), **appointment_time** (NOT NULL), **reason** (NOT NULL), notes (nullable), status (scheduled/checked_in/completed/cancelled), cancel_reason

### Notifications (2 tables)
- `notifications` — user_id, type, title, message, reference_type, reference_id (polymorphic), is_read, **read_at**
- `push_subscriptions` — user_id, endpoint, p256dh_key, auth_key, **device_info**, **is_active** (Web Push API)

### Faculties & Departments (2 tables)

- `faculties` — name (UNIQUE), is_active, sort_order
- `departments` — faculty_id (FK faculties, ON DELETE CASCADE), name, is_active, sort_order — unique constraint: **(faculty_id, name)**

### System (3 tables)
- `system_settings` — key/value pairs (infirmary_lat/lng, alert thresholds, etc.)
- `audit_logs` — user_id, action, entity_type, entity_id, old_values, new_values (JSONB)
- `data_backups` — filename, backup_type, status, **file_size_bytes**, **performed_by** (ไม่ใช่ file_size / created_by), note, started_at, completed_at

### Polymorphic References (ไม่มี FK constraint — application layer enforce)

- `medicine_stock_logs.reference_id` → `patient_visits.id` เมื่อ action=`dispensed` จาก visit
- `notifications.reference_type` + `notifications.reference_id`:
  - `'incident'` → `emergency_incidents.id`
  - `'appointment'` → `appointments.id`
  - `'visit'` → `patient_visits.id`
  - `'medicine'` → `medicines.id`

### Helper Views
- `v_medicines_expiring_soon` — medicines expiring within 30 days (from batches)
- `v_medicines_low_stock` — medicines below min_stock_level
- `v_daily_incident_stats` — daily incident count, avg response time
- `v_medical_certificates` — columns: patient_name, student_id, issued_by_name, issued_at (ไม่มี patient_first_name/last_name แยก)

## Key Enum Values

```
user_role: student | staff | admin
incident_type: injury | illness | accident | fainting | other
severity_level: low | medium | high | critical
incident_status: pending | accepted | in_progress | completed | cancelled
visit_type: walk_in | emergency | appointment | follow_up
visit_status: waiting | in_treatment | completed | referred
medicine_category: medicine | supply | equipment
stock_action: received | dispensed | expired | adjusted
appointment_status: scheduled | checked_in | completed | cancelled | no_show
notification_type: emergency | appointment | stock_alert | system | expiry_alert
emergency_contact_category: hospital | police | rescue | fire | other
backup_type: manual | auto
backup_status: in_progress | completed | failed
```

## Frontend Pages

### Auth Pages (route group `(auth)`)

#### Login (`/login`)
- Choose user type: Student / Staff
- Email + password form
- Forgot password link

#### Register (`/register`)
- Student / Staff registration form

#### Forgot Password (`/forgot-password`)
- Email input → sends reset link

#### Reset Password (`/reset-password`)
- New password form (from email link)

### Student Portal (`/student`)

#### Dashboard (`/student/dashboard`)
- **Emergency button** (large, prominent, red) — one-tap to report
- Quick actions: book appointment, view history
- Recent visit history
- Active notifications

#### Emergency Report (`/student/emergency/report`)
- Report emergency with GPS location, type, severity, description, images

#### Emergency Track (`/student/emergency/track/[id]`)
- Real-time status tracking of reported incident

#### Appointments (`/student/appointments`)
- Upcoming appointments
- Create new appointment (select available slot)
- Appointment history

#### History (`/student/history`)
- Visit/treatment history

#### Notifications (`/student/notifications`)
- All notifications list (read/unread)

#### Profile (`/student/profile`)
- Personal info (name, student_id, email, phone)
- Health info (blood type, allergies, chronic diseases, emergency contact)
- Settings

### Staff Portal (`/staff`)

#### Dashboard (`/staff/dashboard`)
- Real-time incident feed (WebSocket)
- Overview stats (today's incidents, patients waiting, low stock alerts)
- Patient queue
- Important alerts

#### Emergency Management (`/staff/emergency`)
- Tabs: New (pending) | In Progress | Completed
- Map view with incident markers (Leaflet + OpenStreetMap)
- Accept incident → update status flow
- Distance from infirmary to incident (calculated from GPS)

#### Patient Management (`/staff/patients`)
- Patient list with search (`/staff/patients`)
- Register walk-in patient (`/staff/patients/new`)
- Individual patient record (`/staff/patients/[id]`)
- Medical certificate (`/staff/patients/[id]/certificate`)

#### Medicine Inventory (`/staff/medicines`)
- Medicine list with stock levels (`/staff/medicines`)
- Medicine detail (`/staff/medicines/[id]`)
- Add new medicine (`/staff/medicines/new`)
- Low stock alerts (highlighted)
- Expiring soon alerts (from batches)
- Stock in/out log
- Add new batch

#### Appointments (`/staff/appointments`)
- Appointment list / calendar view (`/staff/appointments`)
- Manage appointment slots (`/staff/appointments/slots`)
- Check-in / Cancel

#### Notifications (`/staff/notifications`)
- Staff notifications list

#### Reports (`/staff/reports`)
- Daily/monthly report
- Trend graphs (Recharts)
- Top statistics (most common incidents, peak hours, frequent locations)
- Export to PDF

#### Settings (`/staff/settings`)
- Profile
- Notification preferences
- Treatment types management
- Emergency contacts directory
- Faculty/department management
- User management (admin only)
- System settings (admin only)
- Data backup (admin only)
- Broadcast notifications (admin only)

## Real-time Features (WebSocket)

Events broadcast via WebSocket (`ws` library):

| Event | Trigger | Recipients |
|-------|---------|------------|
| `incident:new` | Student reports emergency | All staff |
| `incident:status_update` | Staff changes incident status | Reporter + all staff |
| `incident:accepted` | Staff accepts incident | Reporter |
| `queue:update` | Patient added/removed from queue | All staff |
| `notification:new` | Any notification created | Target user |
| `stock:alert` | Medicine falls below min_stock | All staff |

## API Design Conventions

- RESTful endpoints: `GET /api/v1/incidents`, `POST /api/v1/incidents`, etc.
- All responses: `{ success: boolean, data?: T, error?: string, message?: string }`
- Pagination: `?page=1&limit=20` → response includes `{ data, total, page, limit, totalPages }`
- Filtering: `?status=pending&severity=high&from=2025-01-01&to=2025-01-31`
- Sorting: `?sortBy=created_at&order=desc`
- All dates returned in ISO 8601 format
- Error responses: `{ success: false, error: "ERROR_CODE", message: "Human readable message" }`

## Security Rules

- Passwords hashed with **bcryptjs** (salt rounds: 12)
- JWT access token: 15 minutes expiry
- JWT refresh token: 7 days expiry, stored in `refresh_tokens` table
- Users are soft-deleted (`is_active = false`), not hard-deleted
- FK to `users` ON DELETE policy varies by table:
  - **RESTRICT** — core data: incidents, visits, responders, certificates, batches, stock logs, medications, slots
  - **CASCADE** — user-owned data: refresh_tokens, password_reset_tokens, health_profiles, notifications, push_subscriptions
  - **SET NULL** — logs/metadata: audit_logs, login_attempts, data_backups, system_settings
- HTTPS required in production
- Helmet.js for security headers
- Rate limiting on auth endpoints
- Login attempts tracked — lock after 5 failed attempts for 15 minutes

## Coding Conventions

- Language: **TypeScript** everywhere (strict mode)
- Use **raw SQL queries** with `pg` library (NOT TypeORM, NOT Prisma, NOT Drizzle)
- Database queries via a `DatabaseService` class with typed query methods
- Use **parameterized queries** only (`$1, $2`) — never string interpolation for SQL
- File naming: `kebab-case` (e.g., `emergency-incident.service.ts`)
- Class naming: `PascalCase` (e.g., `EmergencyIncidentService`)
- Variable naming: `camelCase`
- Always add proper TypeScript interfaces for all database rows and API responses
- Error handling: use Nest.js exception filters
- Validation: use `class-validator` + `class-transformer` with DTOs
- Every module should have: `controller`, `service`, `dto/`, `interfaces/`

## Environment Variables

```env
# Database (Dev/Prod: ปรับตาม environment จริง)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=ruts_realaids
DATABASE_USER=realaids
DATABASE_PASSWORD=realaids1234

# Database (Remote Dev Server ที่ใช้จริงตอนนี้)
# DATABASE_HOST=iot666.ddns.net
# DATABASE_PORT=5435
# DATABASE_NAME=ruts_realaids
# DATABASE_USER=realaids
# DATABASE_PASSWORD=realaids1234

# JWT
JWT_SECRET=<random-secret-key>
JWT_REFRESH_SECRET=<random-refresh-secret>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Server
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:4000
NEXT_PUBLIC_MAP_CENTER_LAT=7.1907
NEXT_PUBLIC_MAP_CENTER_LNG=100.5930
```

## Development Order

Build modules in this order (backend first, then frontend). All modules are implemented.

1. **Database** — Done (26 tables, 4 views, 13 enums)
2. **Backend Setup** — NestJS project, PostgreSQL connection, folder structure
3. **Auth Module** — Login, register, JWT, refresh, password reset, login attempts
4. **Users Module** — CRUD, health profiles
5. **Emergency Module** — Incidents CRUD, responders, status logs, images, WebSocket broadcast
6. **Visits Module** — Patient visits, visit medications, treatment types
7. **Certificates Module** — Medical certificates, PDF generation
8. **Medicines Module** — Medicines, batches, stock logs, alerts
9. **Appointments Module** — Slots, appointments, check-in, cron (no-show)
10. **Notifications Module** — CRUD, Web Push integration
11. **Reports Module** — Statistics queries, PDF export
12. **Settings Module** — System settings, user management, backups, emergency contacts, treatment types, faculties, audit logs, broadcast
13. **Frontend Setup** — Next.js project, Tailwind, layout, auth pages
14. **Student Portal** — Dashboard, emergency report/track, appointments, history, notifications, profile
15. **Staff Portal** — Dashboard, emergency management, patients, medicines, reports, settings, notifications
