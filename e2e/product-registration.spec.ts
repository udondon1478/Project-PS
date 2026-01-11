import { test, expect } from '@playwright/test';
import { mockSession, MOCK_ADMIN_USER } from './lib/auth';
import { prisma } from '../src/lib/prisma';

// anonymous.spec.ts の形式に合わせて、テストで使用する定数を定義
const BOOTH_URL = 'https://booth.pm/ja/items/7522386';
const MOCK_PRODUCT_TITLE = 'Mocked Product Title';
const MOCK_SELLER_NAME = 'Mock Seller';
const TEST_TAG = `テストタグ-${Date.now()}`;
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
  sellerIconUrl: '/pslogo.svg',
  images: [{ imageUrl: '/pslogo.svg', isMain: true, order: 0 }],
  variations: [{ name: 'Default', price: 500, type: 'download', order: 0, isMain: true }],
};

const MOCK_AGE_RATING_TAGS = [{ id: 'tag-age-1', name: '全年齢' }];
const MOCK_CATEGORY_TAGS = [{ id: 'tag-cat-1', name: 'アバター' }];

test.describe('Product Registration Flow', () => {
  // firefox対策でタイムアウトを延長
  test.setTimeout(60000);

  test.beforeEach(async ({ page, context }) => {
    // オンボーディングツアーをスキップ
    await page.addInitScript(() => {
      localStorage.setItem('guideline-onboarding-shown-register', 'true');
    });

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
      let data: any[] = [];
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
    try {
      // 商品登録ページにアクセス
      await page.goto('/register-item');

      // デバッグ: ページ遷移後のURLとタイトルを確認
      const currentUrl = page.url();
      const currentTitle = await page.title();
      console.log('[DEBUG] Current URL:', currentUrl);
      console.log('[DEBUG] Current Title:', currentTitle);

      // 認証失敗でログインページにリダイレクトされていないか確認
      if (currentUrl.includes('/api/auth/signin')) {
        throw new Error('Authentication failed: redirected to sign-in page');
      }

      // ステップ1 (URL入力) (app/register-item/components/URLInputForm.tsx)
      const urlInput = page.getByPlaceholder('https://example.booth.pm/items/123456');
      // 修正 (WebKit対策): focus -> fill -> blur の順で操作し、確実にイベントを発火させる
      await urlInput.click();
      await urlInput.fill(BOOTH_URL);
      await urlInput.blur();

      // 修正: 入力がReactのStateに反映され、DOM値が更新されるのを確実に待つ
      await expect(urlInput).toHaveValue(BOOTH_URL);

      // ボタンが有効になるのを明示的に待つ (WebKit対策)
      const fetchButton = page.getByRole('button', { name: '商品情報を取得' });
      await expect(fetchButton).toBeVisible();
      await expect(fetchButton).toBeEnabled();
      
      // UIの安定化を待つ（アニメーションやフォーカス移動対策）
      await page.waitForTimeout(500);
      // ボタンクリックの代わりにEnterキーで送信（より堅牢）
      await urlInput.press('Enter');

    // ✅ 商品情報ロード完了を待つ
    await page.waitForSelector('text=商品情報の確認と登録', { timeout: 10000 });

      // ステップ2 (詳細入力) (app/register-item/components/ProductDetailsForm.tsx)
      // ProductDetailsFormが表示され、自動入力されていることを確認
      await expect(page.getByText('商品情報の確認と登録')).toBeVisible();

      // ★追加: Onboardingが表示されていたら閉じる (localStorage設定が効かない場合への保険)
      try {
        const driverOverlay = page.locator('.driver-overlay');
        if (await driverOverlay.isVisible({ timeout: 2000 })) {
          console.log('[DEBUG] Closing driver overlay with Escape');
          await page.keyboard.press('Escape');
          await expect(driverOverlay).not.toBeVisible();
          await page.waitForTimeout(500); // 念のため待機
        }
      } catch (e) {
        console.log('[DEBUG] Driver overlay check error (ignoring):', e);
      }

      await expect(page.getByText(MOCK_PRODUCT_TITLE)).toBeVisible();
      await expect(page.getByText(`by ${MOCK_SELLER_NAME}`)).toBeVisible();

      // カテゴリなどを選択 (getByLabel ではなく、SelectTriggerのIDやRoleを使う)
      
      // '対象年齢' の SelectTrigger をクリック
      // 修正: nth(0) ではなく getByLabel で堅牢に指定
      const ageRatingTrigger = page.getByLabel('対象年齢');
      await expect(ageRatingTrigger).toBeVisible();
      // ローディング完了（有効化）を待つ
      await expect(ageRatingTrigger).toBeEnabled();
      // クリックの代わりにキーボード操作で開く（より確実）
      await ageRatingTrigger.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('option', { name: '全年齢' })).toBeVisible(); // オプションが表示されるのを待つ
      // クリックではなくキーボードで選択
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
      await expect(ageRatingTrigger).toHaveText(/全年齢/); // 選択が反映されているか確認


      // 'カテゴリー' の SelectTrigger を操作
      const categoryTrigger = page.getByLabel('カテゴリー');
      // 前のコンボボックスが完全に閉じるのを待つ
      await expect(page.locator('[role="listbox"]')).not.toBeVisible();
      await page.waitForTimeout(500);
      
      await expect(categoryTrigger).toBeEnabled();
      await categoryTrigger.focus();
      await page.keyboard.press('Enter');
      
      await expect(page.getByRole('option', { name: 'アバター' })).toBeVisible(); // オプションが表示されるのを待つ
      // クリックではなくキーボードで選択
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await expect(categoryTrigger).toHaveText(/アバター/); // 選択が反映されているか確認

      // 手動タグを追加（TagInputコンポーネントの操作）(app/register-item/components/TagInput.tsx)
      const tagInput = page.locator('input[type="text"][id="otherTags"]');
      await tagInput.fill(TEST_TAG);
      await tagInput.press('Enter');
      // Badge が表示されることを確認
      await expect(page.locator('span[data-slot="badge"]', { hasText: TEST_TAG })).toBeVisible();

      // 登録ボタンも念のため有効化を待つ (WebKit対策)
      const registerButton = page.getByRole('button', { name: '商品を登録' });
      await expect(registerButton).toBeEnabled();

      // キーボード操作対策: フォーカスを外すために別の場所をクリック
      await page.getByText('商品情報の確認と登録').first().click();
      await page.waitForTimeout(500);

      // 「商品を登録」ボタンをクリック (★ ここで実際のDBに書き込まれます)
      // ★修正2 (Chromium対策): ステータスコードのチェックを waitForResponse から除外
      // デバッグ: リクエストが送信されたか確認
      const createResponsePromise = page.waitForResponse(response => 
        response.url().includes('/api/items/create') && response.request().method() === 'POST'
      );

      await registerButton.click({ force: true });

      const response = await createResponsePromise;

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
      await expect(page).toHaveTitle(new RegExp(`タグ: ${TEST_TAG} -.*PolySeek`));
      
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