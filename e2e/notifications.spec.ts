/**
 * Flow 7: Notifications
 */
import { test, expect } from '@playwright/test';
import { STORAGE_STATE } from './helpers/auth';

const API = 'http://localhost:4000/api/v1';

test.describe('Notifications — Student UI', () => {
  test.use({ storageState: STORAGE_STATE.student });

  test('notifications page is accessible', async ({ page }) => {
    await page.goto('/student/notifications');
    await expect(page).toHaveURL(/\/student\/notifications/);
    // Page should render (even if empty)
    await expect(page.locator('body')).toBeVisible();
  });

  test('notifications page shows a list or empty state', async ({ page }) => {
    await page.goto('/student/notifications');
    const hasItems   = await page.locator('[class*="notif"], [class*="card"], li').count() > 0;
    const hasEmpty   = await page.getByText(/ไม่มี|ว่าง|ยังไม่มี/).isVisible().catch(() => false);
    expect(hasItems || hasEmpty).toBe(true);
  });
});

test.describe('Notifications — API', () => {
  test('student can get notification list', async ({ request }) => {
    const loginRes = await request.post(`${API}/auth/login`, {
      data: { email: 'student1@ruts.ac.th', password: 'Student@1234' },
    });
    const token = (await loginRes.json()).data?.accessToken as string;

    const res  = await request.get(`${API}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data ?? [])).toBe(true);
  });

  test('student can get unread count', async ({ request }) => {
    const loginRes = await request.post(`${API}/auth/login`, {
      data: { email: 'student1@ruts.ac.th', password: 'Student@1234' },
    });
    const token = (await loginRes.json()).data?.accessToken as string;

    const res  = await request.get(`${API}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(typeof body.data?.count).toBe('number');
  });

  test('mark all as read → unread count becomes 0', async ({ request }) => {
    const loginRes = await request.post(`${API}/auth/login`, {
      data: { email: 'student1@ruts.ac.th', password: 'Student@1234' },
    });
    const token = (await loginRes.json()).data?.accessToken as string;

    // Mark all read
    const markRes = await request.patch(`${API}/notifications/read-all`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const markBody = await markRes.json();
    expect(markBody.success).toBe(true);

    // Verify count is 0
    const countRes  = await request.get(`${API}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const countBody = await countRes.json();
    expect(countBody.data?.count).toBe(0);
  });

  test('mark individual notification as read', async ({ request }) => {
    const loginRes = await request.post(`${API}/auth/login`, {
      data: { email: 'student1@ruts.ac.th', password: 'Student@1234' },
    });
    const token = (await loginRes.json()).data?.accessToken as string;

    // Get notifications
    const listRes = await request.get(`${API}/notifications?limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listBody = await listRes.json();
    const notifs: { id: string; isRead: boolean }[] = listBody.data ?? [];

    if (notifs.length === 0) {
      // No notifications to mark — test passes trivially
      return;
    }

    const notif = notifs[0];
    const readRes = await request.patch(`${API}/notifications/${notif.id}/read`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const readBody = await readRes.json();
    expect(readBody.success).toBe(true);
    expect(readBody.data?.isRead).toBe(true);
  });
});
