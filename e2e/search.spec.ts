import { test, expect } from '@playwright/test';

test.describe('Product Search', () => {
  test('should perform a positive and negative tag search and reflect in URL', async ({ page }) => {
    // 1. トップページにアクセス
    await page.goto('/');

    // 2. 検索ボックスを探して "test" と入力し、Enterキーを押す
    const searchInput = page.getByPlaceholder('タグで検索...');
    await searchInput.fill('test');
    await searchInput.press('Enter');

    // 3. 検索結果ページに遷移し、URLに "tags=test" が含まれることを確認
    await page.waitForURL('**/search?tags=test');

    // 4. ページタイトルに "検索結果" が含まれることを確認
    await expect(page).toHaveTitle(/検索結果/);

    // 5. "test" というタグが検索条件として表示されていることを確認
    // (実際のUI要素に応じてセレクタを調整する必要があります)
    await expect(page.locator('body')).toContainText('タグ: test');

    // 6. 除外タグの入力欄を探して "イラスト" と入力し、Enterキーを押す
    const negativeSearchInput = page.getByPlaceholder('除外するタグ...');
    await negativeSearchInput.fill('イラスト');
    await negativeSearchInput.press('Enter');

    // 7. URLが正しく更新され、両方のタグが含まれていることを確認
    await page.waitForURL('**/search?tags=3D&negativeTags=イラスト');

    // 8. ページ上の表示も更新されていることを確認
    // (実際のUI要素に応じてセレクタを調整する必要があります)
    await expect(page.locator('body')).toContainText('タグ: 3D');
    await expect(page.locator('body')).toContainText('除外タグ: イラスト');
  });
});
