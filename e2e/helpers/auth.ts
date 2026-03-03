/**
 * Shared auth helpers for E2E tests.
 */

import { Page } from '@playwright/test';
import * as path from 'path';

export const AUTH_DIR = path.join(__dirname, '..', '.auth');

export const STORAGE_STATE = {
  student: path.join(AUTH_DIR, 'student.json'),
  staff:   path.join(AUTH_DIR, 'staff.json'),
  admin:   path.join(AUTH_DIR, 'admin.json'),
} as const;

export const CREDENTIALS = {
  student: { email: 'student1@ruts.ac.th', password: 'Student@1234' },
  staff:   { email: 'nurse1@ruts.ac.th',   password: 'Nurse@1234'   },
  admin:   { email: 'admin@ruts.ac.th',     password: 'Admin@1234'   },
} as const;

/**
 * Log in via UI and wait for redirect.
 * Use this only when you cannot use storageState (e.g., testing the login flow itself).
 */
export async function loginViaUI(
  page: Page,
  role: 'student' | 'staff' | 'admin',
) {
  const creds = CREDENTIALS[role];
  await page.goto('/login');

  if (role === 'student') {
    await page.getByRole('button', { name: 'นักศึกษา' }).click();
  } else {
    await page.getByRole('button', { name: 'บุคลากร' }).click();
  }

  await page.locator('input[type="email"]').fill(creds.email);
  await page.locator('input[type="password"]').fill(creds.password);

  await Promise.all([
    page.waitForURL(/\/(student|staff)\//),
    page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click(),
  ]);
}

/**
 * Log out via the sidebar logout button (staff portal) or navigate to /login.
 */
export async function logoutViaUI(page: Page) {
  // Try clicking the logout button if visible
  const logoutBtn = page.getByRole('button', { name: 'ออกจากระบบ' });
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click();
  } else {
    await page.goto('/login');
  }
  await page.waitForURL('/login');
}
