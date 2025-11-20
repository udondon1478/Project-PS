import { test, expect } from '@playwright/test';
import { mockSession, MOCK_ADMIN_USER } from './lib/auth';
import { prisma } from '../src/lib/prisma';

// ランダムなIDを生成 (現在時刻 + ランダム数値)
const RANDOM_ID = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 10000);
// テストごとにユニークなURLになる
const BOOTH_URL = `https://booth.pm/ja/items/${RANDOM_ID}`;
const MOCK_PRODUCT_TITLE = 'Mocked Product Title';
const MOCK_SELLER_NAME = 'Mock Seller';
const TEST_TAG = 'テストタグ';
const ENCODED_TEST_TAG = encodeURIComponent(TEST_TAG);

const API_ITEMS_URL = '**/api/items';

const API_TAGS_BY_TYPE_URL = '**/api/tags/by-type*';


// モックデータ
const MOCK_PRODUCT_INFO = {
  boothJpUrl: BOOTH_URL,
  boothEnUrl: 'https://booth.pm/en/items/7522386',
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
  // firefox対策でタイムアウトを延長
  test.setTimeout(60000);

  test.beforeEach(async ({ page, context }) => {
    // 1. Seed required data for the API to work
    await prisma.tagCategory.upsert({
      where: { name: 'other' },
      update: {},
      create: { name: 'other', color: '#999999' },
    });

    // ★ FIX: Seed 'age_rating' category and tag to match frontend mock
    const ageRatingCat = await prisma.tagCategory.upsert({
      where: { name: 'age_rating' },
      update: {},
      create: { name: 'age_rating', color: '#CCCCCC' },
    });
    await prisma.tag.upsert({
      where: { name: '全年齢' }, // ← name に統一
      update: { id: 'tag-age-1', tagCategoryId: ageRatingCat.id },
      create: {
        id: 'tag-age-1',
        name: '全年齢',
        language: 'ja',
        tagCategoryId: ageRatingCat.id,
  },
    });

    // ★ FIX: Seed 'product_category' category and tag to match frontend mock
    const prodCat = await prisma.tagCategory.upsert({
      where: { name: 'product_category' },
      update: {},
      create: { name: 'product_category', color: '#00CC99' },
    });

    await prisma.tag.upsert({
      where: { name: 'アバター' }, // Use name as unique identifier
      update: { id: 'tag-cat-1', tagCategoryId: prodCat.id },
      create: { 
        id: 'tag-cat-1', 
        name: 'アバター', 
        language: 'ja', 
        tagCategoryId: prodCat.id 
      },
    });
    
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
    // 修正：空配列ではなくカテゴリ情報を返す
    data = [
      {
        id: 'feature-other',
        name: 'その他',     // 実際の name に合わせて調整
        color: '#ccc'
      }
    ];
  }

  await route.fulfill({ status: 200, json: data });
});
  });

// テストケース 2.3: 商品登録
  test('2.3: should allow an admin to register a new product', async ({ page }) => {
    try {
      // 商品登録ページにアクセス
      await page.goto('/register-item');

      // ステップ1 (URL入力) (app/register-item/components/URLInputForm.tsx)
      const urlInput = page.getByPlaceholder('https://example.booth.pm/items/123456');
      // 修正 (WebKit対策): focus -> fill -> blur の順で操作し、確実にイベントを発火させる
      await urlInput.click();
      await urlInput.pressSequentially(BOOTH_URL, { delay: 10 });
      await urlInput.blur();

      // 修正: 入力がReactのStateに反映され、DOM値が更新されるのを確実に待つ
      await expect(urlInput).toHaveValue(BOOTH_URL);

      // ボタンが有効になるのを明示的に待つ (WebKit対策)
      const fetchButton = page.getByRole('button', { name: '商品情報を取得' });
      await expect(fetchButton).toBeEnabled();
      await fetchButton.click();

    // ✅ 商品情報ロード完了を待つ
    await page.waitForSelector('text=商品情報の確認と登録', { timeout: 10000 });

      // ステップ2 (詳細入力) (app/register-item/components/ProductDetailsForm.tsx)
      // ProductDetailsFormが表示され、自動入力されていることを確認
      await expect(page.getByText('商品情報の確認と登録')).toBeVisible();
      await expect(page.getByText(MOCK_PRODUCT_TITLE)).toBeVisible();
      await expect(page.getByText(`by ${MOCK_SELLER_NAME}`)).toBeVisible();

      // カテゴリなどを選択 (getByLabel ではなく、SelectTriggerのIDやRoleを使う)
      // '対象年齢' の SelectTrigger をクリック
      //await page.locator('button[role="combobox"][id="ageRating"]').click();
      // '全年齢' の SelectItem をクリック
      const ageRatingTrigger = page.locator('button[role="combobox"]').nth(0); // IDではなく順序やラベルで特定推奨だが、現状のID依存ならそのままでも可
      await ageRatingTrigger.click();
      await expect(page.getByRole('option', { name: '全年齢' })).toBeVisible(); // オプションが表示されるのを待つ
      await page.getByRole('option', { name: '全年齢' }).click();
      await page.waitForTimeout(200); // コンボボックス閉じアニメーション待ち



      // 'カテゴリー' の SelectTrigger をクリック
      const categoryTrigger = page.locator('button[role="combobox"]').nth(1);
      await categoryTrigger.click();
      await expect(page.getByRole('option', { name: 'アバター' })).toBeVisible(); // オプションが表示されるのを待つ
      await page.getByRole('option', { name: 'アバター' }).click();

      // 手動タグを追加（TagInputコンポーネントの操作）(app/register-item/components/TagInput.tsx)
      const tagInput = page.locator('input[type="text"][id="otherTags"]');
      await tagInput.fill(TEST_TAG);
      await tagInput.press('Enter');
      // Badge が表示されることを確認
      await expect(page.locator('span[data-slot="badge"]', { hasText: TEST_TAG })).toBeVisible();

      // 登録ボタンも念のため有効化を待つ (WebKit対策)
      const registerButton = page.getByRole('button', { name: '商品を登録' });
      await expect(registerButton).toBeEnabled();

      // 「商品を登録」ボタンをクリック (★ ここで実際のDBに書き込まれます)
      // ★修正2 (Chromium対策): ステータスコードのチェックを waitForResponse から除外
      // これにより、エラー(500等)が返ってきた場合にタイムアウトせず即座に検知可能にする
      const createResponsePromise = page.waitForResponse(response => 
        response.url().includes('/api/items/create')
      );

      await registerButton.click();

      const response = await createResponsePromise;

      // レスポンスの内容をログに出力（デバッグ用）
      if (response.status() !== 201) {
        console.log('Create API Error Body:', await response.text());
      }

      // ステータスコードを検証
      expect(response.status()).toBe(201);

      // ステップ3 (完了) (app/register-item/components/CompletionScreen.tsx)
      await page.waitForSelector('text=処理完了', { timeout: 500000 });
      await expect(page.getByText('商品が正常に登録されました。')).toBeVisible();

      // "別の商品を登録する" ボタンでフローをリセット
      await page.getByRole('button', { name: '別の商品を登録する' }).click();
      await page.waitForSelector('input[placeholder="https://example.booth.pm/items/123456"]', { timeout: 5000 });

      
      // ★ 2. 削除: 検索APIのモックを削除
      // await page.route(API_PRODUCTS_SEARCH_URL, ...);

      // ヘッダーの検索バー (components/Header.tsx -> components/search/TagSearchBar.tsx)
      const searchInput = page.locator('input[placeholder="タグで検索 (-でマイナス検索)"]');
      
      // タグを入力してEnter
      await searchInput.fill(TEST_TAG);
      await searchInput.press('Enter');
      
      // Badge の確認
      await expect(page.locator('span', { hasText: TEST_TAG }).filter({ has: page.locator('button') })).toBeVisible();

      // 検索ボタンをクリック (★ ここで実際のDBが検索されます)
      await page.getByRole('button', { name: '検索' }).click();

      // 検索結果ページへの遷移と結果の確認
      await page.waitForURL(`**/search?tags=${ENCODED_TEST_TAG}`);
      await expect(page).toHaveTitle(`タグ: ${TEST_TAG} -`);
      
      // ★ 実際のDBを検索した結果が表示されることを確認
      await expect(page.getByText(MOCK_PRODUCT_TITLE)).toBeVisible();

    } finally {
      // ★ 3. テストデータのクリーンアップ
      // 登録された商品を削除 (関連する ProductTag もカスケード削除される)
      await prisma.product.deleteMany({
        where: {
          boothJpUrl: BOOTH_URL 
        }
      });

      // 作成されたタグを削除 (Sellerは他のテストで使われる可能性があるため残す)
      await prisma.tag.deleteMany({
        where: {
          name: TEST_TAG
        }
      });
    }
  });
});