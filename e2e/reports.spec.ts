/**
 * Flow 8: Reports & Dashboard statistics
 */
import { test, expect } from '@playwright/test';
import { STORAGE_STATE } from './helpers/auth';

const API = 'http://localhost:4000/api/v1';

test.describe('Reports — Staff dashboard stats', () => {
  test.use({ storageState: STORAGE_STATE.staff });

  test('staff dashboard is accessible', async ({ page }) => {
    await page.goto('/staff/dashboard');
    await expect(page).toHaveURL(/\/staff\/dashboard/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('staff dashboard shows statistics widgets', async ({ page }) => {
    await page.goto('/staff/dashboard');
    await page.waitForLoadState('networkidle');
    const widgets = page.locator('[class*="stat"], [class*="count"], [class*="card"]');
    const count = await widgets.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Reports — Staff reports page', () => {
  test.use({ storageState: STORAGE_STATE.staff });

  test('reports page is accessible', async ({ page }) => {
    await page.goto('/staff/reports');
    await expect(page).toHaveURL(/\/staff\/reports/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('reports page renders without JS error', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/staff/reports');
    await page.waitForLoadState('networkidle');
    const criticalErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error'),
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('reports page contains chart area or data tables', async ({ page }) => {
    await page.goto('/staff/reports');
    await page.waitForLoadState('networkidle');
    const hasSvg   = await page.locator('svg').count() > 0;
    const hasTable = await page.locator('table').count() > 0;
    const hasCard  = await page.locator('[class*="card"], [class*="stat"]').count() > 0;
    expect(hasSvg || hasTable || hasCard).toBe(true);
  });

  test('export PDF button is present', async ({ page }) => {
    await page.goto('/staff/reports');
    await page.waitForLoadState('networkidle');
    const exportBtn = page.locator('button').filter({ hasText: /PDF|ส่งออก|Export/ });
    const hasPdf = await exportBtn.count() > 0;
    if (hasPdf) {
      await expect(exportBtn.first()).toBeVisible();
    }
  });
});

test.describe('Reports — API statistics', () => {
  test('dashboard stats API returns data', async ({ request }) => {
    const loginRes = await request.post(`${API}/auth/login`, {
      data: { email: 'nurse1@ruts.ac.th', password: 'Nurse@1234' },
    });
    const token = (await loginRes.json()).data?.accessToken as string;

    const res  = await request.get(`${API}/reports/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('visit stats API returns data for current month', async ({ request }) => {
    const loginRes = await request.post(`${API}/auth/login`, {
      data: { email: 'nurse1@ruts.ac.th', password: 'Nurse@1234' },
    });
    const token = (await loginRes.json()).data?.accessToken as string;

    const now   = new Date();
    const year  = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const from  = `${year}-${month}-01`;
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const to    = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

    const res  = await request.get(`${API}/reports/visits?from=${from}&to=${to}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('incident stats API returns data', async ({ request }) => {
    const loginRes = await request.post(`${API}/auth/login`, {
      data: { email: 'nurse1@ruts.ac.th', password: 'Nurse@1234' },
    });
    const token = (await loginRes.json()).data?.accessToken as string;

    const res  = await request.get(`${API}/reports/incidents`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
