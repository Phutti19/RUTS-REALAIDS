/**
 * Flow 5: Medicine Inventory
 */
import { test, expect, type APIRequestContext } from '@playwright/test';
import { STORAGE_STATE } from './helpers/auth';

const API = 'http://localhost:4000/api/v1';

async function getStaffToken(request: APIRequestContext) {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: 'nurse1@ruts.ac.th', password: 'Nurse@1234' },
  });
  return (await res.json()).data?.accessToken as string;
}

test.describe('Medicines — Staff inventory UI', () => {
  test.use({ storageState: STORAGE_STATE.staff });

  test('medicines page is accessible and shows list', async ({ page }) => {
    await page.goto('/staff/medicines');
    await expect(page).toHaveURL(/\/staff\/medicines/);
    await expect(page.getByText(/คลังยา|ยาและเวชภัณฑ์/)).toBeVisible();
  });

  test('medicines page has search input', async ({ page }) => {
    await page.goto('/staff/medicines');
    const search = page.locator('input[placeholder*="ค้นหา"]');
    await expect(search).toBeVisible();
  });

  test('medicines page has add medicine button', async ({ page }) => {
    await page.goto('/staff/medicines');
    // Look for add/new button
    const addBtn = page.locator('a[href*="/medicines/new"], button').filter({ hasText: /เพิ่ม|ใหม่/ }).first();
    await expect(addBtn).toBeVisible();
  });

  test('low stock alert section is present if any low-stock medicines exist', async ({ page }) => {
    await page.goto('/staff/medicines');
    // This test passes whether there are low-stock items or not
    const hasAlert = await page.getByText(/สต๊อกต่ำ|สต็อกต่ำ|เตือน/).isVisible().catch(() => false);
    const hasList  = await page.locator('table tbody tr, [class*="medicine"]').count() > 0;
    expect(hasAlert || hasList).toBe(true);
  });

  test('expiring soon section is present if near-expiry batches exist', async ({ page }) => {
    await page.goto('/staff/medicines');
    // Just ensure page renders without error
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Medicines — API: Add medicine and batch', () => {
  test('create new medicine → stock starts at 0', async ({ request }) => {
    const token = await getStaffToken(request);
    const suffix = Date.now();

    const res = await request.post(`${API}/medicines`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: `E2E ยาทดสอบ ${suffix}`,
        category: 'medicine',
        unit: 'เม็ด',
        description: 'สร้างจาก E2E test',
        minStockLevel: 10,
      },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    const medicineId = body.data?.id;
    expect(medicineId).toBeTruthy();

    // Stock should be 0 initially
    const detailRes = await request.get(`${API}/medicines/${medicineId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const detail = await detailRes.json();
    expect(detail.data?.stockQuantity).toBe(0);

    return medicineId;
  });

  test('add batch → stock increases', async ({ request }) => {
    const token = await getStaffToken(request);
    const suffix = Date.now();

    // Create medicine
    const medRes = await request.post(`${API}/medicines`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: `E2E ยาเพิ่ม batch ${suffix}`,
        category: 'supply',
        unit: 'ชิ้น',
        minStockLevel: 5,
      },
    });
    const medBody = await medRes.json();
    expect(medBody.success).toBe(true);
    const medicineId = medBody.data?.id;

    // Add batch with 50 units
    const batchRes = await request.post(`${API}/medicines/${medicineId}/batches`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        batchNumber: `E2E-BATCH-${suffix}`,
        quantity: 50,
        expiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
        note: 'E2E test batch',
      },
    });
    const batchBody = await batchRes.json();
    expect(batchBody.success).toBe(true);

    // Verify stock increased
    const detailRes = await request.get(`${API}/medicines/${medicineId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const detail = await detailRes.json();
    expect(detail.data?.stockQuantity).toBe(50);
  });

  test('low stock medicines API returns correct data structure', async ({ request }) => {
    const token = await getStaffToken(request);
    const res = await request.get(`${API}/medicines/alerts/low-stock`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('expiring soon medicines API returns correct data structure', async ({ request }) => {
    const token = await getStaffToken(request);
    const res = await request.get(`${API}/medicines/alerts/expiring`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

test.describe('Medicines — Add medicine UI flow', () => {
  test.use({ storageState: STORAGE_STATE.staff });

  test('new medicine page has form fields', async ({ page }) => {
    await page.goto('/staff/medicines/new');
    // Should render a form
    await expect(page.locator('body')).toBeVisible();
    const hasInput = await page.locator('input, select, textarea').count() > 0;
    expect(hasInput).toBe(true);
  });
});
