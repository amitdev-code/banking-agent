import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('shows validation error on wrong credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder*="hdfc"]', 'test-bank');
    await page.fill('input[type="email"]', 'wrong@test.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Login failed,text=Unauthorized,text=401')).toBeVisible({ timeout: 5000 });
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder*="hdfc"]', process.env['E2E_TENANT_SLUG'] ?? 'hdfc-bangalore');
    await page.fill('input[type="email"]', process.env['E2E_ADMIN_EMAIL'] ?? 'admin@hdfc-bangalore.com');
    await page.fill('input[type="password"]', process.env['E2E_ADMIN_PASSWORD'] ?? 'Admin@1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
