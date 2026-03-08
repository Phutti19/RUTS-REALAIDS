#!/usr/bin/env node
'use strict';

/**
 * RUTS-REALAIDS — Seed Test Data
 * สร้างข้อมูลทดสอบผ่าน API
 *
 * Usage: node database/seed-test-data.js
 * Prerequisites: Backend must be running on localhost:4000
 *
 * สร้าง:
 *   - 1 admin, 2 staff, 3 student users
 *   - student health profiles
 *   - 10 medicines + batches (2 low stock, 1 near expiry)
 *   - 5 emergency incidents (pending, accepted, in_progress, 2 completed)
 *   - 5 patient visits (2 waiting, 1 in_treatment, 2 completed)
 *   - 4 appointment slots (2 per staff)
 *   - 3 appointments (scheduled, completed, cancelled)
 */

const path = require('path');
// Use pg from backend's node_modules so no extra install needed
const { Pool } = require(path.join(__dirname, '../backend/node_modules/pg'));

const API_BASE = 'http://localhost:4000/api/v1';

const DB_CONFIG = {
  host: 'iot666.ddns.net',
  port: 5435,
  database: 'ruts_realaids',
  user: 'realaids',
  password: 'realaids1234',
};

// ─── Console helpers ─────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};
function log(msg)  { console.log(`\n${c.bold}${c.cyan}${msg}${c.reset}`); }
function ok(msg)   { console.log(`  ${c.green}✓${c.reset} ${msg}`); }
function warn(msg) { console.log(`  ${c.yellow}⚠${c.reset} ${msg}`); }
function fail(msg) { console.log(`  ${c.red}✗${c.reset} ${msg}`); }

// ─── API helpers ─────────────────────────────────────────────────────────────
async function apiCall(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.success) {
    const msg = json.message || json.error || 'Unknown error';
    throw new Error(`${method} ${path} [${res.status}] — ${msg}`);
  }
  return json.data;
}

const api = {
  get:   (p, token)    => apiCall('GET',   p, undefined, token),
  post:  (p, b, token) => apiCall('POST',  p, b, token),
  put:   (p, b, token) => apiCall('PUT',   p, b, token),
  patch: (p, b, token) => apiCall('PATCH', p, b, token),
};

// ─── Date helpers ─────────────────────────────────────────────────────────────
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

/** Next calendar occurrence of dayOfWeek (0=Sun,1=Mon…6=Sat), always ≥ 1 day ahead */
function nextWeekday(dow) {
  const d = new Date();
  const diff = ((dow - d.getDay() + 7) % 7) || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

// ─── User definitions ────────────────────────────────────────────────────────
const USERS = {
  admin: {
    email: 'admin@ruts.ac.th', password: 'Admin@1234',
    firstName: 'วิชัย', lastName: 'สมบูรณ์', role: 'admin',
  },
  nurse1: {
    email: 'nurse1@ruts.ac.th', password: 'Nurse@1234',
    firstName: 'สมใจ', lastName: 'พยาบาล', role: 'staff',
  },
  nurse2: {
    email: 'nurse2@ruts.ac.th', password: 'Nurse@1234',
    firstName: 'นารี', lastName: 'รักษา', role: 'staff',
  },
  student1: {
    email: 'student1@ruts.ac.th', password: 'Student@1234',
    firstName: 'สมชาย', lastName: 'นักศึกษา', role: 'student', studentId: '6401001',
  },
  student2: {
    email: 'student2@ruts.ac.th', password: 'Student@1234',
    firstName: 'สมหญิง', lastName: 'เรียนดี', role: 'student', studentId: '6401002',
  },
  student3: {
    email: 'student3@ruts.ac.th', password: 'Student@1234',
    firstName: 'สมศักดิ์', lastName: 'ขยันเรียน', role: 'student', studentId: '6401003',
  },
};

// ─── STEP 1: Users ────────────────────────────────────────────────────────────
async function createUsers(pool) {
  log('STEP 1: Users');

  const tokens = {};

  for (const [key, user] of Object.entries(USERS)) {
    // Check existing
    const { rows } = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [user.email],
    );

    if (rows.length === 0) {
      // Register (always creates role='student')
      try {
        await api.post('/auth/register', {
          email: user.email,
          password: user.password,
          firstName: user.firstName,
          lastName: user.lastName,
          ...(user.studentId ? { studentId: user.studentId } : {}),
        });
        // Elevate role for staff/admin
        if (user.role !== 'student') {
          await pool.query(
            'UPDATE users SET role = $1 WHERE email = $2',
            [user.role, user.email],
          );
        }
        ok(`Created ${user.email} (${user.role})`);
      } catch (e) {
        fail(`Register ${user.email}: ${e.message}`);
      }
    } else {
      warn(`${user.email} already exists — skipping`);
    }

    // Login to get token
    try {
      const data = await api.post('/auth/login', {
        email: user.email,
        password: user.password,
      });
      tokens[key] = data.accessToken;
    } catch (e) {
      fail(`Login ${user.email}: ${e.message}`);
    }
  }

  return tokens;
}

// ─── STEP 2: Health profiles ──────────────────────────────────────────────────
async function createHealthProfiles(tokens) {
  log('STEP 2: Student Health Profiles');

  const profiles = [
    {
      key: 'student1',
      data: {
        bloodType: 'A+',
        allergies: 'ยาเพนนิซิลิน',
        chronicDiseases: 'ไม่มี',
        emergencyContactName: 'นาย สมปอง นักศึกษา',
        emergencyContactPhone: '0812345678',
        emergencyContactRelation: 'บิดา',
      },
    },
    {
      key: 'student2',
      data: {
        bloodType: 'B+',
        allergies: 'ไม่แพ้ยา',
        chronicDiseases: 'เบาหวาน',
        emergencyContactName: 'นาง สมศรี เรียนดี',
        emergencyContactPhone: '0823456789',
        emergencyContactRelation: 'มารดา',
      },
    },
    {
      key: 'student3',
      data: {
        bloodType: 'O+',
        allergies: 'ฝุ่นละออง',
        chronicDiseases: 'หอบหืด',
        emergencyContactName: 'นาย สมพร ขยันเรียน',
        emergencyContactPhone: '0834567890',
        emergencyContactRelation: 'บิดา',
      },
    },
  ];

  for (const { key, data } of profiles) {
    if (!tokens[key]) { fail(`No token for ${key}`); continue; }
    try {
      await api.put('/users/me/health-profile', data, tokens[key]);
      ok(`Health profile: ${USERS[key].email}`);
    } catch (e) {
      fail(`Health profile ${key}: ${e.message}`);
    }
  }
}

// ─── STEP 3: Medicines ────────────────────────────────────────────────────────
async function createMedicines(tokens) {
  log('STEP 3: Medicines (10 items)');

  const staffToken = tokens.nurse1;
  const createdMedicines = [];

  const medicineList = [
    {
      name: 'Paracetamol 500mg', category: 'medicine', unit: 'เม็ด', minStockLevel: 50,
      batches: [{ batchNumber: 'PCM-2026-001', quantity: 200, expiryDate: daysFromNow(365) }],
    },
    {
      name: 'Ibuprofen 400mg', category: 'medicine', unit: 'เม็ด', minStockLevel: 50,
      batches: [{ batchNumber: 'IBU-2026-001', quantity: 150, expiryDate: daysFromNow(300) }],
    },
    {
      // LOW STOCK: stock 15 < min 100
      name: 'Amoxicillin 500mg', category: 'medicine', unit: 'แคปซูล', minStockLevel: 100,
      batches: [{ batchNumber: 'AMX-2026-001', quantity: 15, expiryDate: daysFromNow(180) }],
    },
    {
      name: 'Omeprazole 20mg', category: 'medicine', unit: 'เม็ด', minStockLevel: 30,
      batches: [{ batchNumber: 'OMP-2026-001', quantity: 120, expiryDate: daysFromNow(400) }],
    },
    {
      // LOW STOCK: stock 5 < min 50
      name: 'Cetirizine 10mg', category: 'medicine', unit: 'เม็ด', minStockLevel: 50,
      batches: [{ batchNumber: 'CTZ-2026-001', quantity: 5, expiryDate: daysFromNow(250) }],
    },
    {
      name: 'Bandage Roll', category: 'supply', unit: 'ม้วน', minStockLevel: 20,
      batches: [{ batchNumber: 'BND-2026-001', quantity: 50, expiryDate: daysFromNow(730) }],
    },
    {
      // NEAR EXPIRY: expires in 15 days
      name: 'Antiseptic Solution', category: 'supply', unit: 'ขวด', minStockLevel: 10,
      batches: [{ batchNumber: 'ANT-2026-001', quantity: 8, expiryDate: daysFromNow(15) }],
    },
    {
      name: 'Gauze Pads 4x4', category: 'supply', unit: 'ชิ้น', minStockLevel: 100,
      batches: [{ batchNumber: 'GAZ-2026-001', quantity: 300, expiryDate: daysFromNow(500) }],
    },
    {
      name: 'Blood Pressure Monitor', category: 'equipment', unit: 'เครื่อง', minStockLevel: 2,
      batches: [{ batchNumber: 'BPM-2026-001', quantity: 3, expiryDate: daysFromNow(1825) }],
    },
    {
      name: 'Digital Thermometer', category: 'equipment', unit: 'อัน', minStockLevel: 3,
      batches: [{ batchNumber: 'THM-2026-001', quantity: 5, expiryDate: daysFromNow(1825) }],
    },
  ];

  for (const med of medicineList) {
    try {
      const created = await api.post('/medicines', {
        name: med.name,
        category: med.category,
        unit: med.unit,
        minStockLevel: med.minStockLevel,
      }, staffToken);

      for (const batch of med.batches) {
        await api.post(`/medicines/${created.id}/batches`, batch, staffToken);
      }

      const totalStock = med.batches.reduce((s, b) => s + b.quantity, 0);
      const isLow     = totalStock < med.minStockLevel ? ' [LOW STOCK]' : '';
      const isExpiry  = med.batches.some(b => b.expiryDate <= daysFromNow(30)) ? ' [NEAR EXPIRY]' : '';
      ok(`${med.name} — stock: ${totalStock}${isLow}${isExpiry}`);

      createdMedicines.push(created);
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('409')) {
        warn(`${med.name} already exists — skipping`);
      } else {
        fail(`Medicine ${med.name}: ${e.message}`);
      }
    }
  }

  return createdMedicines;
}

// ─── STEP 4: Emergency incidents ─────────────────────────────────────────────
async function createIncidents(tokens) {
  log('STEP 4: Emergency Incidents (5 items)');

  const createdIncidents = [];

  // [reporter, type, severity, description, lat, lng, location, targetStatus]
  const incidentList = [
    {
      reporter: 'student1',
      type: 'injury', severity: 'high',
      description: 'หกล้มบันไดอาคาร 3 ข้อเท้าแพลง ปวดมาก เดินไม่ได้',
      lat: 7.2025, lng: 100.6005, location: 'อาคาร 3 บันได',
      targetStatus: 'pending',
    },
    {
      reporter: 'student2',
      type: 'illness', severity: 'medium',
      description: 'ปวดหัวรุนแรง คลื่นไส้ มีไข้สูง 39 องศา',
      lat: 7.2018, lng: 100.6008, location: 'โรงอาหาร',
      targetStatus: 'accepted',
    },
    {
      reporter: 'student3',
      type: 'accident', severity: 'critical',
      description: 'รถจักรยานยนต์ชนในที่จอดรถ บาดเจ็บที่ศีรษะ หมดสติชั่วคราว',
      lat: 7.2015, lng: 100.5998, location: 'ที่จอดรถ',
      targetStatus: 'in_progress',
    },
    {
      reporter: 'student1',
      type: 'fainting', severity: 'low',
      description: 'หน้ามืดเป็นลมในห้องเรียน รู้สึกตัวแล้ว',
      lat: 7.2022, lng: 100.6012, location: 'ห้อง 201 อาคาร 2',
      targetStatus: 'completed',
    },
    {
      reporter: 'student2',
      type: 'other', severity: 'medium',
      description: 'แมลงต่อยบริเวณแขน มีอาการบวมแดง แพ้',
      lat: 7.2019, lng: 100.6001, location: 'ห้องน้ำชาย อาคาร 1',
      targetStatus: 'completed',
    },
  ];

  for (const inc of incidentList) {
    const reporterToken = tokens[inc.reporter];
    if (!reporterToken) { fail(`No token for ${inc.reporter}`); continue; }

    try {
      const created = await api.post('/incidents', {
        incidentType: inc.type,
        severity: inc.severity,
        description: inc.description,
        latitude: inc.lat,
        longitude: inc.lng,
        locationName: inc.location,
      }, reporterToken);

      // Advance to target status
      if (['accepted', 'in_progress', 'completed'].includes(inc.targetStatus)) {
        await api.post(`/incidents/${created.id}/accept`, {}, tokens.nurse1);
      }
      if (['in_progress', 'completed'].includes(inc.targetStatus)) {
        await api.patch(`/incidents/${created.id}/status`, {
          status: 'in_progress',
          note: 'เจ้าหน้าที่กำลังเดินทางไปยังจุดเกิดเหตุ',
        }, tokens.nurse1);
      }
      if (inc.targetStatus === 'completed') {
        await api.patch(`/incidents/${created.id}/status`, {
          status: 'completed',
          note: 'ดูแลผู้ป่วยเรียบร้อยแล้ว นำส่งห้องพยาบาล',
        }, tokens.nurse1);
      }

      ok(`${inc.type}/${inc.severity} by ${inc.reporter} → ${inc.targetStatus}`);
      createdIncidents.push(created);
    } catch (e) {
      fail(`Incident ${inc.type} by ${inc.reporter}: ${e.message}`);
      createdIncidents.push(null);
    }
  }

  return createdIncidents;
}

// ─── STEP 5: Patient visits ───────────────────────────────────────────────────
async function createVisits(tokens, userIds, medicines, incidents) {
  log('STEP 5: Patient Visits (5 items)');

  const visitList = [
    {
      patient: 'student1', type: 'walk_in',
      complaint: 'ปวดท้อง ท้องเสีย 3 ครั้ง เช้านี้',
      targetStatus: 'waiting',
    },
    {
      patient: 'student2', type: 'emergency',
      complaint: 'บาดเจ็บจากอุบัติเหตุ มีแผลที่ศีรษะ',
      incidentIdx: 2,  // student3's accident incident
      targetStatus: 'in_treatment',
      dispenseMed: true,
    },
    {
      patient: 'student3', type: 'walk_in',
      complaint: 'ไข้สูง 38.5 เจ็บคอ มีน้ำมูก',
      targetStatus: 'completed',
      diagnosis: 'ไข้หวัดธรรมดา (Common Cold)',
      treatmentNotes: 'ให้ยาลดไข้ Paracetamol และยาบรรเทาอาการ พักผ่อน ดื่มน้ำมากๆ',
      dispenseMed: true,
    },
    {
      patient: 'student1', type: 'appointment',
      complaint: 'ตรวจสุขภาพประจำปี เป็นนัดหมาย',
      targetStatus: 'completed',
      diagnosis: 'สุขภาพแข็งแรง ไม่พบความผิดปกติ',
      treatmentNotes: 'ผลการตรวจปกติทุกประการ แนะนำออกกำลังกายสม่ำเสมอ',
    },
    {
      patient: 'student2', type: 'follow_up',
      complaint: 'ติดตามอาการเบาหวาน ตรวจระดับน้ำตาลในเลือด',
      targetStatus: 'waiting',
    },
  ];

  for (const v of visitList) {
    const patientId = userIds[v.patient];
    if (!patientId) { fail(`No userId for ${v.patient}`); continue; }

    try {
      const body = {
        patientId,
        visitType: v.type,
        chiefComplaint: v.complaint,
        vitalSigns: {
          temperature: parseFloat((36.5 + Math.random() * 1.5).toFixed(1)),
          bloodPressure: '120/80',
          heartRate: 70 + Math.floor(Math.random() * 20),
          oxygenSaturation: 96 + Math.floor(Math.random() * 4),
        },
      };

      // Link to incident if specified
      if (v.incidentIdx !== undefined && incidents[v.incidentIdx]) {
        body.incidentId = incidents[v.incidentIdx].id;
      }

      const created = await api.post('/visits', body, tokens.nurse1);

      // Advance to in_treatment
      if (v.targetStatus === 'in_treatment' || v.targetStatus === 'completed') {
        await api.patch(`/visits/${created.id}`, {
          status: 'in_treatment',
          diagnosis: v.diagnosis || 'กำลังตรวจและวินิจฉัย',
        }, tokens.nurse1);

        // Dispense medication
        if (v.dispenseMed && medicines.length > 0) {
          await api.post(`/visits/${created.id}/medications`, {
            medicineId: medicines[0].id,  // Paracetamol
            quantity: 10,
            dosageInstruction: 'รับประทาน 1 เม็ด เมื่อมีไข้หรือปวด ทุก 4-6 ชั่วโมง ไม่เกิน 4 ครั้งต่อวัน',
          }, tokens.nurse1);
        }
      }

      // Complete the visit
      if (v.targetStatus === 'completed') {
        await api.patch(`/visits/${created.id}`, {
          status: 'completed',
          diagnosis: v.diagnosis,
          treatmentNotes: v.treatmentNotes,
        }, tokens.nurse1);
      }

      ok(`${v.patient} (${v.type}) → ${v.targetStatus}`);
    } catch (e) {
      fail(`Visit ${v.patient}/${v.type}: ${e.message}`);
    }
  }
}

// ─── STEP 6: Appointment slots ────────────────────────────────────────────────
async function createAppointmentSlots(tokens, userIds) {
  log('STEP 6: Appointment Slots (4 slots)');

  const createdSlots = [];

  const slotList = [
    {
      staff: 'nurse1', dayOfWeek: 1,   // Monday
      startTime: '09:00', endTime: '12:00', slotDurationMinutes: 30, maxPatientsPerSlot: 5,
      label: 'Nurse1 — วันจันทร์ เช้า',
    },
    {
      staff: 'nurse1', dayOfWeek: 3,   // Wednesday
      startTime: '13:00', endTime: '16:00', slotDurationMinutes: 30, maxPatientsPerSlot: 5,
      label: 'Nurse1 — วันพุธ บ่าย',
    },
    {
      staff: 'nurse2', dayOfWeek: 2,   // Tuesday
      startTime: '09:00', endTime: '12:00', slotDurationMinutes: 30, maxPatientsPerSlot: 5,
      label: 'Nurse2 — วันอังคาร เช้า',
    },
    {
      staff: 'nurse2', dayOfWeek: 4,   // Thursday
      startTime: '13:00', endTime: '16:00', slotDurationMinutes: 30, maxPatientsPerSlot: 5,
      label: 'Nurse2 — วันพฤหัส บ่าย',
    },
  ];

  for (const slot of slotList) {
    const staffToken = tokens[slot.staff];
    const staffId    = userIds[slot.staff];
    if (!staffToken || !staffId) { fail(`No token/id for ${slot.staff}`); continue; }

    try {
      const created = await api.post('/appointment-slots', {
        staffId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        slotDurationMinutes: slot.slotDurationMinutes,
        maxPatientsPerSlot: slot.maxPatientsPerSlot,
      }, staffToken);

      ok(slot.label);
      createdSlots.push({ ...created, staff: slot.staff, dayOfWeek: slot.dayOfWeek });
    } catch (e) {
      fail(`Slot ${slot.label}: ${e.message}`);
    }
  }

  return createdSlots;
}

// ─── STEP 7: Appointments ─────────────────────────────────────────────────────
async function createAppointments(tokens, slots) {
  log('STEP 7: Appointments (3 items)');

  if (slots.length < 2) {
    warn('Not enough slots — skipping appointments');
    return;
  }

  const mondaySlot    = slots.find(s => s.staff === 'nurse1' && s.dayOfWeek === 1);
  const wednesdaySlot = slots.find(s => s.staff === 'nurse1' && s.dayOfWeek === 3);
  const tuesdaySlot   = slots.find(s => s.staff === 'nurse2' && s.dayOfWeek === 2);

  if (!mondaySlot || !wednesdaySlot || !tuesdaySlot) {
    warn('Required slots not found — skipping appointments');
    return;
  }

  const nextMonday    = nextWeekday(1);
  const nextWednesday = nextWeekday(3);
  const nextTuesday   = nextWeekday(2);

  const appointmentList = [
    {
      patient: 'student1', slot: mondaySlot, date: nextMonday,
      notes: 'ต้องการตรวจสุขภาพทั่วไป และปรึกษาเรื่องอาการปวดหัวบ่อย',
      targetStatus: 'scheduled',
    },
    {
      // Use Wednesday slot to avoid same-slot conflict with student1 on Monday
      patient: 'student2', slot: wednesdaySlot, date: nextWednesday,
      notes: 'ปรึกษาเรื่องการใช้ยาเบาหวานและติดตามอาการ',
      targetStatus: 'completed',
    },
    {
      patient: 'student3', slot: tuesdaySlot, date: nextTuesday,
      notes: 'ตรวจร่างกายทั่วไปก่อนเข้าร่วมกิจกรรมกีฬา',
      targetStatus: 'cancelled',
    },
  ];

  for (const appt of appointmentList) {
    const patientToken = tokens[appt.patient];
    if (!patientToken) { fail(`No token for ${appt.patient}`); continue; }

    try {
      const created = await api.post('/appointments', {
        slotId: appt.slot.id,
        date: appt.date,
        notes: appt.notes,
      }, patientToken);

      if (appt.targetStatus === 'completed') {
        await api.patch(`/appointments/${created.id}/check-in`, {}, tokens.nurse1);
        await api.patch(`/appointments/${created.id}/complete`, {}, tokens.nurse1);
      } else if (appt.targetStatus === 'cancelled') {
        await api.patch(`/appointments/${created.id}/cancel`, {
          cancelReason: 'ติดธุระส่วนตัว ไม่สามารถมาตามนัดได้',
        }, patientToken);
      }

      ok(`${appt.patient} on ${appt.date} → ${appt.targetStatus}`);
    } catch (e) {
      fail(`Appointment ${appt.patient}: ${e.message}`);
    }
  }
}

// ─── STEP 8: Verify ───────────────────────────────────────────────────────────
async function verify(pool) {
  log('STEP 8: Verification');

  const checks = [
    ['Users by role',       'SELECT role, COUNT(*) AS count FROM users GROUP BY role ORDER BY role'],
    ['Health profiles',     'SELECT COUNT(*) AS count FROM student_health_profiles'],
    ['Medicines',           'SELECT COUNT(*) AS count FROM medicines'],
    ['Medicine batches',    'SELECT COUNT(*) AS count FROM medicine_batches'],
    ['Incidents by status', 'SELECT status, COUNT(*) AS count FROM emergency_incidents GROUP BY status ORDER BY status'],
    ['Visits by status',    'SELECT status, COUNT(*) AS count FROM patient_visits GROUP BY status ORDER BY status'],
    ['Visit medications',   'SELECT COUNT(*) AS count FROM visit_medications'],
    ['Appointment slots',   'SELECT COUNT(*) AS count FROM appointment_slots'],
    ['Appointments',        'SELECT status, COUNT(*) AS count FROM appointments GROUP BY status ORDER BY status'],
    ['Notifications',       'SELECT COUNT(*) AS count FROM notifications'],
    ['Low stock alerts',    'SELECT COUNT(*) AS count FROM v_medicines_low_stock'],
    ['Expiring soon',       'SELECT COUNT(*) AS count FROM v_medicines_expiring_soon'],
  ];

  console.log('');
  for (const [label, sql] of checks) {
    try {
      const { rows } = await pool.query(sql);
      if (rows.length === 1 && rows[0].count !== undefined) {
        console.log(`  ${label.padEnd(22)}: ${rows[0].count}`);
      } else {
        console.log(`  ${label}:`);
        rows.forEach(r => console.log(`    ${r.status || r.role}: ${r.count}`));
      }
    } catch (e) {
      fail(`Verify ${label}: ${e.message}`);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${c.bold}╔══════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}║  RUTS-REALAIDS — Seed Test Data              ║${c.reset}`);
  console.log(`${c.bold}╚══════════════════════════════════════════════╝${c.reset}`);

  const pool = new Pool(DB_CONFIG);

  // Pre-flight checks
  log('Pre-flight checks');
  try {
    await pool.query('SELECT 1');
    ok('PostgreSQL connected');
  } catch (e) {
    fail(`DB connection failed: ${e.message}`);
    process.exit(1);
  }

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '_preflight@test.com', password: 'x' }),
    });
    // Any response (even 400/401) means the server is reachable
    if (res.status < 500) {
      ok(`Backend API reachable at ${API_BASE}`);
    } else {
      throw new Error(`Server returned ${res.status}`);
    }
  } catch (e) {
    if (e.message.includes('fetch failed') || e.message.includes('ECONNREFUSED')) {
      fail(`Backend not running at ${API_BASE} — start it first`);
      await pool.end();
      process.exit(1);
    }
    ok(`Backend API reachable at ${API_BASE}`);
  }

  try {
    // Step 1
    const tokens = await createUsers(pool);

    // Resolve user IDs from DB
    const emails = Object.values(USERS).map(u => u.email);
    const { rows: userRows } = await pool.query(
      'SELECT id, email FROM users WHERE email = ANY($1)',
      [emails],
    );
    const userIds = {};
    for (const [key, user] of Object.entries(USERS)) {
      const row = userRows.find(r => r.email === user.email);
      if (row) userIds[key] = row.id;
    }

    // Step 2
    await createHealthProfiles(tokens);

    // Step 3
    const medicines = await createMedicines(tokens);

    // Step 4
    const incidents = await createIncidents(tokens);

    // Step 5
    await createVisits(tokens, userIds, medicines, incidents);

    // Step 6
    const slots = await createAppointmentSlots(tokens, userIds);

    // Step 7
    await createAppointments(tokens, slots);

    // Step 8
    await verify(pool);

    console.log(`\n${c.bold}${c.green}✅  Seed data created successfully!${c.reset}\n`);
    console.log('Test Accounts:');
    console.log('  Admin:    admin@ruts.ac.th    / Admin@1234');
    console.log('  Staff 1:  nurse1@ruts.ac.th   / Nurse@1234');
    console.log('  Staff 2:  nurse2@ruts.ac.th   / Nurse@1234');
    console.log('  Student1: student1@ruts.ac.th / Student@1234');
    console.log('  Student2: student2@ruts.ac.th / Student@1234');
    console.log('  Student3: student3@ruts.ac.th / Student@1234\n');
  } catch (e) {
    fail(`Fatal: ${e.message}`);
    console.error(e.stack);
  } finally {
    await pool.end();
  }
}

main();
