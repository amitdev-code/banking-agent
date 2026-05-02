import { test as setup } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/admin.json');

setup('authenticate as admin', async ({ page }) => {
  const slug = process.env['E2E_TENANT_SLUG'] ?? 'hdfc-bangalore';
  const email = process.env['E2E_ADMIN_EMAIL'] ?? 'admin@hdfc-bangalore.com';
  const password = process.env['E2E_ADMIN_PASSWORD'] ?? 'Admin@1234';

  await page.goto('/login');
  await page.fill('input[placeholder*="hdfc"]', slug);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/);

  await page.context().storageState({ path: authFile });
});
