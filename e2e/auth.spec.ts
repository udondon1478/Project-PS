import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  // TODO: Add full end-to-end tests for the login/logout flow.
  // This will require a mechanism to programmatically authenticate a test user,
  // such as an API endpoint for test setup or using session fixtures.
  // The current test is limited to a basic visibility check due to environmental constraints.
  test('should show a login button on the homepage', async ({ page }) => {
    // 1. トップページにアクセス
    await page.goto('/');

    // 2. ログインボタンが存在することを確認
    const loginButton = page.getByRole('button', { name: /ログイン/ });
    await expect(loginButton).toBeVisible();
  });
});
