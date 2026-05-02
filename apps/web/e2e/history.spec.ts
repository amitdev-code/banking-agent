import { test, expect } from '@playwright/test';

test.use({
  storageState: 'e2e/.auth/admin.json',
});

test.describe('History', () => {
  test('history page lists past runs', async ({ page }) => {
    await page.goto('/history');
    await expect(page.locator('h1', { hasText: 'Analysis History' })).toBeVisible();
  });

  test('view results navigates to replay page', async ({ page }) => {
    await page.goto('/history');
    const viewBtn = page.locator('a', { hasText: 'View Results' }).first();
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
      await expect(page).toHaveURL(/\/history\/.+/);
      await expect(page.locator('text=Results')).toBeVisible();
    } else {
      test.skip();
    }
  });
});
