import { test, expect } from '@playwright/test';
import { encodeQuery } from './helpers/url';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

// テストごとにユニークなIDを生成するためのヘルパー
const generateUniqueId = () => randomUUID().split('-')[0];

test.describe('Anonymous User Core Features', () => {
  let uniqueId: string;
  let query: string;
  let negativeTag: string;
  let negativeQuery: string;
  let userId: string;
  let prodId1: string;
  let prodId2: string;
  let prodTitle1: string;
  let prodTitle2: string;
  let prodId3: string;
  let prodTitle3: string;

  test.beforeEach(async ({ page }) => {
    uniqueId = generateUniqueId();
    query = `アバター-${uniqueId}`;
    negativeTag = `衣装-${uniqueId}`;
    negativeQuery = `-${negativeTag}`;
    userId = `user_${uniqueId}`;
    prodId1 = `prod_1_${uniqueId}`;
    prodId2 = `prod_2_${uniqueId}`;
    prodTitle1 = `Test Product 1 ${uniqueId}`;
    prodTitle2 = `Test Product 2 ${uniqueId}`;
    prodId3 = `prod_3_${uniqueId}`;
    prodTitle3 = `Test Product 3 ${uniqueId}`;

    // デバッグ用ログ（必要に応じて有効化）
    // page.on('request', request => console.log('>>', request.method(), request.url()));

    // テストデータ作成
    const user = await prisma.user.create({
      data: {
        id: userId,
        email: `test-seller-${uniqueId}@example.com`,
        name: `Seller ${uniqueId}`,
        role: 'USER',
      }
    });

    const tag1 = await prisma.tag.create({
      data: { name: query, language: 'ja' }
    });

    const tag2 = await prisma.tag.create({
      data: {
        name: negativeTag,
        language: 'ja',
        tagCategory: {
          connectOrCreate: {
            where: { name: 'product_category' },
            create: { name: 'product_category', color: 'blue' }
          }
        }
      }
    });

    // '全年齢'タグを取得または作成（APIがこのタグを持つ商品のみを返すため）
    const allAgeTag = await prisma.tag.upsert({
      where: { name: '全年齢' },
      update: {},
      create: {
        name: '全年齢',
        language: 'ja',
        tagCategory: {
          connectOrCreate: {
            where: { name: 'age_rating' },
            create: { name: 'age_rating', color: 'gray' }
          }
        }
      }
    });

    await prisma.product.create({
      data: {
        id: prodId1,
        title: prodTitle1,
        lowPrice: 1000,
        highPrice: 1000,
        boothJpUrl: `https://booth.pm/ja/items/111111${uniqueId}`,
        boothEnUrl: `https://booth.pm/en/items/111111${uniqueId}`,
        userId: user.id,
        productTags: {
          create: [
            {
              tagId: tag1.id,
              userId: user.id
            },
            {
              tagId: allAgeTag.id,
              userId: user.id
            }
          ]
        },
        images: {
          create: {
            imageUrl: '/pslogo.svg',
            isMain: true
          }
        },
        publishedAt: new Date(),
      }
    });

    await prisma.product.create({
      data: {
        id: prodId2,
        title: prodTitle2,
        lowPrice: 2000,
        highPrice: 2000,
        boothJpUrl: `https://booth.pm/ja/items/222222${uniqueId}`,
        boothEnUrl: `https://booth.pm/en/items/222222${uniqueId}`,
        userId: user.id,
        productTags: {
          create: [
            {
              tagId: tag2.id,
              userId: user.id
            },
            {
              tagId: allAgeTag.id,
              userId: user.id
            }
          ]
        },
        images: {
          create: {
            imageUrl: '/pslogo.svg',
            isMain: true
          }
        },
        publishedAt: new Date(),
      }
    });

    await prisma.product.create({
      data: {
        id: prodId3,
        title: prodTitle3,
        lowPrice: 50000,
        highPrice: 50000,
        boothJpUrl: `https://booth.pm/ja/items/333333${uniqueId}`,
        boothEnUrl: `https://booth.pm/en/items/333333${uniqueId}`,
        userId: user.id,
        productTags: {
          create: [
            {
              tagId: tag2.id,
              userId: user.id
            },
            {
              tagId: allAgeTag.id,
              userId: user.id
            }
          ]
        },
        images: {
          create: {
            imageUrl: '/pslogo.svg',
            isMain: true
          }
        },
        publishedAt: new Date(),
      }
    });

    // オンボーディングツアーをスキップ
    await page.addInitScript(() => {
      localStorage.setItem('onboarding_completed', 'true');
    });
  });

  test.afterEach(async () => {
    // クリーンアップ
    // 各削除処理を独立して行い、一部が失敗しても他が実行されるようにする
    const safeDelete = async (label: string, deleteFn: () => Promise<any>) => {
      try {
        await deleteFn();
      } catch (error) {
        // レコードが存在しない場合のエラーは許容するが、それ以外は警告ログを出す
        console.warn(`[Teardown] Failed to cleanup ${label}:`, error);
      }
    };

    // ProductTagの削除
    // ProductTagの削除
    const tagNames = [query, negativeTag].filter(Boolean) as string[];
    const prodIds = [prodId1, prodId2, prodId3].filter(Boolean) as string[];

    if (tagNames.length > 0 || prodIds.length > 0) {
      await safeDelete('ProductTag', () => prisma.productTag.deleteMany({
        where: {
          OR: [
            { tag: { name: { in: tagNames } } },
            { product: { id: { in: prodIds } } }
          ]
        }
      }));
    }
    
    // Productの削除
    // Productの削除
    if (prodIds.length > 0) {
      await safeDelete('Product', () => prisma.product.deleteMany({
        where: { id: { in: prodIds } }
      }));
    }

    // Tagの削除
    // Tagの削除
    if (tagNames.length > 0) {
      await safeDelete('Tag', () => prisma.tag.deleteMany({
        where: { name: { in: tagNames } }
      }));
    }

    // Userの削除
    if (userId) {
      await safeDelete('User', () => prisma.user.deleteMany({
        where: { id: userId }
      }));
    }
  });

  // テストケース 1.1: トップページの表示と最新商品の確認
  test('1.1: should display homepage with header and latest products', async ({ page }) => {
    await page.goto('/');

    // ヘッダーの要素を確認
    await expect(page.getByRole('banner').getByRole('link', { name: /PolySeek/i })).toBeVisible();
    await expect(page.locator('input[data-slot="input"][placeholder="タグで検索 (-でマイナス検索)"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible();

    // 最新の商品セクションと商品カードを確認
    await expect(page.getByRole('heading', { name: '最新の商品' })).toBeVisible();
    await expect(page.locator('[data-testid="product-grid"]')).toBeVisible();
    await expect(page.getByText(prodTitle1)).toBeVisible();
    await expect(page.getByText(prodTitle2)).toBeVisible();
  });

  // テストケース 1.2: タグ検索（基本）
  test('1.2: should perform a basic tag search', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.locator('input[data-slot="input"][placeholder="タグで検索 (-でマイナス検索)"]');
    await searchInput.fill(query);

    await page.waitForSelector(`li:has-text("${query}")`);

    await expect(page.getByRole('option', { name: query, exact: true })).toBeVisible();
    await searchInput.press('ArrowDown');
    await searchInput.press('Enter');
    await expect(searchInput).toHaveValue('');
    await expect(page.locator('span', { hasText: query }).filter({ has: page.locator('button') })).toBeVisible();

    await page.getByRole('button', { name: '検索' }).click();

    await expect(page).toHaveTitle(`タグ: ${query} - PolySeek`);
    
    await expect(page.locator('[data-testid="product-grid"]')).toBeVisible();
    // 検索結果に商品が含まれているか確認
    await expect(page.getByText(prodTitle1)).toBeVisible();
  });

  // テストケース 1.3: タグ検索（マイナス検索）
  test('1.3: should perform a negative tag search', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.locator('input[data-slot="input"][placeholder="タグで検索 (-でマイナス検索)"]');

    await searchInput.fill(query);
    await page.waitForSelector(`li:has-text("${query}")`);
    await expect(page.getByRole('option', { name: query, exact: true })).toBeVisible();
    await searchInput.press('ArrowDown');
    await searchInput.press('Enter');
    await expect(searchInput).toHaveValue('');
    await expect(page.locator('span', { hasText: query }).filter({ has: page.locator('button') })).toBeVisible();

    await searchInput.fill(negativeQuery);
    await page.waitForSelector(`li:has-text("${negativeTag}")`);
    await expect(page.getByRole('option', { name: negativeTag, exact: true })).toBeVisible();
    await searchInput.press('ArrowDown');
    await searchInput.press('Enter');
    await expect(searchInput).toHaveValue('');
    await expect(page.locator('span', { hasText: negativeTag }).filter({ has: page.locator('button') })).toBeVisible();

    await page.getByRole('button', { name: '検索' }).click();

    await expect(page).toHaveTitle(`タグ: ${query} -${negativeTag} - PolySeek`);

    await expect(page.locator('[data-testid="product-grid"]')).toBeVisible();
    
    // prod_1はqueryタグを持つので表示される
    await expect(page.getByText(prodTitle1)).toBeVisible();
    // prod_2はnegativeTagを持つので表示されない
    await expect(page.getByText(prodTitle2)).not.toBeVisible();
  });

  // テストケース 1.4: フィルター検索（価格・カテゴリ）
  test('1.4: should perform a filter search', async ({ page }) => {
    await page.goto('/search'); // 検索ページに直接アクセス

    // フィルタリング前に両方の商品が表示されているか確認は難しい（ページネーション等の影響）
    // とりあえずフィルタリング処理を進める

    // フィルターボタンをクリックしてサイドバーを開く
    await page.getByLabel('フィルターを開く').click();
    await expect(page.getByText('フィルター', { exact: true })).toBeVisible();

    // カテゴリを選択 (negativeTagを持つ商品に絞る -> prodId2(2,000) と prodId3(50,000))
    await page.getByLabel('カテゴリを選択').click();
    await page.getByLabel(negativeTag).click();

    // 価格帯スライダーを操作
    // 50,000円を除外したいので、最大価格を大幅に下げる
    // デフォルトの最大値が不明だが、ArrowLeftを多めに押すことで下げる
    const maxPriceSlider = page.getByLabel('最大額');
    await maxPriceSlider.focus();
    
    // 現在の最大値から確実に50,000円以下になるように操作
    // 現在の最大値から待機しながら値を下げていく
    // 確実に10,000未満になるまで操作する（10,000だとフィルタ無効扱いになるため）
    // タイムアウト付きでループ
    // 現在の最大値から確実に10,000円未満（フィルタ有効化ライン）になるまで操作する
    const targetPrice = 10000;

    // 安全のためループ回数制限を設ける
    for (let i = 0; i < 50; i++) {
        const valueStr = await maxPriceSlider.getAttribute('aria-valuenow');
        const value = parseInt(valueStr || '10000', 10);
        
        if (value < targetPrice) {
            break;
        }
        
        await maxPriceSlider.press('ArrowLeft');
        // 値が更新される（直前の値と変わる）のを待機
        await expect(maxPriceSlider).not.toHaveAttribute('aria-valuenow', valueStr || '', { timeout: 1000 });
    }

    // デバッグ用: 最終値を確認
    const finalValue = await maxPriceSlider.getAttribute('aria-valuenow');
    if (process.env.E2E_DEBUG) console.log(`[Test 1.4] Final Max Price Slider Value: ${finalValue}`);

    // 適用ボタンをクリック
    await page.getByRole('button', { name: 'フィルターを適用' }).click();

    // URLパターンの検証
    const urlPattern = new RegExp(`search\\?.*categoryName=${encodeQuery(negativeTag)}.*&maxPrice=[0-9]+`);
    
    if (process.env.E2E_DEBUG) console.log(`[Test 1.4] Current URL: ${page.url()}`);
    
    // URLが期待通りか待機・検証
    await page.waitForURL(urlPattern);
    await expect(page).toHaveURL(urlPattern);
    
    await expect(page.locator('[data-testid="product-grid"]')).toBeVisible();

    // 検証:
    // prodId2 (2,000円) -> 表示されるはず
    await expect(page.getByText(prodTitle2)).toBeVisible();

    // prodId3 (50,000円) -> 表示されないはず
    await expect(page.getByText(prodTitle3)).not.toBeVisible();
  });

  // テストケース 1.5: 商品詳細ページへの遷移
  test('1.5: should navigate to product details page on card click', async ({ page }) => {
    await page.goto('/');

    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="product-grid"]')).toBeVisible();

    // 作成した商品をクリック
    await page.getByRole('link', { name: prodTitle1 }).first().click();

    // 商品詳細ページへの遷移を確認
    await page.waitForURL(`**/products/${prodId1}`);
    await expect(page.getByRole('heading', { name: prodTitle1 })).toBeVisible();
    await expect(page.getByText(query)).toBeVisible();
  });

  // テストケース 1.6: ログインしていない状態でのアクション
  test('1.6: should fail to like item and revert UI when logged out', async ({ page }) => {
    // 3. 商品詳細ページに移動
    await page.goto(`/products/${prodId1}`);

    // 4. いいねボタンをクリック
    const likeButton = page.getByRole('button', { name: '欲しいものに追加' });
    await likeButton.scrollIntoViewIfNeeded();
    await expect(likeButton).toBeVisible();

    // 5. ハートアイコンが最初に塗りつぶされていない(fill="none")ことを確認
    const heartIcon = likeButton.locator('svg');
    await expect(heartIcon).toHaveAttribute('fill', 'none');

    // 6. ボタンをクリック
    await likeButton.scrollIntoViewIfNeeded();
    await expect(likeButton).toBeVisible();
    await expect(likeButton).toBeEnabled();

    // 視覚的な重なりがないか確認
    const isObscured = await likeButton.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const topElement = document.elementFromPoint(x, y);
      if (!topElement) return false;
      return topElement !== el && !el.contains(topElement);
    });
    expect(isObscured).toBe(false);

    // リクエストを待機するためのPromiseを作成
    const likeApiPromise = page.waitForRequest(request => 
      request.url().includes(`/api/products/${prodId1}/like`) && request.method() === 'POST'
    );

    await likeButton.click();

    // 7. API (POST) リクエストが送信されたことを確認
    const request = await likeApiPromise;
    expect(request.method()).toBe('POST');

    // 8. APIが401エラーを返した後、UIが元の状態に戻ることを確認
    // ハートアイコンが再び塗りつぶされていないことを確認 (APIエラーにより楽観的更新がロールバックされるのを待つ)
    await expect(heartIcon).toHaveAttribute('fill', 'none', { timeout: 10000 });

    await expect(page.getByRole('button', { name: '欲しいものに追加' })).toBeVisible();
    await expect(heartIcon).toHaveAttribute('fill', 'none');
  });
});