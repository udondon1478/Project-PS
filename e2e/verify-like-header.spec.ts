import { test, expect } from '@playwright/test';
import { mockSession, MOCK_USER } from './lib/auth';
import { prisma } from '../src/lib/prisma';

const PRODUCT_ID = 'prod_verify_header_rem';

test.describe('Verify Like API Header Removal', () => {

  test.beforeEach(async ({ context, page }) => {
    // オンボーディングをスキップするために localStorage に onboarding_completed=true を設定
    await page.addInitScript(() => {
      localStorage.setItem('onboarding_completed', 'true');
    });

    await mockSession(context, MOCK_USER);

    // テスト用商品作成
    await prisma.product.upsert({
        where: { id: PRODUCT_ID },
        update: { title: 'Header Verify Product' },
        create: {
          id: PRODUCT_ID,
          title: 'Header Verify Product',
          boothJpUrl: `http://example.com/jp/${PRODUCT_ID}`,
          boothEnUrl: `http://example.com/en/${PRODUCT_ID}`,
          lowPrice: 100,
          highPrice: 100,
          publishedAt: new Date(),
          userId: MOCK_USER.id,
        },
      });
      
      // 既存のいいねがあれば削除
      await prisma.productLike.deleteMany({
        where: {
          productId: PRODUCT_ID,
          userId: MOCK_USER.id,
        },
      });
  });

  test.afterAll(async () => {
     // クリーンアップ
     await prisma.productLike.deleteMany({
        where: {
          productId: PRODUCT_ID,
        },
      });
      await prisma.product.deleteMany({ where: { id: PRODUCT_ID } });
  });

  test('should successfully like a product without Content-Type header', async ({ page }) => {
    await page.goto(`/products/${PRODUCT_ID}`);

    // APIリクエストを監視
    const requestPromise = page.waitForRequest(request => 
        request.url().includes(`/api/products/${PRODUCT_ID}/like`) &&
        request.method() === 'POST'
    );
    const responsePromise = page.waitForResponse(response => 
        response.url().includes(`/api/products/${PRODUCT_ID}/like`) &&
        response.status() === 201
    );

    await page.getByRole('button', { name: '欲しいものに追加' }).click();

    const request = await requestPromise;
    const response = await responsePromise;

    // Content-Typeヘッダーが送信されていないことを確認
    const headers = request.headers();
    expect(headers['content-type']).toBeUndefined();

    expect(response.status()).toBe(201);

    // UIが更新されたことを確認
    await expect(page.getByRole('button', { name: '欲しいものから外す' })).toBeVisible();
  });
});
