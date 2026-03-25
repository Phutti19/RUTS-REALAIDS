#!/usr/bin/env node
/**
 * RUTS-REALAIDS Backend API — Automated Test Suite
 *
 * Prerequisites:
 *   1. Backend running:   cd backend && npm run start:dev
 *   2. PostgreSQL running with ruts_realaids database
 *
 * Run from project root:
 *   node docs/test-api.js
 *
 * Exit code: 0 = all passed, 1 = failures found
 */
'use strict';

const path = require('path');
const fs   = require('fs');

// ── Load DB config from backend/.env ──────────────────────────────────────────
const DB = { host: 'iot666.ddns.net', port: 5435, database: 'ruts_realaids', user: 'realaids', password: 'realaids1234' };

try {
  const envPath = path.join(__dirname, '..', 'backend', '.env');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
      const m = line.match(/^([A-Z_]+)\s*=\s*(.+)$/);
      if (!m) return;
      const [, k, v] = m;
      if (k === 'DATABASE_HOST')     DB.host     = v.trim();
      if (k === 'DATABASE_PORT')     DB.port     = parseInt(v.trim(), 10);
      if (k === 'DATABASE_NAME')     DB.database = v.trim();
      if (k === 'DATABASE_USER')     DB.user     = v.trim();
      if (k === 'DATABASE_PASSWORD') DB.password = v.trim();
    });
  }
} catch (_) { /* use defaults */ }

const BASE_URL = `http://localhost:${process.env.API_PORT || 4000}/api/v1`;

// ── Load pg from backend node_modules ────────────────────────────────────────
let Client;
try {
  ({ Client } = require(path.join(__dirname, '..', 'backend', 'node_modules', 'pg')));
} catch {
  try { ({ Client } = require('pg')); }
  catch { console.error('❌  pg module not found. Run: cd backend && npm install'); process.exit(1); }
}

// ── Shared state (tokens + IDs collected during the run) ─────────────────────
const state = {
  adminToken: null, staffToken: null, studentToken: null,
  adminRefreshToken: null, studentRefreshToken: null,
  adminId: null, staffId: null, studentId: null,
  incidentId: null,
  visitId: null,
  certId: null,
  medicineId: null, batchId: null,
  slotId: null, appointmentId: null,
  notifId: null,
  contactId: null,
};

// ── Test runner ───────────────────────────────────────────────────────────────
const results = { passed: 0, failed: 0, errors: [] };

async function test(name, fn) {
  try {
    await fn();
    results.passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    results.failed++;
    results.errors.push({ name, error: err.message });
    console.log(`  ❌ ${name}`);
    console.log(`     └─ ${err.message}`);
  }
}

function section(title) {
  console.log(`\n${'═'.repeat(62)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(62));
}

// ── HTTP helper ───────────────────────────────────────────────────────────────
async function api(method, endpoint, { body, token, expectedStatus } = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new Error(`Cannot reach backend (${url}): ${err.message}`);
  }

  let json = null;
  if ((res.headers.get('content-type') ?? '').includes('application/json')) {
    json = await res.json();
  }

  if (expectedStatus !== undefined && res.status !== expectedStatus) {
    const detail = json?.message ?? json?.error ?? res.statusText;
    throw new Error(`Expected HTTP ${expectedStatus}, got ${res.status} — ${detail}`);
  }

  return { status: res.status, body: json, headers: res.headers };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// ── Database helpers ──────────────────────────────────────────────────────────
async function dbQuery(sql, params = []) {
  const c = new Client(DB);
  await c.connect();
  try {
    const res = await c.query(sql, params);
    return res.rows;
  } finally {
    await c.end();
  }
}

async function upgradeRole(email, role) {
  await dbQuery(`UPDATE users SET role = $1 WHERE email = $2`, [role, email]);
  console.log(`  ✅ Upgraded ${email} → role='${role}'`);
}

// ── Phase 0: Database setup ───────────────────────────────────────────────────
async function dbSetup() {
  section('PHASE 0 — DATABASE SETUP');

  // 0.1 Verify connection
  try {
    await dbQuery('SELECT 1');
    console.log(`  ✅ PostgreSQL connected: ${DB.host}:${DB.port}/${DB.database} (user=${DB.user})`);
  } catch (err) {
    console.error(`  ❌ Cannot connect: ${err.message}`);
    console.error(`     host=${DB.host}, port=${DB.port}, db=${DB.database}, user=${DB.user}`);
    console.error('');
    console.error('  To fix:');
    console.error('    1. Make sure PostgreSQL is running');
    console.error('    2. Check credentials in backend/.env');
    console.error('    3. Grant permissions:');
    console.error('         psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE ruts_realaids TO realaids;"');
    console.error('         psql -U postgres -d ruts_realaids -c "GRANT ALL ON SCHEMA public TO realaids;"');
    process.exit(1);
  }

  // 0.2 Verify schema
  const rows = await dbQuery(`
    SELECT COUNT(*) AS cnt FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  `);
  if (parseInt(rows[0].cnt, 10) === 0) {
    console.error('  ❌ Schema not found. Run: psql -U realaids -d ruts_realaids -f database/migration.sql');
    process.exit(1);
  }
  console.log('  ✅ Database schema verified');

  // 0.3 Clean up previous test data (order matters due to FKs)
  console.log('  🧹 Cleaning up previous test data...');
  await dbQuery(`DELETE FROM login_attempts WHERE email LIKE '%@ruts.ac.th'`);
  await dbQuery(`DELETE FROM push_subscriptions`);
  await dbQuery(`DELETE FROM notifications`);
  await dbQuery(`DELETE FROM appointments`);
  await dbQuery(`DELETE FROM appointment_slots`);
  await dbQuery(`DELETE FROM medical_certificates`);
  await dbQuery(`DELETE FROM visit_medications`);
  await dbQuery(`DELETE FROM patient_visits`);
  await dbQuery(`DELETE FROM incident_images`);
  await dbQuery(`DELETE FROM incident_responders`);
  await dbQuery(`DELETE FROM incident_status_logs`);
  await dbQuery(`DELETE FROM emergency_incidents`);
  await dbQuery(`DELETE FROM emergency_contacts_directory`);
  await dbQuery(`DELETE FROM medicine_stock_logs`);
  await dbQuery(`DELETE FROM medicine_batches`);
  await dbQuery(`DELETE FROM medicines`);
  await dbQuery(`DELETE FROM student_health_profiles`);
  await dbQuery(`DELETE FROM data_backups`);
  await dbQuery(`DELETE FROM password_reset_tokens`);
  await dbQuery(`DELETE FROM refresh_tokens`);
  await dbQuery(`DELETE FROM audit_logs`);
  await dbQuery(`DELETE FROM users WHERE email LIKE '%@ruts.ac.th'`);
  console.log('  ✅ Clean-up done');
}

// ── MODULE 1: AUTH ────────────────────────────────────────────────────────────
async function testAuth() {
  section('MODULE 1 — AUTH');

  await test('1.1 Register admin user → 201', async () => {
    const r = await api('POST', '/auth/register', {
      body: { email: 'admin@ruts.ac.th', password: 'Admin@1234', firstName: 'Admin', lastName: 'System', phone: '0812345678' },
      expectedStatus: 201,
    });
    assert(r.body.success, 'success must be true');
  });

  await test('1.2 Register nurse (future staff) → 201', async () => {
    const r = await api('POST', '/auth/register', {
      body: { email: 'nurse@ruts.ac.th', password: 'Nurse@1234', firstName: 'Somchai', lastName: 'Jaidee', phone: '0823456789' },
      expectedStatus: 201,
    });
    assert(r.body.success, 'success must be true');
  });

  await test('1.3 Register student → 201', async () => {
    const r = await api('POST', '/auth/register', {
      body: { email: 'student@ruts.ac.th', password: 'Student@1234', firstName: 'Somsri', lastName: 'Meesuk', phone: '0834567890', studentId: '6510001' },
      expectedStatus: 201,
    });
    assert(r.body.success, 'success must be true');
  });

  await test('1.4 Register duplicate email → 409', async () => {
    await api('POST', '/auth/register', {
      body: { email: 'student@ruts.ac.th', password: 'Student@1234', firstName: 'Dup', lastName: 'User' },
      expectedStatus: 409,
    });
  });

  await test('1.5 Register with extra field "role" → 400 (forbidNonWhitelisted)', async () => {
    await api('POST', '/auth/register', {
      body: { email: 'badactor@ruts.ac.th', password: 'Bad@1234', firstName: 'Bad', lastName: 'Actor', role: 'admin' },
      expectedStatus: 400,
    });
  });

  // Upgrade roles via direct DB (as documented in CLAUDE.md)
  await upgradeRole('admin@ruts.ac.th', 'admin');
  await upgradeRole('nurse@ruts.ac.th', 'staff');

  await test('1.6 Login wrong password → 401', async () => {
    const r = await api('POST', '/auth/login', {
      body: { email: 'admin@ruts.ac.th', password: 'wrongpassword' },
      expectedStatus: 401,
    });
    assert(r.body.success === false, 'success must be false');
  });

  await test('1.7 Login non-existent email → 401', async () => {
    await api('POST', '/auth/login', {
      body: { email: 'nobody@ruts.ac.th', password: 'Test@1234' },
      expectedStatus: 401,
    });
  });

  await test('1.8 Login admin → 200 + tokens', async () => {
    const r = await api('POST', '/auth/login', {
      body: { email: 'admin@ruts.ac.th', password: 'Admin@1234' },
      expectedStatus: 200,
    });
    assert(r.body.success, 'success must be true');
    assert(r.body.data?.accessToken, 'must have accessToken');
    assert(r.body.data?.refreshToken, 'must have refreshToken');
    assert(r.body.data?.user?.role === 'admin', 'user.role must be admin');
    state.adminToken        = r.body.data.accessToken;
    state.adminRefreshToken = r.body.data.refreshToken;
    state.adminId           = r.body.data.user.id;
  });

  await test('1.9 Login staff (nurse) → 200 + tokens', async () => {
    const r = await api('POST', '/auth/login', {
      body: { email: 'nurse@ruts.ac.th', password: 'Nurse@1234' },
      expectedStatus: 200,
    });
    assert(r.body.data?.user?.role === 'staff', 'user.role must be staff');
    state.staffToken = r.body.data.accessToken;
    state.staffId    = r.body.data.user.id;
  });

  await test('1.10 Login student → 200 + tokens', async () => {
    const r = await api('POST', '/auth/login', {
      body: { email: 'student@ruts.ac.th', password: 'Student@1234' },
      expectedStatus: 200,
    });
    state.studentToken        = r.body.data.accessToken;
    state.studentRefreshToken = r.body.data.refreshToken;
    state.studentId           = r.body.data.user.id;
  });

  await test('1.11 Refresh token → new accessToken', async () => {
    assert(state.adminRefreshToken, 'Need admin refresh token');
    const r = await api('POST', '/auth/refresh', {
      body: { refreshToken: state.adminRefreshToken },
      expectedStatus: 200,
    });
    assert(r.body.data?.accessToken, 'must return new accessToken');
    state.adminToken = r.body.data.accessToken; // keep token fresh
  });

  await test('1.12 Refresh with invalid token → 401', async () => {
    await api('POST', '/auth/refresh', {
      body: { refreshToken: 'this-is-not-a-valid-token' },
      expectedStatus: 401,
    });
  });

  await test('1.13 Forgot password → 200', async () => {
    const r = await api('POST', '/auth/forgot-password', {
      body: { email: 'student@ruts.ac.th' },
      expectedStatus: 200,
    });
    assert(r.body.success, 'success must be true');
  });

  await test('1.14 Logout → 200 + token revoked', async () => {
    // Get a fresh pair of tokens to revoke
    const login = await api('POST', '/auth/login', {
      body: { email: 'student@ruts.ac.th', password: 'Student@1234' },
      expectedStatus: 200,
    });
    const tmpAccess  = login.body.data.accessToken;
    const tmpRefresh = login.body.data.refreshToken;

    const r = await api('POST', '/auth/logout', {
      body: { refreshToken: tmpRefresh },
      token: tmpAccess,
      expectedStatus: 200,
    });
    assert(r.body.success, 'success must be true');

    // Re-login so studentToken stays valid for the rest of the suite
    const reLogin = await api('POST', '/auth/login', {
      body: { email: 'student@ruts.ac.th', password: 'Student@1234' },
      expectedStatus: 200,
    });
    state.studentToken        = reLogin.body.data.accessToken;
    state.studentRefreshToken = reLogin.body.data.refreshToken;
  });
}

// ── MODULE 2: USERS ───────────────────────────────────────────────────────────
async function testUsers() {
  section('MODULE 2 — USERS');

  await test('2.1 GET /users/me (student) → own profile', async () => {
    const r = await api('GET', '/users/me', { token: state.studentToken, expectedStatus: 200 });
    assert(r.body.success, 'success must be true');
    assert(r.body.data?.email === 'student@ruts.ac.th', 'wrong email');
  });

  await test('2.2 PUT /users/me → update firstName & phone', async () => {
    const r = await api('PUT', '/users/me', {
      token: state.studentToken,
      body: { firstName: 'Somsri Updated', phone: '0899999999' },
      expectedStatus: 200,
    });
    assert(r.body.data?.firstName === 'Somsri Updated', 'firstName not updated');
  });

  await test('2.3 PUT /users/me/health-profile → upsert health data', async () => {
    const r = await api('PUT', '/users/me/health-profile', {
      token: state.studentToken,
      body: {
        bloodType: 'O',
        allergies: 'Penicillin',
        chronicDiseases: 'Asthma',
        emergencyContactName: 'Mom',
        emergencyContactPhone: '0811111111',
        emergencyContactRelation: 'Mother',
      },
      expectedStatus: 200,
    });
    assert(r.body.success, 'success must be true');
  });

  await test('2.4 GET /users/me/health-profile → returns blood_type', async () => {
    const r = await api('GET', '/users/me/health-profile', { token: state.studentToken, expectedStatus: 200 });
    assert(r.body.success, 'success must be true');
    assert(r.body.data?.bloodType === 'O', `bloodType must be 'O', got '${r.body.data?.bloodType}'`);
  });

  await test('2.5 GET /users (staff) → paginated list', async () => {
    const r = await api('GET', '/users?page=1&limit=10', { token: state.staffToken, expectedStatus: 200 });
    assert(r.body.success, 'success must be true');
    assert(Array.isArray(r.body.data), 'data must be array');
    assert(r.body.total !== undefined, 'must have total');
  });

  await test('2.6 GET /users (student) → 403', async () => {
    await api('GET', '/users?page=1&limit=10', { token: state.studentToken, expectedStatus: 403 });
  });

  await test('2.7 GET /users/:id (staff) → user detail', async () => {
    const r = await api('GET', `/users/${state.studentId}`, { token: state.staffToken, expectedStatus: 200 });
    assert(r.body.data?.id === state.studentId, 'wrong user id');
  });
}

// ── MODULE 3: EMERGENCY INCIDENTS ────────────────────────────────────────────
async function testEmergency() {
  section('MODULE 3 — EMERGENCY INCIDENTS');

  await test('3.1 POST /incidents (student) → 201 + status=pending', async () => {
    const r = await api('POST', '/incidents', {
      token: state.studentToken,
      body: {
        incidentType: 'injury',
        severity: 'high',
        description: 'Student fell down stairs at Building 5',
        latitude: 7.1910,
        longitude: 100.5935,
        locationName: 'Building 5 stairway',
      },
      expectedStatus: 201,
    });
    assert(r.body.success, 'success must be true');
    assert(r.body.data?.id, 'must have incident id');
    assert(r.body.data?.status === 'pending', `status must be pending, got '${r.body.data?.status}'`);
    state.incidentId = r.body.data.id;
  });

  await test('3.2 GET /incidents (staff) → list with pagination', async () => {
    const r = await api('GET', '/incidents?page=1&limit=10', { token: state.staffToken, expectedStatus: 200 });
    assert(r.body.success, 'success must be true');
    assert(Array.isArray(r.body.data), 'data must be array');
    assert(r.body.total >= 1, 'must have at least 1 incident');
    assert(r.body.page === 1, 'page must be 1');
  });

  await test('3.3 GET /incidents?status=pending (staff) → filtered', async () => {
    const r = await api('GET', '/incidents?status=pending', { token: state.staffToken, expectedStatus: 200 });
    assert(r.body.data.every(i => i.status === 'pending'), 'all items must be pending');
  });

  await test('3.4 GET /incidents/:id (staff) → full detail', async () => {
    const r = await api('GET', `/incidents/${state.incidentId}`, { token: state.staffToken, expectedStatus: 200 });
    assert(r.body.data?.id === state.incidentId, 'wrong incident id');
  });

  await test('3.5 GET /incidents/:id (student — own) → 200', async () => {
    const r = await api('GET', `/incidents/${state.incidentId}`, { token: state.studentToken, expectedStatus: 200 });
    assert(r.body.data?.id === state.incidentId, 'wrong incident id');
  });

  await test('3.6 POST /incidents/:id/accept (student) → 403', async () => {
    await api('POST', `/incidents/${state.incidentId}/accept`, { token: state.studentToken, expectedStatus: 403 });
  });

  await test('3.7 POST /incidents/:id/accept (staff) → status=accepted', async () => {
    const r = await api('POST', `/incidents/${state.incidentId}/accept`, { token: state.staffToken, expectedStatus: 200 });
    assert(r.body.data?.status === 'accepted', `status must be accepted, got '${r.body.data?.status}'`);
  });

  await test('3.8 PATCH /incidents/:id/status → in_progress', async () => {
    const r = await api('PATCH', `/incidents/${state.incidentId}/status`, {
      token: state.staffToken,
      body: { status: 'in_progress', note: 'On the way' },
      expectedStatus: 200,
    });
    assert(r.body.data?.status === 'in_progress', `status must be in_progress, got '${r.body.data?.status}'`);
  });

  await test('3.9 PATCH /incidents/:id/status → completed', async () => {
    const r = await api('PATCH', `/incidents/${state.incidentId}/status`, {
      token: state.staffToken,
      body: { status: 'completed', note: 'Patient treated and stable' },
      expectedStatus: 200,
    });
    assert(r.body.data?.status === 'completed', `status must be completed, got '${r.body.data?.status}'`);
  });

  await test('3.10 GET /incidents/:id/logs → audit trail (≥2 entries)', async () => {
    const r = await api('GET', `/incidents/${state.incidentId}/logs`, { token: state.staffToken, expectedStatus: 200 });
    assert(Array.isArray(r.body.data), 'data must be array');
    assert(r.body.data.length >= 2, `must have ≥2 log entries, got ${r.body.data.length}`);
  });

  await test('3.11 GET /incidents (student) → only own incidents', async () => {
    const r = await api('GET', '/incidents', { token: state.studentToken, expectedStatus: 200 });
    assert(r.body.data.every(i => i.reporterId === state.studentId), 'student must only see own incidents');
  });
}

// ── MODULE 4: PATIENT VISITS ──────────────────────────────────────────────────
async function testVisits() {
  section('MODULE 4 — PATIENT VISITS');

  await test('4.1 GET /visits/queue (staff) → waiting queue', async () => {
    const r = await api('GET', '/visits/queue', { token: state.staffToken, expectedStatus: 200 });
    assert(r.body.success, 'success must be true');
    assert(Array.isArray(r.body.data), 'data must be array');
  });

  await test('4.2 POST /visits (staff) → 201 status=waiting', async () => {
    const r = await api('POST', '/visits', {
      token: state.staffToken,
      body: {
        patientId: state.studentId,
        visitType: 'emergency',
        incidentId: state.incidentId,
        chiefComplaint: 'Fell down stairs, pain in left ankle',
        vitalSigns: { bloodPressure: '120/80', heartRate: 88, temperature: 37.2, respiratoryRate: 18 },
      },
      expectedStatus: 201,
    });
    assert(r.body.success, 'success must be true');
    assert(r.body.data?.id, 'must have visit id');
    state.visitId = r.body.data.id;
  });

  await test('4.3 GET /visits/:id (staff) → detail with vital_signs', async () => {
    const r = await api('GET', `/visits/${state.visitId}`, { token: state.staffToken, expectedStatus: 200 });
    assert(r.body.data?.id === state.visitId, 'wrong visit id');
    assert(r.body.data?.vitalSigns, 'vitalSigns must be present');
  });

  await test('4.4 PATCH /visits/:id → diagnosis + status=in_treatment', async () => {
    const r = await api('PATCH', `/visits/${state.visitId}`, {
      token: state.staffToken,
      body: { diagnosis: 'Sprained left ankle, grade 1', status: 'in_treatment' },
      expectedStatus: 200,
    });
    assert(r.body.data?.status === 'in_treatment', `status must be in_treatment, got '${r.body.data?.status}'`);
    assert(r.body.data?.diagnosis === 'Sprained left ankle, grade 1', 'diagnosis not saved');
  });

  await test('4.5 GET /visits?status=in_treatment → filtered list', async () => {
    const r = await api('GET', '/visits?status=in_treatment', { token: state.staffToken, expectedStatus: 200 });
    assert(r.body.success, 'success must be true');
    assert(r.body.data.length >= 1, 'must have at least 1 in_treatment visit');
  });

  await test('4.6 PATCH /visits/:id → complete', async () => {
    const r = await api('PATCH', `/visits/${state.visitId}`, {
      token: state.staffToken,
      body: { status: 'completed' },
      expectedStatus: 200,
    });
    assert(r.body.data?.status === 'completed', `status must be completed, got '${r.body.data?.status}'`);
  });
}

// ── MODULE 5: MEDICAL CERTIFICATES ───────────────────────────────────────────
async function testCertificates() {
  section('MODULE 5 — MEDICAL CERTIFICATES');

  await test('5.1 POST /certificates → 201 + auto cert number', async () => {
    const r = await api('POST', '/certificates', {
      token: state.staffToken,
      body: {
        visitId: state.visitId,
        diagnosisText: 'Sprained left ankle, grade 1',
        recommendation: 'Rest for 3 days, avoid physical activity',
        restDays: 3,
        restStartDate: '2026-03-01',
        restEndDate:   '2026-03-03',
      },
      expectedStatus: 201,
    });
    assert(r.body.success, 'success must be true');
    assert(r.body.data?.certificateNumber?.startsWith('CERT-'), `cert number must start with CERT-, got '${r.body.data?.certificateNumber}'`);
    state.certId = r.body.data.id;
  });

  await test('5.2 GET /certificates → list with patient info', async () => {
    const r = await api('GET', '/certificates?page=1&limit=10', { token: state.staffToken, expectedStatus: 200 });
    assert(r.body.success, 'success must be true');
    assert(r.body.data.length >= 1, 'must have at least 1 certificate');
  });

  await test('5.3 GET /certificates/:id → detail', async () => {
    const r = await api('GET', `/certificates/${state.certId}`, { token: state.staffToken, expectedStatus: 200 });
    assert(r.body.data?.id === state.certId, 'wrong cert id');
    assert(r.body.data?.certificateNumber, 'must have certificateNumber');
  });

  await test('5.4 GET /certificates/:id/pdf → PDF binary', async () => {
    const res = await fetch(`${BASE_URL}/certificates/${state.certId}/pdf`, {
      headers: { Authorization: `Bearer ${state.staffToken}` },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const ct = res.headers.get('content-type') ?? '';
    assert(ct.includes('pdf'), `Expected PDF content-type, got '${ct}'`);
    await res.arrayBuffer(); // consume body
  });
}

// ── MODULE 6: MEDICINES & BATCHES ─────────────────────────────────────────────
async function testMedicines() {
  section('MODULE 6 — MEDICINES & BATCHES');

  await test('6.1 POST /medicines → 201', async () => {
    const r = await api('POST', '/medicines', {
      token: state.staffToken,
      body: { name: 'Paracetamol 500mg', category: 'medicine', unit: 'tablet', description: 'Pain reliever', minStockLevel: 100 },
      expectedStatus: 201,
    });
    assert(r.body.success, 'success must be true');
    assert(r.body.data?.id, 'must have medicine id');
    state.medicineId = r.body.data.id;
  });

  await test('6.2 POST /medicines/:id/batches → stock updated', async () => {
    const r = await api('POST', `/medicines/${state.medicineId}/batches`, {
      token: state.staffToken,
      body: { batchNumber: 'BATCH-2026-001', quantity: 500, expiryDate: '2027-06-30', notes: 'Initial stock' },
      expectedStatus: 201,
    });
    assert(r.body.success, 'success must be true');
    assert(r.body.data?.id, 'must have batch id');
    state.batchId = r.body.data.id;
  });

  await test('6.3 GET /medicines → list + stock_quantity=500', async () => {
    const r = await api('GET', '/medicines?page=1&limit=10', { token: state.staffToken, expectedStatus: 200 });
    assert(r.body.success, 'success must be true');
    const med = r.body.data.find(m => m.id === state.medicineId);
    assert(med, 'created medicine must appear in list');
    assert(parseInt(med.stockQuantity, 10) >= 500, `stockQuantity must be ≥500, got ${med.stockQuantity}`);
  });

  await test('6.4 GET /medicines/:id → detail with isLowStock flag', async () => {
    const r = await api('GET', `/medicines/${state.medicineId}`, { token: state.staffToken, expectedStatus: 200 });
    assert(r.body.data?.id === state.medicineId, 'wrong medicine id');
  });

  await test('6.5 GET /medicines/:id/batches → batch list (FIFO)', async () => {
    const r = await api('GET', `/medicines/${state.medicineId}/batches`, { token: state.staffToken, expectedStatus: 200 });
    assert(Array.isArray(r.body.data), 'data must be array');
    assert(r.body.data.length >= 1, 'must have at least 1 batch');
  });

  await test('6.6 GET /medicines/:id/stock-logs → received log exists', async () => {
    const r = await api('GET', `/medicines/${state.medicineId}/stock-logs`, { token: state.staffToken, expectedStatus: 200 });
    assert(Array.isArray(r.body.data), 'data must be array');
    assert(r.body.data.some(l => l.action === 'received'), 'must have a "received" stock log');
  });

  await test('6.7 GET /medicines/alerts/low-stock → 200', async () => {
    const r = await api('GET', '/medicines/alerts/low-stock', { token: state.staffToken, expectedStatus: 200 });
    assert(r.body.success, 'success must be true');
  });

  await test('6.8 GET /medicines/alerts/expiring → 200', async () => {
    const r = await api('GET', '/medicines/alerts/expiring', { token: state.staffToken, expectedStatus: 200 });
    assert(r.body.success, 'success must be true');
  });

  // Dispense medicine against a fresh walk-in visit
  let tempVisitId;
  await test('6.9 POST /visits (walk-in) → create temp visit for dispensing', async () => {
    const r = await api('POST', '/visits', {
      token: state.staffToken,
      body: { patientId: state.studentId, visitType: 'walk_in', chiefComplaint: 'Headache' },
      expectedStatus: 201,
    });
    assert(r.body.success, 'success must be true');
    tempVisitId = r.body.data.id;
  });

  await test('6.10 POST /visits/:id/medications → dispense 10 tablets, stock → 490', async () => {
    assert(tempVisitId, 'Need temp visit id');
    const r = await api('POST', `/visits/${tempVisitId}/medications`, {
      token: state.staffToken,
      body: { medicineId: state.medicineId, quantity: 10, dosageInstruction: '1 tablet 3x daily' },
      expectedStatus: 201,
    });
    assert(r.body.success, 'success must be true');
    assert(r.body.data?.medicineId === state.medicineId, 'wrong medicine id in response');

    // Verify stock was deducted
    const medR = await api('GET', `/medicines/${state.medicineId}`, { token: state.staffToken, expectedStatus: 200 });
    assert(parseInt(medR.body.data.stockQuantity, 10) === 490, `stock must be 490, got ${medR.body.data.stockQuantity}`);
  });

  await test('6.11 GET /visits/:id/medications → dispensed list', async () => {
    assert(tempVisitId, 'Need temp visit id');
    const r = await api('GET', `/visits/${tempVisitId}/medications`, { token: state.staffToken, expectedStatus: 200 });
    assert(Array.isArray(r.body.data), 'data must be array');
    assert(r.body.data.length >= 1, 'must have at least 1 medication entry');
  });

  // Clean up temp visit
  await test('6.12 PATCH temp visit → completed', async () => {
    assert(tempVisitId, 'Need temp visit id');
    const r = await api('PATCH', `/visits/${tempVisitId}`, {
      token: state.staffToken,
      body: { status: 'completed' },
      expectedStatus: 200,
    });
    assert(r.body.data?.status === 'completed', 'status must be completed');
  });
}

// ── MODULE 7: APPOINTMENTS ────────────────────────────────────────────────────

/** Find the next date (YYYY-MM-DD, local time) that falls on the given dayOfWeek (0=Sun..6=Sat). */
function nextWeekday(dow) {
  const d = new Date();
  d.setDate(d.getDate() + ((dow + 7 - d.getDay()) % 7 || 7));
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function testAppointments() {
  section('MODULE 7 — APPOINTMENTS');

  const nextMonday    = nextWeekday(1); // for slot dayOfWeek=1
  const nextWednesday = nextWeekday(3); // for slot dayOfWeek=3

  await test('7.1 POST /appointment-slots (Monday) → 201', async () => {
    const r = await api('POST', '/appointment-slots', {
      token: state.staffToken,
      body: { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', slotDurationMinutes: 30, maxPatientsPerSlot: 2 },
      expectedStatus: 201,
    });
    assert(r.body.success, 'success must be true');
    assert(r.body.data?.id, 'must have slot id');
    state.slotId = r.body.data.id;
  });

  await test(`7.2 GET /appointment-slots/available?date=${nextMonday} → slots list`, async () => {
    const r = await api('GET', `/appointment-slots/available?date=${nextMonday}`, { token: state.studentToken, expectedStatus: 200 });
    assert(r.body.success, 'success must be true');
    assert(Array.isArray(r.body.data), 'data must be array');
  });

  await test('7.3 POST /appointments (student books) → 201 + status=scheduled', async () => {
    const r = await api('POST', '/appointments', {
      token: state.studentToken,
      body: {
        slotId: state.slotId,
        date: nextMonday,
        notes: 'Follow up on sprained ankle',
      },
      expectedStatus: 201,
    });
    assert(r.body.success, 'success must be true');
    assert(r.body.data?.status === 'scheduled', `status must be scheduled, got '${r.body.data?.status}'`);
    state.appointmentId = r.body.data.id;
  });

  await test('7.4 GET /appointments/my (student) → own appointments', async () => {
    const r = await api('GET', '/appointments/my', { token: state.studentToken, expectedStatus: 200 });
    assert(r.body.success, 'success must be true');
    assert(r.body.data.length >= 1, 'must have at least 1 appointment');
    assert(r.body.data.some(a => a.id === state.appointmentId), 'booked appointment must appear');
  });

  await test('7.5 GET /appointments/today (staff) → list', async () => {
    const r = await api('GET', '/appointments/today', { token: state.staffToken, expectedStatus: 200 });
    assert(r.body.success, 'success must be true');
    assert(Array.isArray(r.body.data), 'data must be array');
  });

  await test('7.6 PATCH /appointments/:id/check-in → checked_in', async () => {
    const r = await api('PATCH', `/appointments/${state.appointmentId}/check-in`, {
      token: state.staffToken,
      expectedStatus: 200,
    });
    assert(r.body.data?.status === 'checked_in', `status must be checked_in, got '${r.body.data?.status}'`);
  });

  await test('7.7 PATCH /appointments/:id/complete → completed', async () => {
    const r = await api('PATCH', `/appointments/${state.appointmentId}/complete`, {
      token: state.staffToken,
      expectedStatus: 200,
    });
    assert(r.body.data?.status === 'completed', `status must be completed, got '${r.body.data?.status}'`);
  });

  await test('7.8 PATCH /appointments/:id/cancel → cancelled (second booking)', async () => {
    // Book another appointment on next Wednesday
    const slot2R = await api('POST', '/appointment-slots', {
      token: state.staffToken,
      body: { dayOfWeek: 3, startTime: '13:00', endTime: '16:00', slotDurationMinutes: 30, maxPatientsPerSlot: 1 },
      expectedStatus: 201,
    });
    const slot2Id = slot2R.body.data.id;

    const appt2R = await api('POST', '/appointments', {
      token: state.studentToken,
      body: { slotId: slot2Id, date: nextWednesday, notes: 'Check up' },
      expectedStatus: 201,
    });
    const appt2Id = appt2R.body.data.id;

    const r = await api('PATCH', `/appointments/${appt2Id}/cancel`, {
      token: state.studentToken,
      body: { cancelReason: 'Cannot make it, will reschedule' },
      expectedStatus: 200,
    });
    assert(r.body.data?.status === 'cancelled', `status must be cancelled, got '${r.body.data?.status}'`);
  });
}

// ── MODULE 8: NOTIFICATIONS ───────────────────────────────────────────────────
async function testNotifications() {
  section('MODULE 8 — NOTIFICATIONS');

  await test('8.1 GET /notifications (student) → own notifications', async () => {
    const r = await api('GET', '/notifications?page=1&limit=20', { token: state.studentToken, expectedStatus: 200 });
    assert(r.body.success, 'success must be true');
    assert(Array.isArray(r.body.data), 'data must be array');
    if (r.body.data.length > 0) state.notifId = r.body.data[0].id;
  });

  await test('8.2 GET /notifications/unread-count → { count }', async () => {
    const r = await api('GET', '/notifications/unread-count', { token: state.studentToken, expectedStatus: 200 });
    assert(r.body.success, 'success must be true');
    assert(typeof r.body.data?.count === 'number', `count must be a number, got ${typeof r.body.data?.count}`);
  });

  await test('8.3 PATCH /notifications/read-all → marks all read', async () => {
    const r = await api('PATCH', '/notifications/read-all', { token: state.studentToken, expectedStatus: 200 });
    assert(r.body.success, 'success must be true');
    assert(r.body.data?.updated !== undefined, 'must have updated count');
  });

  if (state.notifId) {
    await test('8.4 PATCH /notifications/:id/read → is_read=true', async () => {
      const r = await api('PATCH', `/notifications/${state.notifId}/read`, { token: state.studentToken, expectedStatus: 200 });
      assert(r.body.success, 'success must be true');
    });
  }
}

// ── MODULE 9: REPORTS ────────────────────────────────────────────────────────
async function testReports() {
  section('MODULE 9 — REPORTS');

  await test('9.1 GET /reports/dashboard (staff) → summary object', async () => {
    const r = await api('GET', '/reports/dashboard', { token: state.staffToken, expectedStatus: 200 });
    assert(r.body.success, 'success must be true');
    assert(r.body.data !== undefined, 'data must exist');
  });

  await test('9.2 GET /reports/incidents?from=&to= → incident stats', async () => {
    const r = await api('GET', '/reports/incidents?from=2026-01-01&to=2026-12-31', { token: state.staffToken, expectedStatus: 200 });
    assert(r.body.success, 'success must be true');
  });

  await test('9.3 GET /reports/visits?from=&to= → visit stats', async () => {
    const r = await api('GET', '/reports/visits?from=2026-01-01&to=2026-12-31', { token: state.staffToken, expectedStatus: 200 });
    assert(r.body.success, 'success must be true');
  });

  await test('9.4 GET /reports/medicines → low stock + expiring summary', async () => {
    const r = await api('GET', '/reports/medicines', { token: state.staffToken, expectedStatus: 200 });
    assert(r.body.success, 'success must be true');
  });

  await test('9.5 GET /reports/export/pdf → PDF binary', async () => {
    const res = await fetch(`${BASE_URL}/reports/export/pdf?type=daily&date=2026-03-01`, {
      headers: { Authorization: `Bearer ${state.staffToken}` },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const ct = res.headers.get('content-type') ?? '';
    assert(ct.includes('pdf'), `Expected PDF content-type, got '${ct}'`);
    await res.arrayBuffer();
  });
}

// ── MODULE 10: SETTINGS ───────────────────────────────────────────────────────
async function testSettings() {
  section('MODULE 10 — SETTINGS');

  await test('10.1 GET /settings (admin) → array of all settings', async () => {
    const r = await api('GET', '/settings', { token: state.adminToken, expectedStatus: 200 });
    assert(r.body.success, 'success must be true');
    assert(Array.isArray(r.body.data), 'data must be array');
  });

  await test('10.2 GET /settings/infirmary → lat/lng/name/phone object', async () => {
    const r = await api('GET', '/settings/infirmary', { token: state.adminToken, expectedStatus: 200 });
    assert(r.body.success, 'success must be true');
    assert(r.body.data !== undefined, 'data must exist');
  });

  await test('10.3 PUT /settings/infirmary_phone → update value', async () => {
    const r = await api('PUT', '/settings/infirmary_phone', {
      token: state.adminToken,
      body: { value: '074-317200' },
      expectedStatus: 200,
    });
    assert(r.body.success, 'success must be true');
  });

  await test('10.4 GET /admin/users (admin) → paginated user list', async () => {
    const r = await api('GET', '/admin/users?page=1&limit=10', { token: state.adminToken, expectedStatus: 200 });
    assert(r.body.success, 'success must be true');
    assert(Array.isArray(r.body.data), 'data must be array');
  });

  await test('10.5 POST /admin/users → create staff user', async () => {
    const r = await api('POST', '/admin/users', {
      token: state.adminToken,
      body: { email: 'nurse2@ruts.ac.th', password: 'Nurse@1234', firstName: 'Malee', lastName: 'Srisuk', phone: '0845678901', role: 'staff' },
      expectedStatus: 201,
    });
    assert(r.body.success, 'success must be true');
    assert(r.body.data?.role === 'staff', `role must be staff, got '${r.body.data?.role}'`);
  });

  await test('10.6 PUT /admin/users/:id → update phone', async () => {
    const r = await api('PUT', `/admin/users/${state.studentId}`, {
      token: state.adminToken,
      body: { phone: '0899000001' },
      expectedStatus: 200,
    });
    assert(r.body.success, 'success must be true');
  });

  await test('10.7 PATCH /admin/users/:id/deactivate → is_active=false', async () => {
    const r = await api('PATCH', `/admin/users/${state.studentId}/deactivate`, {
      token: state.adminToken,
      expectedStatus: 200,
    });
    assert(r.body.data?.isActive === false, `isActive must be false, got '${r.body.data?.isActive}'`);
  });

  await test('10.8 PATCH /admin/users/:id/activate → is_active=true', async () => {
    const r = await api('PATCH', `/admin/users/${state.studentId}/activate`, {
      token: state.adminToken,
      expectedStatus: 200,
    });
    assert(r.body.data?.isActive === true, `isActive must be true, got '${r.body.data?.isActive}'`);
  });

  await test('10.9 POST /emergency-contacts → 201', async () => {
    const r = await api('POST', '/emergency-contacts', {
      token: state.adminToken,
      body: { name: 'Songklanagarind Hospital', category: 'hospital', phone: '074-451999', note: 'Nearest hospital' },
      expectedStatus: 201,
    });
    assert(r.body.success, 'success must be true');
    state.contactId = r.body.data.id;
  });

  await test('10.10 GET /emergency-contacts (staff) → list', async () => {
    const r = await api('GET', '/emergency-contacts', { token: state.staffToken, expectedStatus: 200 });
    assert(r.body.success, 'success must be true');
    assert(r.body.data.length >= 1, 'must have at least 1 contact');
  });

  await test('10.11 PUT /emergency-contacts/:id → update phone', async () => {
    const r = await api('PUT', `/emergency-contacts/${state.contactId}`, {
      token: state.adminToken,
      body: { phone: '074-451000' },
      expectedStatus: 200,
    });
    assert(r.body.data?.phone === '074-451000', `phone not updated, got '${r.body.data?.phone}'`);
  });

  await test('10.12 DELETE /emergency-contacts/:id → 204', async () => {
    await api('DELETE', `/emergency-contacts/${state.contactId}`, { token: state.adminToken, expectedStatus: 204 });
  });

  await test('10.13 GET /backups (admin) → array', async () => {
    const r = await api('GET', '/backups', { token: state.adminToken, expectedStatus: 200 });
    assert(r.body.success, 'success must be true');
    assert(Array.isArray(r.body.data), 'data must be array');
  });
}

// ── SECURITY TESTS ────────────────────────────────────────────────────────────
async function testSecurity() {
  section('SECURITY TESTS');

  await test('S.1 No Authorization header → 401', async () => {
    await api('GET', '/users/me', { expectedStatus: 401 });
  });

  await test('S.2 Invalid Bearer token → 401', async () => {
    await api('GET', '/users/me', { token: 'this.is.invalid', expectedStatus: 401 });
  });

  await test('S.3 Student accessing staff-only route → 403', async () => {
    await api('GET', '/users', { token: state.studentToken, expectedStatus: 403 });
  });

  await test('S.4 Staff accessing admin-only route (GET /settings) → 403', async () => {
    await api('GET', '/settings', { token: state.staffToken, expectedStatus: 403 });
  });

  await test('S.5 Staff trying to create backup → 403', async () => {
    await api('POST', '/backups', { token: state.staffToken, expectedStatus: 403 });
  });

  await test('S.6 Send unknown field in register body → 400', async () => {
    await api('POST', '/auth/register', {
      body: { email: 'test@ruts.ac.th', password: 'Test@1234', firstName: 'T', lastName: 'U', role: 'admin' },
      expectedStatus: 400,
    });
  });

  await test('S.7 Access non-existent incident (fake UUID) → 404', async () => {
    await api('GET', '/incidents/00000000-0000-0000-0000-000000000000', { token: state.staffToken, expectedStatus: 404 });
  });

  await test('S.8 Student accept incident (role guard) → 403', async () => {
    await api('POST', `/incidents/${state.incidentId}/accept`, { token: state.studentToken, expectedStatus: 403 });
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const startMs = Date.now();
  console.log('\n🚀  RUTS-REALAIDS Backend API Test Suite');
  console.log(`    Base URL : ${BASE_URL}`);
  console.log(`    DB       : ${DB.user}@${DB.host}:${DB.port}/${DB.database}`);

  await dbSetup();

  await testAuth();
  await testUsers();
  await testEmergency();
  await testVisits();
  await testCertificates();
  await testMedicines();
  await testAppointments();
  await testNotifications();
  await testReports();
  await testSettings();
  await testSecurity();

  const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
  const total   = results.passed + results.failed;

  console.log(`\n${'═'.repeat(62)}`);
  console.log('  RESULTS');
  console.log('═'.repeat(62));
  console.log(`  Total   : ${total}`);
  console.log(`  ✅ Passed : ${results.passed}`);
  console.log(`  ❌ Failed : ${results.failed}`);
  console.log(`  ⏱️  Time   : ${elapsed}s`);

  if (results.errors.length > 0) {
    console.log('\n  ── Failed tests ─────────────────────────────────────────');
    results.errors.forEach((e, i) => {
      console.log(`  ${String(i + 1).padStart(2, '0')}. ${e.name}`);
      console.log(`      └─ ${e.error}`);
    });
  }

  console.log('');
  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(`\n💥  Unhandled error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
