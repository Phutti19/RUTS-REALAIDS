/**
 * Playwright Global Setup
 * Runs once before all tests.
 *
 * 1. Logs in as student, staff, and admin — saves browser storage states
 *    (.auth/*.json) so each spec can load them via storageState option.
 * 2. Ensures E2E-specific test student accounts exist in the DB.
 *
 * Seeded credentials (from database/seed-test-data.js):
 *   admin   → admin@ruts.ac.th   / Admin@1234
 *   staff   → nurse1@ruts.ac.th  / Nurse@1234
 *   student → student1@ruts.ac.th / Student@1234
 */

import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3000';
const API_URL  = 'http://localhost:4000/api/v1';
const AUTH_DIR = path.join(__dirname, '..', '.auth');

export const TEST_ACCOUNTS = {
  student: { email: 'student1@ruts.ac.th', password: 'Student@1234', firstName: 'สมชาย', role: 'student' },
  staff:   { email: 'nurse1@ruts.ac.th',   password: 'Nurse@1234',   firstName: 'สมใจ',  role: 'staff'   },
  admin:   { email: 'admin@ruts.ac.th',     password: 'Admin@1234',   firstName: 'วิชัย', role: 'admin'   },
  /** Extra student used for registration tests (created fresh each run) */
  newStudent: {
    email: `e2e.new.${Date.now()}@ruts.ac.th`,
    password: 'E2eTest@1234',
    firstName: 'ทดสอบ',
    lastName: 'ใหม่',
    studentId: `E${Date.now().toString().slice(-6)}`,
  },
} as const;

// Persist newStudent email so specs can read it
export const E2E_STATE_FILE = path.join(AUTH_DIR, 'e2e-state.json');

async function apiPost(path: string, body: unknown, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return res.json();
}

async function saveStorageState(role: keyof typeof TEST_ACCOUNTS, storageStatePath: string) {
  if (role === 'newStudent') return;
  const account = TEST_ACCOUNTS[role];

  const browser  = await chromium.launch();
  const context  = await browser.newContext();
  const page     = await context.newPage();

  // Wait up to 2 minutes for Next.js first compile
  page.setDefaultNavigationTimeout(120_000);
  page.setDefaultTimeout(60_000);

  // Navigate to login
  await page.goto(`${BASE_URL}/login`);

  // Select correct tab
  if (account.role === 'student') {
    await page.getByRole('button', { name: 'นักศึกษา' }).click();
  } else {
    await page.getByRole('button', { name: 'บุคลากร' }).click();
  }

  // Fill credentials
  await page.locator('input[type="email"]').fill(account.email);
  await page.locator('input[type="password"]').fill(account.password);

  // Submit and wait for redirect
  await Promise.all([
    page.waitForURL(/\/(student|staff)\//, { timeout: 60_000 }),
    page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click(),
  ]);

  // Verify we landed on the right portal
  const url = page.url();
  if (account.role === 'student' && !url.includes('/student/')) {
    throw new Error(`Student login failed — ended up at: ${url}`);
  }
  if ((account.role === 'staff' || account.role === 'admin') && !url.includes('/staff/')) {
    throw new Error(`Staff/admin login failed — ended up at: ${url}`);
  }

  await context.storageState({ path: storageStatePath });
  await browser.close();
  console.log(`  [global-setup] ✓ saved ${storageStatePath}`);
}

export default async function globalSetup(_config: FullConfig) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  // ── 1. Ensure seeded accounts exist by trying to register the student ────────
  //    (seed-test-data.js should have run already; this is a safety net)
  try {
    const r = await apiPost('/auth/register', {
      email: TEST_ACCOUNTS.student.email,
      password: TEST_ACCOUNTS.student.password,
      firstName: TEST_ACCOUNTS.student.firstName,
      lastName: 'นักศึกษา',
      studentId: '6401001',
    });
    if (r.success) console.log('  [global-setup] ℹ️  Registered student1 (was missing)');
  } catch {
    // already exists — ignore
  }

  // ── 2. Save auth storage states for each role ────────────────────────────────
  const roles: Array<keyof typeof TEST_ACCOUNTS> = ['student', 'staff', 'admin'];
  for (const role of roles) {
    const statePath = path.join(AUTH_DIR, `${role}.json`);
    try {
      await saveStorageState(role, statePath);
    } catch (err) {
      console.error(`  [global-setup] ❌ Failed to save state for ${role}:`, err);
      // Write empty state so the file exists (tests will fail gracefully)
      fs.writeFileSync(statePath, JSON.stringify({ cookies: [], origins: [] }));
    }
  }

  // ── 3. Save shared E2E state (new student email, etc.) ──────────────────────
  const e2eState = {
    newStudent: TEST_ACCOUNTS.newStudent,
    student: TEST_ACCOUNTS.student,
    staff: TEST_ACCOUNTS.staff,
    admin: TEST_ACCOUNTS.admin,
  };
  fs.writeFileSync(E2E_STATE_FILE, JSON.stringify(e2eState, null, 2));
  console.log('  [global-setup] ✓ e2e-state.json written');
}
