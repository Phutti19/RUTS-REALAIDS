/**
 * Flow 10: Responsive Design
 * Tests at iPhone SE (375px), iPad (768px), Desktop (1920px).
 */
import { test, expect } from '@playwright/test';
import { STORAGE_STATE } from './helpers/auth';

test.describe('Responsive — Student dashboard', () => {
  test.use({ storageState: STORAGE_STATE.student });

  test('375px (iPhone SE) — no horizontal scroll on student dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/student/dashboard');
    await page.waitForLoadState('networkidle');

    const scrollWidth  = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth  = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // 5px tolerance
  });

  test('375px — emergency button is visible and tappable', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/student/dashboard');

    const btn = page.locator('button').filter({ hasText: 'แจ้งเหตุ' });
    await expect(btn).toBeVisible();

    const box = await btn.boundingBox();
    expect(box).not.toBeNull();
    // Button should be reasonably large (≥ 80px) for touch
    expect(box!.width).toBeGreaterThanOrEqual(80);
    expect(box!.height).toBeGreaterThanOrEqual(80);
  });

  test('375px — bottom nav bar is visible', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/student/dashboard');

    // Student layout has a fixed bottom nav — check for nav links
    const homeLink = page.getByRole('link', { name: /หน้าหลัก|Home/ });
    const apptLink = page.getByRole('link', { name: /นัดหมาย/ });
    const hasNav = (await homeLink.isVisible().catch(() => false)) ||
                   (await apptLink.isVisible().catch(() => false));
    expect(hasNav).toBe(true);
  });
});

test.describe('Responsive — Staff dashboard', () => {
  test.use({ storageState: STORAGE_STATE.staff });

  test('768px (iPad) — staff sidebar is accessible', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/staff/dashboard');
    await page.waitForLoadState('networkidle');
    // Sidebar or mobile menu should be present
    const hasSidebar = await page.locator('aside, [class*="sidebar"], [class*="nav"]').count() > 0;
    expect(hasSidebar).toBe(true);
  });

  test('768px — no horizontal scroll on staff dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/staff/dashboard');
    await page.waitForLoadState('networkidle');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  test('1920px (Desktop) — staff layout renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/staff/dashboard');
    await page.waitForLoadState('networkidle');

    // Sidebar should be visible at desktop width
    const sidebar = page.locator('aside, [class*="sidebar"]').first();
    await expect(sidebar).toBeVisible();
  });

  test('1920px — staff nav links are visible in sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/staff/dashboard');

    // Key nav items
    for (const label of ['แดชบอร์ด', 'เหตุฉุกเฉิน', 'ผู้ป่วย']) {
      // Use first() to handle cases where multiple elements match the label
      const link = page.getByText(label, { exact: true }).first().or(
        page.getByRole('link', { name: label }).first()
      );
      await expect(link.first()).toBeVisible();
    }
  });
});

test.describe('Responsive — Login page', () => {
  test('375px — login form fits without horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  test('375px — login button is visible and full-width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');

    const btn = page.getByRole('button', { name: 'เข้าสู่ระบบ' });
    await expect(btn).toBeVisible();
    const box = await btn.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(200);
  });
});
