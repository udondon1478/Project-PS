import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './lib/auth';

test.describe('Authentication Flow', () => {
  test('should allow a user to log in and see user-specific UI, then log out', async ({ page }) => {
    // 1. カスタムヘルパーを使ってプログラムでログイン
    await loginAsTestUser(page, 'test@example.com');

    // 2. サイトにアクセス
    // ログイン処理でCookieを設定した後、ページに移動する
    await page.goto('/');

    // 3. ログイン後のUIが表示されていることを確認
    // "ログイン" ボタンが表示されていないこと
    await expect(page.getByRole('button', { name: /ログイン/ })).not.toBeVisible();

    // "マイページ" へのリンクまたはボタンが表示されていること
    // 注: 実際のコンポーネントのテキストやroleに合わせてセレクタを調整
    const myPageLink = page.getByRole('link', { name: 'マイページ' });
    await expect(myPageLink).toBeVisible();

    // 4. ログアウト処理
    // ユーザーメニューを開くボタン（例：ユーザーアイコンや名前が表示されているボタン）をクリック
    // 注: 実際のセレクタに合わせてください
    const userMenuButton = page.getByRole('button', { name: /Test User/i });
    await userMenuButton.click();

    // ドロップダウンメニューから "ログアウト" ボタンをクリック
    const logoutButton = page.getByRole('menuitem', { name: 'ログアウト' });
    await logoutButton.click();

    // 5. ログアウトが完了し、ホームページにリダイレクトされたことを確認
    await page.waitForURL('/');

    // 6. ログアウト後のUIが表示されていることを確認
    // "ログイン" ボタンが再び表示されていること
    await expect(page.getByRole('button', { name: /ログイン/ })).toBeVisible();

    // "マイページ" へのリンクが表示されていないこと
    await expect(myPageLink).not.toBeVisible();
  });
});
