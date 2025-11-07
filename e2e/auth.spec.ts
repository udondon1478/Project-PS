import { test, expect } from '@playwright/test';
import { mockSession, MOCK_USER } from './lib/auth';

test.describe('Authenticated State Simulation', () => {
  test('should display user-specific UI when the session is mocked', async ({ page }) => {
    // 1. テスト開始前に、通常ユーザーとしてログインしている状態をモック
    await mockSession(page, MOCK_USER);

    // 2. トップページにアクセス
    await page.goto('/');

    // 3. ログイン後のUIが表示されていることを確認

    // "ログイン" ボタンは表示されていないはず
    await expect(page.getByRole('button', { name: /ログイン/ })).not.toBeVisible();

    // ユーザーメニューに表示される "マイページ" へのリンクが表示されているはず
    // 注: 実際のUI構造によっては、まずユーザーメニューを開く操作が必要
    const myPageLink = page.getByRole('link', { name: 'マイページ' });
    await expect(myPageLink).toBeVisible();

    // ユーザー名を含むボタンが表示されているはず
    // MOCK_USER.nameがnullでないことをTypeScriptに伝えるために `!` を使用
    const userMenuButton = page.getByRole('button', { name: MOCK_USER.name! });
    await expect(userMenuButton).toBeVisible();
  });
});
