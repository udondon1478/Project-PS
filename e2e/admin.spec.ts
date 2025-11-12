import { test, expect } from '@playwright/test';
import { mockSession, MOCK_ADMIN_USER, MOCK_USER } from './lib/auth';

test.describe('Admin Dashboard Access Control', () => {

  // テストケース 3.1: 管理者ユーザー
  // 'page' に加えて 'context' を受け取るように変更
  test('3.1: should allow an admin user to access the admin dashboard', async ({ page, context }) => {
    
    // ★ 修正点: 'page' ではなく 'context' を使ってモック
    await mockSession(context, MOCK_ADMIN_USER);

    // /admin にアクセス
    await page.goto('/admin');

    // サーバーがクッキーを認識し、リダイレクトしないため、管理者画面が表示される
    await expect(page.getByRole('heading', { name: '管理者画面' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'タグ一覧' })).toBeVisible();
  });

  // テストケース 3.1: 一般ユーザー
  // 'page' に加えて 'context' を受け取るように変更
  test('3.1: should redirect a non-admin user away from the admin dashboard', async ({ page, context }) => {
    
    // ★ 修正点: 'page' ではなく 'context' を使ってモック
    await mockSession(context, MOCK_USER);

    // /admin にアクセス
    await page.goto('/admin');

    // サーバーが一般ユーザーとしてクッキーを認識し、リダイレクトを実行する
    await expect(page).not.toHaveURL('/admin');
    await expect(page).toHaveURL('/'); // トップページへのリダイレクトを期待

    // 管理者ダッシュボードの要素が表示されていないことも確認
    await expect(page.getByRole('heading', { name: '管理者画面' })).not.toBeVisible();
  });
});