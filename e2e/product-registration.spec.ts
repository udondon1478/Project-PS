import { test, expect } from '@playwright/test';
import { mockSession, MOCK_ADMIN_USER } from './lib/auth';

test.describe('Product Registration Flow', () => {

  test.beforeEach(async ({ page }) => {
    // 管理者としてログイン状態をモック
    await mockSession(page, MOCK_ADMIN_USER);

    // Step 1: Booth.pmから商品情報を取得するAPIをモック
    await page.route('**/api/items', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          status: 'new',
          productInfo: {
            boothJpUrl: 'https://booth.pm/ja/items/12345',
            title: 'Mocked Product Title',
            description: 'Mocked product description.',
            lowPrice: 500,
            highPrice: 1500,
            sellerName: 'Mock Seller',
            // ... other necessary fields
          }
        }
      });
    });

    // Step 2: 商品を登録するAPIをモック
    await page.route('**/api/items/create', async (route) => {
      await route.fulfill({
        status: 201,
        json: { message: '商品が正常に登録されました。' }
      });
    });
  });

  // テストケース 2.3: 商品登録
  test('2.3: should allow an admin to register a new product', async ({ page }) => {
    // 商品登録ページにアクセス
    await page.goto('/register-item');

    // ステップ1 (URL入力)
    await page.getByPlaceholder('https://booth.pm/ja/items/...').fill('https://booth.pm/ja/items/12345');
    await page.getByRole('button', { name: '商品情報を取得' }).click();

    // ステップ2 (詳細入力)
    // ProductDetailsFormが表示され、自動入力されていることを確認
    await expect(page.getByRole('heading', { name: '商品詳細の確認・編集' })).toBeVisible();
    await expect(page.getByLabel('タイトル')).toHaveValue('Mocked Product Title');
    await expect(page.getByLabel('価格(低)')).toHaveValue('500');

    // カテゴリなどを選択
    await page.getByLabel('対象年齢').selectOption({ label: '全年齢' });
    await page.getByLabel('カテゴリー').selectOption({ label: 'アバター' });
    // 手動タグを追加（TagInputコンポーネントの操作）
    const tagInput = page.getByPlaceholder('タグを入力...');
    await tagInput.fill('テストタグ');
    await tagInput.press('Enter');
    await expect(page.getByText('テストタグ')).toBeVisible();

    // 「商品を登録」ボタンをクリック
    await page.getByRole('button', { name: '商品を登録' }).click();

    // ステップ3 (完了)
    await expect(page.getByRole('heading', { name: '登録完了' })).toBeVisible();
    await expect(page.getByText('商品が正常に登録されました。')).toBeVisible();

    // （可能であれば）登録した商品が検索結果に表示されることを確認
    await page.getByRole('button', { name: 'トップページに戻る' }).click();

    // 検索APIをモックして、登録したタグを含む商品を返すようにする
    await page.route('**/api/products?*', async route => {
      await route.fulfill({
        json: {
          products: [{ id: 'prod_new', title: 'Mocked Product Title', productTags: [{ tag: { name: 'テストタグ' } }] }],
          totalCount: 1,
        }
      });
    });

    const searchInput = page.getByPlaceholder('タグで検索');
    await searchInput.fill('テストタグ');
    await searchInput.press('Enter');

    await page.waitForURL('**/search?tags=テストタグ');
    await expect(page.getByText('Mocked Product Title')).toBeVisible();
  });
});
