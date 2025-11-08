import { test, expect } from '@playwright/test';

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
  });

  // テストケース 1.1: トップページの表示と最新商品の確認
  test('1.1: should display homepage with header and latest products', async ({ page }) => {
    await page.goto('/');

    // ヘッダーの要素を確認
    await expect(page.getByRole('link', { name: /PolySeek/i })).toBeVisible();
    await expect(page.getByPlaceholder('タグで検索 (-でマイナス検索)')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Googleログイン' })).toBeVisible();

    // 最新の商品セクションと商品カードを確認
    await expect(page.getByRole('heading', { name: '最新の商品' })).toBeVisible();
    const productCards = page.locator('[data-testid="product-card"]'); // 注: ProductCardコンポーネントに `data-testid` を追加する必要があるかもしれません
    await expect(productCards).toHaveCount(2);
    await expect(page.getByText('Test Product 1')).toBeVisible();
  });

  // テストケース 1.2: タグ検索（基本）
  test('1.2: should perform a basic tag search', async ({ page }) => {

    const query = 'アバター';
    const encodedQuery = encodeURIComponent(query);
    const searchApiUrl = `**/api/tags/search?query=${encodedQuery}`;
    const productsApiUrl = `**/api/products?tags=${encodedQuery}`;

    // タグ検索（サジェスト用）のAPIをモック
    await page.route(searchApiUrl, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'tag_1', name: 'アバター' },
          { id: 'tag_2', name: '男性アバター' },
        ]),
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

    await page.goto('/');

    const searchInput = page.getByPlaceholder('タグで検索 (-でマイナス検索)');

    await Promise.all([
      page.waitForResponse(searchApiUrl),
      searchInput.fill(query),
    ]);

    await expect(page.getByRole('listitem', { name: 'アバター' }).first()).toBeVisible();
    await searchInput.press('Enter');
    await expect(searchInput).toHaveValue('');
    await expect(page.locator('span', { hasText: 'アバター' }).filter({ has: page.locator('button') })).toBeVisible();

    await page.getByRole('button', { name: '検索' }).click();

    await page.waitForURL(`**/search?tags=${encodedQuery}`);
    await expect(page).toHaveTitle(/検索結果/);
    //await expect(page.locator('body')).toContainText('タグ: アバター');
    // 商品グリッドが表示されることも確認
    await expect(page.locator('[data-testid="product-grid"]')).toBeVisible();
  });

  // テストケース 1.3: タグ検索（マイナス検索）
  test('1.3: should perform a negative tag search', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.getByPlaceholder('タグで検索 (-でマイナス検索)');
    await searchInput.fill('アバター -衣装');
    await page.getByRole('button', { name: '検索' }).click();

    await page.waitForURL('**/search?tags=アバター&negativeTags=衣装');
    await expect(page.locator('body')).toContainText('タグ: アバター');
    await expect(page.locator('body')).toContainText('除外タグ: 衣装');
  });

  // テストケース 1.4: フィルター検索（価格・カテゴリ）
  test('1.4: should perform a filter search', async ({ page }) => {
    await page.goto('/search'); // 検索ページに直接アクセス

    // フィルターボタンをクリックしてサイドバーを開く
    // 注: 実際のセレクタに合わせてください
    await page.getByRole('button', { name: 'フィルター' }).click();

    // カテゴリを選択
    await page.getByLabel('カテゴリ').selectOption({ label: '衣装' });

    // 価格帯スライダーを操作
    // 注: スライダーの操作はUIの実装に大きく依存するため、これは一例です
    const minPriceSlider = page.locator('[aria-label="Minimum price"]');
    await minPriceSlider.fill('1000');
    const maxPriceSlider = page.locator('[aria-label="Maximum price"]');
    await maxPriceSlider.fill('3000');

    // 適用ボタンをクリック
    await page.getByRole('button', { name: 'フィルターを適用' }).click();

    // URLを確認
    await page.waitForURL('**/search?*categoryName=衣装&minPrice=1000&maxPrice=3000*');
    await expect(page).toHaveURL(/categoryName=衣装/);
    await expect(page).toHaveURL(/minPrice=1000/);
    await expect(page).toHaveURL(/maxPrice=3000/);
  });

  // テストケース 1.5: 商品詳細ページへの遷移
  test('1.5: should navigate to product details page on card click', async ({ page }) => {
    // 商品詳細ページのAPIをモック
    await page.route('**/api/products/prod_1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'prod_1',
          title: 'Test Product 1',
          description: 'This is a test product description.',
          images: [{ imageUrl: 'https://via.placeholder.com/150' }],
          productTags: [{ tag: { name: 'アバター' } }],
        }),
      });
    });

    await page.goto('/');

    // 最初に表示されている商品カードをクリック
    await page.getByText('Test Product 1').click();

    // 商品詳細ページへの遷移を確認
    await page.waitForURL('**/products/prod_1');
    await expect(page.getByRole('heading', { name: 'Test Product 1' })).toBeVisible();
    await expect(page.getByText('This is a test product description.')).toBeVisible();
    await expect(page.getByText('アバター')).toBeVisible();
  });

  // テストケース 1.6: ログインしていない状態でのアクション
  test('1.6: should redirect to login page when liking an item while logged out', async ({ page }) => {
    await page.goto('/products/prod_1');

    // 「いいね」ボタンをクリック
    // on('request') でリダイレクトを待機
    const [request] = await Promise.all([
      page.waitForRequest(req => req.url().includes('/api/auth/signin')),
      page.getByRole('button', { name: 'いいね' }).click(),
    ]);

    // ログインページへのリクエストが行われたことを確認
    expect(request).toBeDefined();
  });
});
