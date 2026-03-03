/**
 * Flow 9: Settings
 */
import { test, expect } from '@playwright/test';
import { STORAGE_STATE } from './helpers/auth';

const API = 'http://localhost:4000/api/v1';

test.describe('Settings — Admin access', () => {
  test.use({ storageState: STORAGE_STATE.admin });

  test('settings page is accessible as admin', async ({ page }) => {
    await page.goto('/staff/settings');
    await expect(page).toHaveURL(/\/staff\/settings/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('settings page renders system settings section', async ({ page }) => {
    await page.goto('/staff/settings');
    await page.waitForLoadState('networkidle');
    const hasSettings = await page.getByText(/การตั้งค่า|ตั้งค่า|Setting/).first().isVisible().catch(() => false);
    expect(hasSettings).toBe(true);
  });

  test('admin can see user management section', async ({ page }) => {
    await page.goto('/staff/settings');
    await page.waitForLoadState('networkidle');
    const hasUsers = await page.getByText(/จัดการผู้ใช้|ผู้ใช้ระบบ|User/).isVisible().catch(() => false);
    const hasAdmin = await page.locator('[class*="admin"], [class*="user"]').count() > 0;
    expect(hasUsers || hasAdmin).toBe(true);
  });
});

test.describe('Settings — Staff access (limited)', () => {
  test.use({ storageState: STORAGE_STATE.staff });

  test('settings page is accessible as staff', async ({ page }) => {
    await page.goto('/staff/settings');
    await expect(page).toHaveURL(/\/staff\/settings/);
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Settings — API: system settings', () => {
  test('admin can get system settings', async ({ request }) => {
    const loginRes = await request.post(`${API}/auth/login`, {
      data: { email: 'admin@ruts.ac.th', password: 'Admin@1234' },
    });
    const token = (await loginRes.json()).data?.accessToken as string;

    const res  = await request.get(`${API}/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(typeof body.data).toBe('object');
  });

  test('admin can update a system setting', async ({ request }) => {
    const loginRes = await request.post(`${API}/auth/login`, {
      data: { email: 'admin@ruts.ac.th', password: 'Admin@1234' },
    });
    const token = (await loginRes.json()).data?.accessToken as string;

    // Get current settings — returns array of { key, value } objects
    const getRes  = await request.get(`${API}/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const getBody = await getRes.json();
    const settingsArr: { key: string; value: string }[] = Array.isArray(getBody.data) ? getBody.data : [];

    if (settingsArr.length === 0) {
      // No settings to update — skip
      return;
    }

    // Update infirmary_name if it exists, otherwise update first key
    const target = settingsArr.find((s) => s.key === 'infirmary_name') ?? settingsArr[0];

    // Backend: PUT /settings/:key with body { value: "..." }
    const updateRes = await request.put(`${API}/settings/${target.key}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { value: target.value }, // no-op update (same value)
    });
    const updateBody = await updateRes.json();
    expect(updateBody.success).toBe(true);
  });

  test('admin can list users', async ({ request }) => {
    const loginRes = await request.post(`${API}/auth/login`, {
      data: { email: 'admin@ruts.ac.th', password: 'Admin@1234' },
    });
    const token = (await loginRes.json()).data?.accessToken as string;

    const res  = await request.get(`${API}/admin/users?limit=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.total).toBeGreaterThan(0);
  });

  test('admin can get emergency contacts directory', async ({ request }) => {
    const loginRes = await request.post(`${API}/auth/login`, {
      data: { email: 'admin@ruts.ac.th', password: 'Admin@1234' },
    });
    const token = (await loginRes.json()).data?.accessToken as string;

    const res  = await request.get(`${API}/emergency-contacts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data ?? [])).toBe(true);
  });

  test('staff (non-admin) cannot access user deactivation', async ({ request }) => {
    const loginRes = await request.post(`${API}/auth/login`, {
      data: { email: 'nurse1@ruts.ac.th', password: 'Nurse@1234' },
    });
    const token = (await loginRes.json()).data?.accessToken as string;

    const adminLoginRes = await request.post(`${API}/auth/login`, {
      data: { email: 'admin@ruts.ac.th', password: 'Admin@1234' },
    });
    const adminToken = (await adminLoginRes.json()).data?.accessToken as string;

    // Get a student user ID via admin endpoint
    const usersRes = await request.get(`${API}/admin/users?limit=1`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const users = (await usersRes.json()).data ?? [];
    if (users.length === 0) return;

    const targetId = users[0].id;
    // Non-admin trying to deactivate — backend is at /admin/users/:id/deactivate
    const res = await request.patch(`${API}/admin/users/${targetId}/deactivate`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // Expect 403 Forbidden
    expect([403, 401, 404]).toContain(res.status());
  });
});
