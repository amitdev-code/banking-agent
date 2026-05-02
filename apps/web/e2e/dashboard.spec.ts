import { test, expect } from '@playwright/test';

test.use({
  storageState: 'e2e/.auth/admin.json',
});

test.describe('Dashboard — Analysis Run', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('3-panel layout is visible', async ({ page }) => {
    await expect(page.locator('text=Workflow Progress')).toBeVisible();
    await expect(page.locator('text=Results')).toBeVisible();
    await expect(page.locator('button', { hasText: 'Run Analysis' })).toBeVisible();
  });

  test('agent mode run triggers workflow steps animation', async ({ page }) => {
    await page.click('button[data-mode="agent"]');
    await page.click('button', { hasText: 'Run Analysis' });

    // Workflow panel should show steps progressing
    await expect(page.locator('text=planner,text=Planner')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=fetchCustomers,text=Fetch Customers')).toBeVisible({ timeout: 30000 });

    // Wait for completion
    await expect(page.locator('text=Analysis Complete')).toBeVisible({ timeout: 120000 });
  });

  test('customer cards appear after completion', async ({ page }) => {
    await page.click('button', { hasText: 'Run Analysis' });
    await expect(page.locator('text=Analysis Complete')).toBeVisible({ timeout: 120000 });
    const cards = page.locator('[data-testid="customer-card"]');
    await expect(cards.first()).toBeVisible();
  });
});
