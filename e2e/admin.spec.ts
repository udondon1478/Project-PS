import { test, expect } from '@playwright/test';
import { mockSession, MOCK_ADMIN_USER, MOCK_USER } from './lib/auth';

test.describe('Admin Dashboard Access Control', () => {

  // テストケース 3.1: 管理者ユーザー
  test('3.1: should allow an admin user to access the admin dashboard', async ({ page }) => {
    // 管理者としてログイン状態をモック
    await mockSession(page, MOCK_ADMIN_USER);

    // /admin にアクセス
    await page.goto('/admin');

    // 管理者ダッシュボードが正しく表示されることを確認
    // 注: 実際のダッシュボードのタイトルや要素に合わせてください
    await expect(page.getByRole('heading', { name: '管理者ダッシュボード' })).toBeVisible();
    await expect(page.getByText('タグ管理')).toBeVisible();
  });

  // テストケース 3.1: 一般ユーザー
  test('3.1: should redirect a non-admin user away from the admin dashboard', async ({ page }) => {
    // 一般ユーザーとしてログイン状態をモック
    await mockSession(page, MOCK_USER);

    // /admin にアクセス
    await page.goto('/admin');

    // トップページなどにリダイレクトされ、管理者画面にアクセスできないことを確認
    await expect(page).not.toHaveURL('/admin');
    await expect(page).toHaveURL('/'); // トップページへのリダイレクトを期待

    // 管理者ダッシュボードの要素が表示されていないことも確認
    await expect(page.getByRole('heading', { name: '管理者ダッシュボード' })).not.toBeVisible();
  });
});
