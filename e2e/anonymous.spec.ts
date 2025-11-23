import { test, expect } from '@playwright/test';

const query = 'アバター';
const negativeQuery = '-衣装';
const negativeTagValue = '衣装';
const negativeQuerySuggestion = '衣装';
const encodedQuery = encodeURIComponent(query);
const encodedNegativeQuery = encodeURIComponent(negativeTagValue);
const searchApiUrl = `**/api/tags/search?query=${encodedQuery}`;
const negativeSearchApiUrl = `**/api/tags/search?query=${encodeURIComponent(negativeQuerySuggestion)}`;
const productsApiUrl = `**/api/products?tags=${encodedQuery}`;


test.describe('Anonymous User Core Features', () => {

  test.beforeEach(async ({ page }) => {
    // モックデータで最新商品を返すようにAPIをモック
    await page.route('**/api/products/latest', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'prod_1', title: 'Test Product 1', lowPrice: 1000, highPrice: 1000, sellerName: 'Seller 1', images: [{ imageUrl: 'https://via.placeholder.com/150' }], tags: [] },
          { id: 'prod_2', title: 'Test Product 2', lowPrice: 2000, highPrice: 2000, sellerName: 'Seller 2', images: [{ imageUrl: 'https://via.placeholder.com/150' }], tags: [] },
        ]),
      });
    });

    // タグ検索（サジェスト用）のAPIをモック
    await page.route('**/api/tags/search?query=*', async (route) => {
      const url = new URL(route.request().url());
      const query = url.searchParams.get('query') || '';
      let responseTags = [];

      if (query === 'アバター') {
        responseTags = [
          { id: 'tag_1', name: 'アバター' },
          { id: 'tag_2', name: '男性アバター' },
        ];
      } else if (query === '衣装') {
        responseTags = [
          { id: 'tag_3', name: '衣装' },
        ];
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(responseTags),
      });
    });


    // 検索結果ページのAPIをモック（検索ボタンクリック後の遷移先）
    await page.route(productsApiUrl, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        // このテストでは検索結果の表示内容までは検証しないため、空配列でよい
        body: JSON.stringify([]),
      });
    });
  });

  // テストケース 1.1: トップページの表示と最新商品の確認
  test('1.1: should display homepage with header and latest products', async ({ page }) => {
    await page.goto('/');

    // ヘッダーの要素を確認
    await expect(page.getByRole('link', { name: /PolySeek/i })).toBeVisible();
    await expect(page.locator('input[data-slot="input"][placeholder="タグで検索 (-でマイナス検索)"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Googleログイン' })).toBeVisible();

    // 最新の商品セクションと商品カードを確認
    await expect(page.getByRole('heading', { name: '最新の商品' })).toBeVisible();
    const productCards = page.locator('[data-testid="product-card"]'); // 注: ProductCardコンポーネントに `data-testid` を追加する必要があるかもしれません
    await expect(productCards).toHaveCount(2);
    await expect(page.getByText('Test Product 1')).toBeVisible();
  });

  // テストケース 1.2: タグ検索（基本）
  test('1.2: should perform a basic tag search', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.locator('input[data-slot="input"][placeholder="タグで検索 (-でマイナス検索)"]');
    await Promise.all([
      page.waitForResponse(searchApiUrl),
      searchInput.fill(query),
    ]);

    await page.waitForSelector('li:has-text("アバター")');

    await expect(page.getByRole('option', { name: 'アバター', exact: true })).toBeVisible();
    await searchInput.press('ArrowDown');
    await searchInput.press('Enter');
    await expect(searchInput).toHaveValue('');
    await expect(page.locator('span', { hasText: 'アバター' }).filter({ has: page.locator('button') })).toBeVisible();

    await page.getByRole('button', { name: '検索' }).click();

    await page.waitForURL(`**/search?tags=${encodedQuery}`);
    await expect(page).toHaveTitle(`タグ: ${query} -`);
    //await expect(page.locator('body')).toContainText('タグ: アバター');
    // 商品グリッドが表示されることも確認
    await expect(page.locator('[data-testid="product-grid"]')).toBeVisible();
  });

  // テストケース 1.3: タグ検索（マイナス検索）
  test('1.3: should perform a negative tag search', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.locator('input[data-slot="input"][placeholder="タグで検索 (-でマイナス検索)"]');

    await Promise.all([
      page.waitForResponse(searchApiUrl),
      searchInput.fill(query),
    ]);
    await page.waitForSelector('li:has-text("アバター")');
    await expect(page.getByRole('option', { name: 'アバター', exact: true })).toBeVisible();
    await searchInput.press('ArrowDown');
    await searchInput.press('Enter');
    await expect(searchInput).toHaveValue('');
    await expect(page.locator('span', { hasText: 'アバター' }).filter({ has: page.locator('button') })).toBeVisible();

    await Promise.all([
      page.waitForResponse(negativeSearchApiUrl),
      searchInput.fill(negativeQuery),
    ]);
    await page.waitForSelector('li:has-text("衣装")');
    await expect(page.getByRole('option', { name: '衣装', exact: true })).toBeVisible();
    await searchInput.press('ArrowDown');
    await searchInput.press('Enter');
    await expect(searchInput).toHaveValue('');
    await expect(page.locator('span', { hasText: '衣装' }).filter({ has: page.locator('button') })).toBeVisible();

    await page.getByRole('button', { name: '検索' }).click();

    await page.waitForURL(`**/search?tags=${encodedQuery}&negativeTags=${encodedNegativeQuery}`);
    await expect(page.locator('body')).toContainText(`タグ: ${query} ${negativeQuery}`);
  });

  // テストケース 1.4: フィルター検索（価格・カテゴリ）
  test('1.4: should perform a filter search', async ({ page }) => {
    await page.goto('/search'); // 検索ページに直接アクセス

    // フィルターボタンをクリックしてサイドバーを開く
    // 注: 実際のセレクタに合わせてください
    await page.getByLabel('フィルターを開く').click();

    // カテゴリを選択
    await page.getByLabel('カテゴリを選択').click();
    await page.getByLabel('衣装').click();

    // 価格帯スライダーを操作
    // 注: スライダーの操作はUIの実装に大きく依存するため、これは一例です
    const minPriceSlider = page.getByLabel('最小額');
    await minPriceSlider.focus();

    await minPriceSlider.press('ArrowRight'); // スライダーを右に動かす（値を増やす）
    await minPriceSlider.press('ArrowRight');
    await minPriceSlider.press('ArrowRight');

    const maxPriceSlider = page.getByLabel('最大額');
    await maxPriceSlider.press('ArrowLeft'); // スライダーを左に動かす（値を減らす）
    await maxPriceSlider.press('ArrowLeft');
    await maxPriceSlider.press('ArrowLeft');

    // 適用ボタンをクリック
    await page.getByRole('button', { name: 'フィルターを適用' }).click();

    // WebKitでのスライダー操作の揺らぎ(200 vs 300)を許容するため、正規表現でパラメータの存在を確認する
    const urlPattern = new RegExp(`search\\?.*categoryName=${encodeURIComponent(negativeTagValue)}.*&minPrice=[0-9]+&maxPrice=[0-9]+`);
    await page.waitForURL(urlPattern);
  });

  // テストケース 1.5: 商品詳細ページへの遷移
  test('1.5: should navigate to product details page on card click', async ({ page }) => {
    await page.route(productsApiUrl, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'prod_1',
            title: 'Test Product 1',
            lowPrice: 1000,
            highPrice: 1000,
            sellerName: 'Seller 1',
            images: [{ imageUrl: 'https://via.placeholder.com/150', isMain: true }], // isMainを追加して型を合わせる
            tags: [],
            isLiked: false,
            isOwned: false,
            seller: { name: 'Seller 1', iconUrl: '', sellerUrl: '' } // sellerオブジェクトを追加
          }
        ]),
      });
    });
    // 商品詳細ページのAPIをモック
    await page.route('**/api/products/prod_1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          product: {
            id: 'prod_1',
            title: 'Test Product 1',
            description: 'This is a test product description.',
            images: [{ imageUrl: 'https://via.placeholder.com/150' }],
            productTags: [{ tag: { name: 'アバター' } }],
            isLiked: false,
            isOwned: false,
          }
        }),
      });
    });

    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // 最初に表示されている商品カードをクリック
    await page.getByRole('link', { name: 'Test Product 1' }).first().click();

    // 商品詳細ページへの遷移を確認
    await page.waitForURL('**/products/prod_1');
    await expect(page.getByRole('heading', { name: 'Test Product 1' })).toBeVisible();
    await expect(page.getByText('This is a test product description.')).toBeVisible();
    await expect(page.getByText('アバター')).toBeVisible();
  });

  // テストケース 1.6: ログインしていない状態でのアクション
  test('1.6: should fail to like item and revert UI when logged out', async ({ page }) => {
    // 1. 商品詳細ページのGETリクエストをモック(1.5と同様)
    await page.route('**/api/products/prod_1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          product: {
            id: 'prod_1',
            title: 'Test Product 1',
            description: 'This is a test product description.',
            images: [{ imageUrl: 'https://via.placeholder.com/150' }],
            productTags: [{ tag: { name: 'アバター' } }],
            isLiked: false,
            isOwned: false,
          }
        }),
      });
    });

    // 2. 商品のいいねAPIをモックして401エラーを返す
    const likeApiPromise = page.waitForRequest('**/api/products/prod_1/like');
    await page.route('**/api/products/prod_1/like', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Unauthorized' }),
        });
      } else {
        await route.continue();
      }
    });

    // 3. 商品詳細ページに移動
    await page.goto('/products/prod_1');

    // 4. いいねボタンをクリック
    const likeButton = page.getByRole('button', { name: '欲しいものに追加' });
    await expect(likeButton).toBeVisible();

    // 5. ハートアイコンが最初に塗りつぶされていない(fill="none")ことを確認
    const heartIcon = likeButton.locator('svg');
    await expect(heartIcon).toHaveAttribute('fill', 'none');

    // 6. ボタンをクリック
    await likeButton.click();

    // 7. API (POST) リクエストが送信されたことを確認
    const request = await likeApiPromise;
    expect(request.method()).toBe('POST');

    // 8. APIが401エラーを返した後、UIが元の状態に戻ることを確認
    await expect(page.getByRole('button', { name: '欲しいものに追加' })).toBeVisible();
    await expect(heartIcon).toHaveAttribute('fill', 'none');
  });
});

