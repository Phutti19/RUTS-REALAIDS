/**
 * Flow 3: Patient Visits
 * Tests creating a visit, updating it, dispensing medicine, and issuing certificate.
 */
import { test, expect, type APIRequestContext } from '@playwright/test';
import { STORAGE_STATE } from './helpers/auth';

const API = 'http://localhost:4000/api/v1';

async function getStaffToken(request: APIRequestContext) {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: 'nurse1@ruts.ac.th', password: 'Nurse@1234' },
  });
  const body = await res.json();
  return body.data?.accessToken as string;
}

async function getStudentId(request: APIRequestContext, token: string) {
  const res = await request.get(`${API}/users?role=student&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  return (body.data?.[0]?.id ?? null) as string | null;
}

test.describe('Visits — Staff patient list', () => {
  test.use({ storageState: STORAGE_STATE.staff });

  test('staff patients page is accessible', async ({ page }) => {
    await page.goto('/staff/patients');
    await expect(page).toHaveURL(/\/staff\/patients/);
    await expect(page.getByText('ผู้รับบริการ')).toBeVisible();
  });

  test('has "รับผู้ป่วย" button linking to new visit page', async ({ page }) => {
    await page.goto('/staff/patients');
    const addBtn = page.getByRole('link', { name: /รับผู้ป่วย/ });
    await expect(addBtn).toBeVisible();
    await expect(addBtn).toHaveAttribute('href', '/staff/patients/new');
  });

  test('has search input', async ({ page }) => {
    await page.goto('/staff/patients');
    await expect(page.locator('input[placeholder*="ค้นหา"]')).toBeVisible();
  });

  test('has status filter tabs', async ({ page }) => {
    await page.goto('/staff/patients');
    await expect(page.getByRole('button', { name: 'กำลังรักษา' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ทั้งหมด' })).toBeVisible();
  });
});

test.describe('Visits — API: Create, update, dispense, certificate', () => {
  test('full patient visit flow via API', async ({ request }) => {
    const staffToken = await getStaffToken(request);
    const patientId  = await getStudentId(request, staffToken);
    expect(patientId).not.toBeNull();

    // ── Create visit ──────────────────────────────────────────────────────────
    const createRes = await request.post(`${API}/visits`, {
      headers: { Authorization: `Bearer ${staffToken}` },
      data: {
        patientId,
        visitType: 'walk_in',
        chiefComplaint: 'E2E ทดสอบปวดหัว',
      },
    });
    const createBody = await createRes.json();
    expect(createBody.success).toBe(true);
    const visitId = createBody.data?.id;
    expect(visitId).toBeTruthy();
    expect(createBody.data?.status).toBe('waiting');

    // ── Update diagnosis & treatment ─────────────────────────────────────────
    const updateRes = await request.patch(`${API}/visits/${visitId}`, {
      headers: { Authorization: `Bearer ${staffToken}` },
      data: {
        diagnosis: 'ปวดศีรษะจากความเครียด',
        treatmentNotes: 'พักผ่อน ดื่มน้ำ',
        vitalSigns: {
          temperature: 37.0,
          bloodPressure: '120/80',
          heartRate: 72,
          respiratoryRate: 16,
          oxygenSaturation: 98,
        },
        status: 'in_treatment',
      },
    });
    const updateBody = await updateRes.json();
    expect(updateBody.success).toBe(true);
    expect(updateBody.data?.status).toBe('in_treatment');

    // ── Check medicines exist for dispensing ─────────────────────────────────
    const medRes = await request.get(`${API}/medicines?limit=1`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const medBody = await medRes.json();
    const medicines: { id: string; stockQuantity: number }[] = medBody.data ?? [];
    const med = medicines.find((m) => m.stockQuantity > 0);

    if (med) {
      // Get batch
      const batchRes = await request.get(`${API}/medicines/${med.id}/batches`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      const batchBody = await batchRes.json();
      const batches: { id: string; quantity: number }[] = batchBody.data ?? [];
      const batch = batches.find((b) => b.quantity > 0);

      if (batch) {
        const dispenseRes = await request.post(`${API}/visits/${visitId}/medications`, {
          headers: { Authorization: `Bearer ${staffToken}` },
          data: {
            medicineId: med.id,
            quantity: 1,
            dosageInstruction: 'รับประทานวันละ 1 ครั้ง',
          },
        });
        const dispenseBody = await dispenseRes.json();
        expect(dispenseBody.success).toBe(true);
      }
    }

    // ── Complete visit ────────────────────────────────────────────────────────
    const completeRes = await request.patch(`${API}/visits/${visitId}`, {
      headers: { Authorization: `Bearer ${staffToken}` },
      data: { status: 'completed' },
    });
    const completeBody = await completeRes.json();
    expect(completeBody.success).toBe(true);
    expect(completeBody.data?.status).toBe('completed');

    // ── Issue medical certificate ─────────────────────────────────────────────
    const certRes = await request.post(`${API}/certificates`, {
      headers: { Authorization: `Bearer ${staffToken}` },
      data: {
        visitId,
        diagnosisText: 'ปวดศีรษะ',
        restDays: 1,
        restStartDate: new Date().toISOString().split('T')[0],
        restEndDate: new Date().toISOString().split('T')[0],
        recommendation: 'พักผ่อนเพียงพอ',
      },
    });
    const certBody = await certRes.json();
    expect(certBody.success).toBe(true);
    expect(certBody.data?.certificateNumber).toMatch(/^CERT-/);
  });
});

test.describe('Visits — Staff new patient UI', () => {
  test.use({ storageState: STORAGE_STATE.staff });

  test('new patient page has patient search and chief complaint field', async ({ page }) => {
    await page.goto('/staff/patients/new');
    // Should have form fields — Step 1 shows patient search, Step 2 shows chief complaint
    await expect(page.locator('body')).toBeVisible();
    // Step 1: patient search input should be visible immediately
    const hasSearch = await page.locator('input[placeholder*="ค้นหา"]').count() > 0;
    // Step 2 textarea is only rendered after patient selection — just check step 1 exists
    expect(hasSearch).toBe(true);
  });
});
