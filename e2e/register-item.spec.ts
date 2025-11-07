import { test, expect } from '@playwright/test';
import { mockSession, MOCK_ADMIN_USER } from './lib/auth';

test.describe('Product Registration Page', () => {
  test('should be accessible to an admin user', async ({ page }) => {
    // 1. 管理者としてログイン状態をモック
    await mockSession(page, MOCK_ADMIN_USER);

    // 2. 商品登録ページにアクセス
    await page.goto('/register-item');

    // 3. ページタイトルが正しいことを確認
    await expect(page).toHaveTitle(/商品登録/);

    // 4. 主要な要素（URL入力フォームなど）が表示されていることを確認
    const urlInput = page.getByPlaceholder('https://booth.pm/ja/items/...');
    await expect(urlInput).toBeVisible();

    const submitButton = page.getByRole('button', { name: '情報を取得' });
    await expect(submitButton).toBeVisible();
  });

  test('should redirect a non-admin user', async ({ page }) => {
    // (オプション) 一般ユーザーでアクセスした場合にリダイレクトされることのテスト
    // この機能が実装されている場合、このようなテストも追加すると良い
  });
});
