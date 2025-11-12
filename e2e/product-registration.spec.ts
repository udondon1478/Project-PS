import { test, expect } from '@playwright/test';
import { mockSession, MOCK_ADMIN_USER } from './lib/auth';

// anonymous.spec.ts の形式に合わせて、テストで使用する定数を定義
const BOOTH_URL = 'https://booth.pm/ja/items/7522386';
const MOCK_PRODUCT_TITLE = 'Mocked Product Title';
const MOCK_SELLER_NAME = 'Mock Seller';
const TEST_TAG = 'テストタグ';
const ENCODED_TEST_TAG = encodeURIComponent(TEST_TAG);

const API_ITEMS_URL = '**/api/items';
const API_ITEMS_CREATE_URL = '**/api/items/create';
const API_TAGS_BY_TYPE_URL = '**/api/tags/by-type*';
const API_PRODUCTS_SEARCH_URL = `**/api/products?tags=${ENCODED_TEST_TAG}*`; // 検索クエリをより具体的に

// モックデータ
const MOCK_PRODUCT_INFO = {
  boothJpUrl: BOOTH_URL,
  boothEnUrl: 'https://booth.pm/en/items/12345',
  title: MOCK_PRODUCT_TITLE,
  description: 'Mocked product description.',
  lowPrice: 500,
  highPrice: 1500,
  publishedAt: new Date().toISOString(),
  sellerName: MOCK_SELLER_NAME,
  sellerUrl: 'https://seller.example.com',
  sellerIconUrl: 'https://via.placeholder.com/50',
  images: [{ imageUrl: 'https://via.placeholder.com/150', isMain: true, order: 0 }],
  variations: [{ name: 'Default', price: 500, type: 'download', order: 0, isMain: true }],
};

const MOCK_AGE_RATING_TAGS = [{ id: 'tag-age-1', name: '全年齢' }];
const MOCK_CATEGORY_TAGS = [{ id: 'tag-cat-1', name: 'アバター' }];

test.describe('Product Registration Flow', () => {

  test.beforeEach(async ({ page, context }) => {
    // 管理者としてログイン状態をモック
    await mockSession(context, MOCK_ADMIN_USER);

    // Step 1: Booth.pmから商品情報を取得するAPIをモック (app/api/items/route.ts)
    await page.route(API_ITEMS_URL, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          json: {
            status: 'new',
            productInfo: MOCK_PRODUCT_INFO,
          }
        });
      } else {
        await route.continue();
      }
    });

    // Step 2: 商品を登録するAPIをモック (app/api/items/create/route.ts)
    await page.route(API_ITEMS_CREATE_URL, async (route) => {
      await route.fulfill({
        status: 201,
        json: { id: 'new-prod-id', ...MOCK_PRODUCT_INFO, tags: [TEST_TAG] }
      });
    });
    
    // Step 2b: タグ選択肢をフェッチするAPIをモック (app/register-item/page.tsx)
    await page.route(API_TAGS_BY_TYPE_URL, async (route) => {
      const url = new URL(route.request().url());
      const categoryNames = url.searchParams.get('categoryNames');
      let data = [];
      if (categoryNames === 'age_rating') {
        data = MOCK_AGE_RATING_TAGS;
      } else if (categoryNames === 'product_category') {
        data = MOCK_CATEGORY_TAGS;
      } else if (categoryNames === 'feature') {
        data = []; // 'feature' タグは空でモック
      }
      await route.fulfill({ status: 200, json: data });
    });
  });

  // テストケース 2.3: 商品登録
  test('2.3: should allow an admin to register a new product', async ({ page }) => {
    // 商品登録ページにアクセス
    await page.goto('/register-item');

    // ステップ1 (URL入力) (app/register-item/components/URLInputForm.tsx)
    await page.getByPlaceholder('https://example.booth.pm/items/123456').fill(BOOTH_URL);
    await page.getByRole('button', { name: '商品情報を取得' }).click();

    // ステップ2 (詳細入力) (app/register-item/components/ProductDetailsForm.tsx)
    // ProductDetailsFormが表示され、自動入力されていることを確認
    await expect(page.getByRole('heading', { name: '商品情報の確認と登録' })).toBeVisible();
    await expect(page.getByText(MOCK_PRODUCT_TITLE)).toBeVisible();
    await expect(page.getByText(`by ${MOCK_SELLER_NAME}`)).toBeVisible();

    // カテゴリなどを選択 (getByLabel ではなく、SelectTriggerのIDやRoleを使う)
    // '対象年齢' の SelectTrigger をクリック
    await page.locator('button[role="combobox"][id="ageRating"]').click();
    // '全年齢' の SelectItem をクリック
    await page.getByRole('option', { name: '全年齢' }).click();

    // 'カテゴリー' の SelectTrigger をクリック
    await page.locator('button[role="combobox"][id="category"]').click();
    // 'アバター' の SelectItem をクリック
    await page.getByRole('option', { name: 'アバター' }).click();

    // 手動タグを追加（TagInputコンポーネントの操作）(app/register-item/components/TagInput.tsx)
    const tagInput = page.locator('input[type="text"][id="otherTags"]');
    await tagInput.fill(TEST_TAG);
    await tagInput.press('Enter');
    // Badge が表示されることを確認
    await expect(page.locator('span[data-slot="badge"]', { hasText: TEST_TAG })).toBeVisible();

    // 「商品を登録」ボタンをクリック
    await page.getByRole('button', { name: '商品を登録' }).click();

    // ステップ3 (完了) (app/register-item/components/CompletionScreen.tsx)
    await expect(page.getByRole('heading', { name: '処理完了' })).toBeVisible();
    await expect(page.getByText('商品が正常に登録されました。')).toBeVisible();

    // （可能であれば）登録した商品が検索結果に表示されることを確認
    // "別の商品を登録する" ボタンでフローをリセット
    await page.getByRole('button', { name: '別の商品を登録する' }).click();
    
    // 検索APIをモック (app/search/page.tsx -> lib/searchProducts.ts)
    await page.route(API_PRODUCTS_SEARCH_URL, async route => {
      // lib/searchProducts.ts は Product[] を返す
      await route.fulfill({
        json: [{ id: 'prod_new', title: MOCK_PRODUCT_TITLE, tags: [TEST_TAG], lowPrice: 500, highPrice: 1500, mainImageUrl: null }],
      });
    });

    // ヘッダーの検索バー (components/Header.tsx -> components/search/TagSearchBar.tsx)
    const searchInput = page.locator('input[placeholder="タグで検索 (-でマイナス検索)"]');
    
    // タグを入力してEnter
    await searchInput.fill(TEST_TAG);
    await searchInput.press('Enter');
    
    // Badge の確認
    await expect(page.locator('span', { hasText: TEST_TAG }).filter({ has: page.locator('button') })).toBeVisible();

    // 検索ボタンをクリック
    await page.getByRole('button', { name: '検索' }).click();

    // 検索結果ページへの遷移と結果の確認
    await page.waitForURL(`**/search?tags=${ENCODED_TEST_TAG}`);
    await expect(page).toHaveTitle(`タグ: ${TEST_TAG} -`);
    await expect(page.getByText(MOCK_PRODUCT_TITLE)).toBeVisible();
  });
});