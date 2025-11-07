import { test, expect } from '@playwright/test';
import { mockSession, MOCK_USER } from './lib/auth';

test.describe('Authenticated State Simulation', () => {
  test('should display user-specific UI when the session is mocked', async ({ page }) => {
    // 1. テスト開始前に、通常ユーザーとしてログインしている状態をモック
    await mockSession(page, MOCK_USER);

    // 2. トップページにアクセス
    await page.goto('/');

    // 3. ログイン後のUIが表示されていることを確認

    // 「プロフィール」ボタンが表示されていることを確認
    const profileButton = page.getByRole('button', { name: 'プロフィール' });
    await expect(profileButton).toBeVisible();

    // 「ログアウト」ボタンが表示されていることを確認
    const logoutButton = page.getByRole('button', { name: 'ログアウト' });
    await expect(logoutButton).toBeVisible();
  });
});
