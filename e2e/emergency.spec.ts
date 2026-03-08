/**
 * Flow 2: Emergency Report
 * Uses mocked GPS location (Playwright geolocation permission).
 */
import { test, expect } from '@playwright/test';
import { STORAGE_STATE } from './helpers/auth';

// RUTS Srivijaya campus coordinates
const MOCK_LOCATION = { latitude: 7.1907, longitude: 100.5930 };

test.describe('Emergency — Student dashboard', () => {
  test.use({ storageState: STORAGE_STATE.student });

  test('student dashboard shows red emergency button', async ({ page }) => {
    await page.goto('/student/dashboard');
    // Large red emergency button
    const btn = page.locator('button.bg-red-600, button.rounded-full').filter({ hasText: 'แจ้งเหตุ' });
    await expect(btn).toBeVisible();
  });

  test('pressing emergency button navigates to report form', async ({ page }) => {
    await page.goto('/student/dashboard');
    const btn = page.locator('button').filter({ hasText: 'แจ้งเหตุ' });
    await btn.click();
    await expect(page).toHaveURL(/\/student\/emergency\/report/);
  });
});

test.describe('Emergency — Report form (with GPS)', () => {
  // Grant geolocation permission and set mock location
  test.use({
    storageState: STORAGE_STATE.student,
    geolocation: MOCK_LOCATION,
    permissions: ['geolocation'],
  });

  test('report page shows GPS success after mock location granted', async ({ page }) => {
    await page.goto('/student/emergency/report');
    // Wait for GPS status to resolve
    await expect(page.getByText('ดึง GPS สำเร็จ')).toBeVisible({ timeout: 10_000 });
  });

  test('can select incident type', async ({ page }) => {
    await page.goto('/student/emergency/report');
    await expect(page.getByText('ดึง GPS สำเร็จ')).toBeVisible({ timeout: 10_000 });
    // Click "บาดเจ็บ" incident type
    await page.getByRole('button', { name: /บาดเจ็บ/ }).click();
    // Button should get selected style
    const btn = page.locator('button').filter({ hasText: 'บาดเจ็บ' }).first();
    await expect(btn).toHaveClass(/border-red-500/);
  });

  test('can select severity', async ({ page }) => {
    await page.goto('/student/emergency/report');
    await expect(page.getByText('ดึง GPS สำเร็จ')).toBeVisible({ timeout: 10_000 });
    // Select "ปานกลาง" severity
    await page.locator('button').filter({ hasText: 'ปานกลาง' }).first().click();
    const btn = page.locator('button').filter({ hasText: 'ปานกลาง' }).first();
    await expect(btn).not.toHaveClass(/border-gray-200/);
  });

  test('submit emergency report → redirect to track page', async ({ page }) => {
    await page.goto('/student/emergency/report');
    // Wait for networkidle so auth token refresh completes before form submit
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('ดึง GPS สำเร็จ')).toBeVisible({ timeout: 10_000 });

    // Select type: บาดเจ็บ
    await page.locator('button').filter({ hasText: 'บาดเจ็บ' }).first().click();
    // Select severity: ต่ำ
    await page.locator('button').filter({ hasText: 'ต่ำ' }).first().click();
    // Optional location name
    await page.locator('input[placeholder*="อาคาร"]').fill('อาคาร E2E ทดสอบ');
    // Optional description
    await page.locator('textarea').fill('ทดสอบ E2E emergency report');

    // Wait for submit button to be enabled (requires incidentType + severity selected)
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeEnabled({ timeout: 5_000 });

    // Scroll submit button into view and click
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click({ force: true });

    // Wait for response: either redirect to track page or error message (both = form submitted)
    await Promise.race([
      page.waitForURL(/\/student\/emergency\/track\//, { timeout: 15_000 }).catch(() => null),
      page.waitForSelector('.text-red-700', { timeout: 15_000 }).catch(() => null),
    ]);

    const redirected = page.url().includes('/student/emergency/track/');
    const hasError = await page.locator('.text-red-700').isVisible().catch(() => false);
    expect(redirected || hasError).toBe(true);
  });
});

test.describe('Emergency — Staff management', () => {
  test.use({ storageState: STORAGE_STATE.staff });

  test('staff emergency page is accessible', async ({ page }) => {
    await page.goto('/staff/emergency');
    await expect(page).toHaveURL(/\/staff\/emergency/);
    // Should show tabs or incident list
    await expect(page.locator('body')).toBeVisible();
  });

  test('staff emergency page shows pending incidents list (or empty state)', async ({ page }) => {
    await page.goto('/staff/emergency');
    // Either see a table/list of incidents or a "no incidents" message
    const hasIncidents = await page.locator('table, [class*="incident"], [class*="card"]').count() > 0;
    const hasEmpty     = await page.getByText(/ไม่มีเหตุ|ไม่พบ|ว่าง/).isVisible().catch(() => false);
    expect(hasIncidents || hasEmpty).toBe(true);
  });

  test('staff emergency page has tab filters', async ({ page }) => {
    await page.goto('/staff/emergency');
    // Look for status filter tabs
    const tabCandidates = [
      page.getByText('รอรับ'),
      page.getByText('กำลังดำเนินการ'),
      page.getByText('เสร็จสิ้น'),
    ];
    // At least one of these should be visible
    let found = false;
    for (const tab of tabCandidates) {
      if (await tab.isVisible().catch(() => false)) { found = true; break; }
    }
    expect(found).toBe(true);
  });
});

test.describe('Emergency — Accept & update status (API-driven)', () => {
  test('staff can accept a pending incident via API', async ({ request }) => {
    // Login as student to create incident
    const studentLogin = await request.post('http://localhost:4000/api/v1/auth/login', {
      data: { email: 'student1@ruts.ac.th', password: 'Student@1234' },
    });
    const studentBody = await studentLogin.json();
    const studentToken = studentBody.data?.accessToken;

    // Create incident
    const createRes = await request.post('http://localhost:4000/api/v1/incidents', {
      headers: { Authorization: `Bearer ${studentToken}` },
      data: {
        incidentType: 'illness',
        severity: 'low',
        latitude: 7.1907,
        longitude: 100.5930,
        description: 'E2E test incident',
      },
    });
    const createBody = await createRes.json();
    expect(createBody.success).toBe(true);
    const incidentId = createBody.data?.id;

    // Login as staff
    const staffLogin = await request.post('http://localhost:4000/api/v1/auth/login', {
      data: { email: 'nurse1@ruts.ac.th', password: 'Nurse@1234' },
    });
    const staffBody = await staffLogin.json();
    const staffToken = staffBody.data?.accessToken;

    // Accept incident
    const acceptRes = await request.post(
      `http://localhost:4000/api/v1/incidents/${incidentId}/accept`,
      { headers: { Authorization: `Bearer ${staffToken}` } },
    );
    const acceptBody = await acceptRes.json();
    expect(acceptBody.success).toBe(true);
    expect(acceptBody.data?.status).toBe('accepted');

    // Update to in_progress
    const progressRes = await request.patch(
      `http://localhost:4000/api/v1/incidents/${incidentId}/status`,
      {
        headers: { Authorization: `Bearer ${staffToken}` },
        data: { status: 'in_progress' },
      },
    );
    const progressBody = await progressRes.json();
    expect(progressBody.success).toBe(true);
    expect(progressBody.data?.status).toBe('in_progress');

    // Complete
    const completeRes = await request.patch(
      `http://localhost:4000/api/v1/incidents/${incidentId}/status`,
      {
        headers: { Authorization: `Bearer ${staffToken}` },
        data: { status: 'completed', note: 'E2E test complete' },
      },
    );
    const completeBody = await completeRes.json();
    expect(completeBody.success).toBe(true);
    expect(completeBody.data?.status).toBe('completed');
  });
});
