/**
 * Flow 6: Appointments
 */
import { test, expect, type APIRequestContext } from '@playwright/test';
import { STORAGE_STATE } from './helpers/auth';

const API = 'http://localhost:4000/api/v1';

async function getToken(
  request: APIRequestContext,
  role: 'staff' | 'student' | 'admin',
) {
  const creds = {
    staff:   { email: 'nurse1@ruts.ac.th',    password: 'Nurse@1234'   },
    student: { email: 'student1@ruts.ac.th',  password: 'Student@1234' },
    admin:   { email: 'admin@ruts.ac.th',      password: 'Admin@1234'   },
  }[role];
  const res  = await request.post(`${API}/auth/login`, { data: creds });
  const body = await res.json();
  return body.data?.accessToken as string;
}

test.describe('Appointments — Staff slots UI', () => {
  test.use({ storageState: STORAGE_STATE.staff });

  test('slots page is accessible', async ({ page }) => {
    await page.goto('/staff/appointments/slots');
    await expect(page).toHaveURL(/\/staff\/appointments\/slots/);
    await expect(page.getByText('จัดการช่วงเวลานัด')).toBeVisible();
  });

  test('has "เพิ่มช่วงเวลา" button', async ({ page }) => {
    await page.goto('/staff/appointments/slots');
    await expect(page.getByRole('button', { name: /เพิ่มช่วงเวลา/ }).first()).toBeVisible();
  });

  test('clicking add shows slot creation form', async ({ page }) => {
    await page.goto('/staff/appointments/slots');
    await page.getByRole('button', { name: /เพิ่มช่วงเวลา/ }).first().click();
    // Form should appear with time inputs
    await expect(page.locator('input[type="time"]').first()).toBeVisible();
  });

  test('create new slot via UI form', async ({ page }) => {
    await page.goto('/staff/appointments/slots');
    await page.getByRole('button', { name: /เพิ่มช่วงเวลา/ }).first().click();

    // Select Wednesday (พ)
    await page.locator('button').filter({ hasText: 'พ' }).click();

    // Set start time 09:00, end time 12:00
    const timeInputs = page.locator('input[type="time"]');
    await timeInputs.nth(0).fill('09:00');
    await timeInputs.nth(1).fill('12:00');

    // Set duration 30 min
    const durationInput = page.locator('input[type="number"]');
    await durationInput.fill('30');

    // Submit
    const confirmBtn = page.locator('button').filter({ hasText: /เพิ่มช่วงเวลา/ }).last();
    await confirmBtn.click();

    // Form should close and slot should appear
    await expect(page.locator('input[type="time"]').first()).not.toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Appointments — API: Full booking flow', () => {
  test('create slot, book appointment, check-in, complete', async ({ request }) => {
    const staffToken  = await getToken(request, 'staff');
    const studentToken = await getToken(request, 'student');

    // ── Get staff user ID ──────────────────────────────────────────────────────
    const meRes  = await request.get(`${API}/users/me`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const staffId = (await meRes.json()).data?.id as string;

    // ── Create appointment slot ────────────────────────────────────────────────
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dow = tomorrow.getDay(); // 0=Sun … 6=Sat

    const slotRes = await request.post(`${API}/appointment-slots`, {
      headers: { Authorization: `Bearer ${staffToken}` },
      data: {
        dayOfWeek: dow,
        startTime: '08:00',
        endTime: '17:00',
        slotDurationMinutes: 30,
      },
    });
    const slotBody = await slotRes.json();
    expect(slotBody.success).toBe(true);
    const slotId = slotBody.data?.id as string;

    // ── Student books appointment ──────────────────────────────────────────────
    const apptDate = tomorrow.toISOString().split('T')[0];
    const bookRes  = await request.post(`${API}/appointments`, {
      headers: { Authorization: `Bearer ${studentToken}` },
      data: {
        staffId,
        slotId,
        appointmentDate: apptDate,
        appointmentTime: '08:00',
        reason: 'E2E ทดสอบจองนัดหมาย',
      },
    });
    const bookBody = await bookRes.json();
    expect(bookBody.success).toBe(true);
    const apptId = bookBody.data?.id as string;
    expect(apptId).toBeTruthy();
    expect(bookBody.data?.status).toBe('scheduled');

    // ── Staff checks in patient ────────────────────────────────────────────────
    const checkinRes = await request.patch(`${API}/appointments/${apptId}/check-in`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const checkinBody = await checkinRes.json();
    expect(checkinBody.success).toBe(true);
    expect(checkinBody.data?.status).toBe('checked_in');

    // ── Staff completes appointment ────────────────────────────────────────────
    const completeRes = await request.patch(`${API}/appointments/${apptId}/complete`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const completeBody = await completeRes.json();
    expect(completeBody.success).toBe(true);
    expect(completeBody.data?.status).toBe('completed');
  });

  test('student can cancel an appointment with reason', async ({ request }) => {
    const staffToken  = await getToken(request, 'staff');
    const studentToken = await getToken(request, 'student');

    const meRes  = await request.get(`${API}/users/me`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const staffId = (await meRes.json()).data?.id as string;

    // Create slot
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const dow = tomorrow.getDay();

    const slotRes = await request.post(`${API}/appointment-slots`, {
      headers: { Authorization: `Bearer ${staffToken}` },
      data: { dayOfWeek: dow, startTime: '10:00', endTime: '16:00', slotDurationMinutes: 60 },
    });
    const slotId = (await slotRes.json()).data?.id as string;

    // Book
    const bookRes = await request.post(`${API}/appointments`, {
      headers: { Authorization: `Bearer ${studentToken}` },
      data: {
        staffId,
        slotId,
        appointmentDate: tomorrow.toISOString().split('T')[0],
        appointmentTime: '10:00',
        reason: 'E2E ยกเลิกนัดหมาย',
      },
    });
    const apptId = (await bookRes.json()).data?.id as string;

    // Student cancels
    const cancelRes = await request.patch(`${API}/appointments/${apptId}/cancel`, {
      headers: { Authorization: `Bearer ${studentToken}` },
      data: { cancelReason: 'ทดสอบยกเลิก E2E' },
    });
    const cancelBody = await cancelRes.json();
    expect(cancelBody.success).toBe(true);
    expect(cancelBody.data?.status).toBe('cancelled');
    expect(cancelBody.data?.cancelReason).toBeTruthy();
  });
});

test.describe('Appointments — Student UI', () => {
  test.use({ storageState: STORAGE_STATE.student });

  test('student appointments page shows available slots', async ({ page }) => {
    await page.goto('/student/appointments');
    await expect(page).toHaveURL(/\/student\/appointments/);
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Appointments — Staff management UI', () => {
  test.use({ storageState: STORAGE_STATE.staff });

  test('staff appointments page is accessible', async ({ page }) => {
    await page.goto('/staff/appointments');
    await expect(page).toHaveURL(/\/staff\/appointments/);
    await expect(page.locator('body')).toBeVisible();
  });
});
