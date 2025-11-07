import { test, expect } from '@playwright/test';
import { mockSession, MOCK_USER } from './lib/auth';

test.describe('Product Search (Authenticated)', () => {
  test('should perform a search while logged in', async ({ page }) => {
    // 1. 一般ユーザーとしてログイン状態をモック
    await mockSession(page, MOCK_USER);

    // 2. トップページにアクセス
    await page.goto('/');

    // 3. ログイン状態が反映されていることを軽く確認
    const myPageLink = page.getByRole('link', { name: 'マイページ' });
    await expect(myPageLink).toBeVisible();

    // 4. 検索ボックスに "3D" と入力し、Enterキーを押す
    const searchInput = page.getByPlaceholder('タグで検索...');
    await searchInput.fill('3D');
    await searchInput.press('Enter');

    // 5. 検索結果ページに遷移し、URLに "tags=3D" が含まれることを確認
    await page.waitForURL('**/search?tags=3D');

    // 6. ページタイトルに "検索結果" が含まれることを確認
    await expect(page).toHaveTitle(/検索結果/);

    // 7. 検索結果ページでもログイン状態が維持されていることを確認
    await expect(myPageLink).toBeVisible();

    // 8. 検索条件が表示されていることを確認
    await expect(page.locator('body')).toContainText('タグ: 3D');
  });
});
