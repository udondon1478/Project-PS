import { test, expect } from '@playwright/test';

test('homepage has Polyseek in title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Polyseek/);
});
