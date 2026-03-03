/**
 * Flow 1: Registration & Login
 */
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import { CREDENTIALS, STORAGE_STATE, loginViaUI } from './helpers/auth';
import { E2E_STATE_FILE } from './setup/global-setup';

// Load the new-student account that was generated in global-setup
const e2eState = fs.existsSync(E2E_STATE_FILE)
  ? JSON.parse(fs.readFileSync(E2E_STATE_FILE, 'utf8'))
  : null;

const NEW_STUDENT = e2eState?.newStudent ?? {
  email: `e2e.fallback.${Date.now()}@ruts.ac.th`,
  password: 'E2eTest@1234',
  firstName: 'ทดสอบ',
  lastName: 'ใหม่',
  studentId: `E${Date.now().toString().slice(-6)}`,
};

test.describe('Auth — Login page layout', () => {
  test('shows two role tabs: student and staff', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'นักศึกษา' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'บุคลากร' })).toBeVisible();
  });

  test('shows email and password inputs', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('shows system title: RUTS REALAIDS', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('RUTS REALAIDS')).toBeVisible();
  });
});

test.describe('Auth — Registration', () => {
  test('register new student → 201 via API', async ({ request }) => {
    const res = await request.post('http://localhost:4000/api/v1/auth/register', {
      data: {
        email: NEW_STUDENT.email,
        password: NEW_STUDENT.password,
        firstName: NEW_STUDENT.firstName,
        lastName: NEW_STUDENT.lastName,
        studentId: NEW_STUDENT.studentId,
      },
    });
    const body = await res.json();
    expect(res.status()).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data?.user?.email).toBe(NEW_STUDENT.email);
    expect(body.data?.user?.role).toBe('student');
  });

  test('register duplicate email → 409', async ({ request }) => {
    // Use a pre-seeded account that definitely exists
    const res = await request.post('http://localhost:4000/api/v1/auth/register', {
      data: {
        email: CREDENTIALS.student.email,
        password: CREDENTIALS.student.password,
        firstName: 'ซ้ำ',
        lastName: 'ผู้ใช้',
      },
    });
    const body = await res.json();
    expect(res.status()).toBe(409);
    expect(body.success).toBe(false);
  });
});

test.describe('Auth — Login flows', () => {
  test('student login → redirect to /student/dashboard', async ({ page }) => {
    await loginViaUI(page, 'student');
    await expect(page).toHaveURL(/\/student\/dashboard/);
    // Should see emergency button
    await expect(page.getByText('แจ้งเหตุ')).toBeVisible();
  });

  test('staff login → redirect to /staff/dashboard', async ({ page }) => {
    await loginViaUI(page, 'staff');
    await expect(page).toHaveURL(/\/staff\/dashboard/);
    // Staff dashboard has a sidebar
    await expect(page.getByText('แดชบอร์ด')).toBeVisible();
  });

  test('admin login → redirect to /staff/dashboard', async ({ page }) => {
    await loginViaUI(page, 'admin');
    await expect(page).toHaveURL(/\/staff\/dashboard/);
  });

  test('wrong password → shows error message', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'นักศึกษา' }).click();
    await page.locator('input[type="email"]').fill(CREDENTIALS.student.email);
    await page.locator('input[type="password"]').fill('WrongPass999!');
    await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
    // Should show an error and stay on /login
    await expect(page).toHaveURL(/\/login/);
    const errorEl = page.locator('.bg-red-50, [class*="error"], [class*="red"]').first();
    await expect(errorEl).toBeVisible();
  });

  test('forgot password link is visible', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('ลืมรหัสผ่าน?')).toBeVisible();
  });
});

test.describe('Auth — Logout', () => {
  test.use({ storageState: STORAGE_STATE.staff });

  test('logout via sidebar → redirected to /login', async ({ page }) => {
    await page.goto('/staff/dashboard');
    // Find logout button in sidebar
    await page.getByRole('button', { name: 'ออกจากระบบ' }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Auth — Protected routes without session', () => {
  test('no token → /student/dashboard redirects to /login', async ({ page }) => {
    // storageState is undefined → no cookies
    await page.goto('/student/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('no token → /staff/dashboard redirects to /login', async ({ page }) => {
    await page.goto('/staff/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
