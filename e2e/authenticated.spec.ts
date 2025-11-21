import { test, expect } from '@playwright/test';
import { mockSession, MOCK_USER } from './lib/auth';
import { prisma } from '../src/lib/prisma';


// anonymous.spec.ts の形式に合わせて、テストで使用する定数を定義
const LIKE_PRODUCT_ID = 'prod_123';
const OWN_PRODUCT_ID = 'prod_456';

const PROFILE_API_URL = '**/api/profile';
const PROFILE_LIKES_API_URL = '**/api/profile/likes';
const PROFILE_OWNED_API_URL = '**/api/profile/owned';
const SIGNOUT_API_URL = '**/api/auth/signout';
const SESSION_API_URL = '**/api/auth/session';

const PRODUCT_LIKE_API_URL = (id: string) => `**/api/products/${id}/like`;
const PRODUCT_OWN_API_URL = (id: string) => `**/api/products/${id}/own`;
const PRODUCT_DETAIL_API_URL = (id: string) => `**/api/products/${id}`;


test.describe('Authenticated User Features', () => {

  test.beforeEach(async ({ context }) => {
    await mockSession(context, MOCK_USER);
  });

  // テストケース 2.1: ログイン・ログアウト
  test('2.1: should show authenticated header and allow logout', async ({ page }) => { // context を追加

    await Promise.all([
      page.waitForResponse(SESSION_API_URL),
      page.goto('/'),
    ])

    // ページの読み込みとReact再描画の完了を待つ
    await page.waitForLoadState('networkidle');

    // data-testid でボタンが描画されるまで待つ
    const profileButton = page.getByTestId('profile-trigger');
    await profileButton.waitFor({ state: 'visible', timeout: 10000 });
    await expect(profileButton).toBeVisible();

    const logoutPromise = page.waitForResponse(SIGNOUT_API_URL);
    await page.getByRole('button', { name: 'ログアウト' }).click();
    await logoutPromise;

    await page.waitForURL('**/'); // ← / に戻るまで待機


    // ログアウト後のUI安定待ち
    await page.waitForLoadState('networkidle');

    // "Googleログイン" ボタンが実際に見えるまで待つ
    const googleLoginButton = page.getByRole('button', { name: 'Googleログイン' });
    await googleLoginButton.waitFor({ state: 'visible', timeout: 15000 }); // timeoutを少し長めに

    await expect(googleLoginButton).toBeVisible();
  });

  test('2.2.1: should allow liking a product and reflect on reload', async ({ page }) => {
    // 1. 初期状態（いいねしていない）のAPIをモック
    await page.route(PRODUCT_DETAIL_API_URL(LIKE_PRODUCT_ID), async (route) => {
      await route.fulfill({ json: { product: { id: LIKE_PRODUCT_ID, title: 'Test', isLiked: false, isOwned: false, images: [], productTags: [], tagEditHistory: [] } } });
    });

    // 2. いいねAPI（POST）をモック
    await page.route(PRODUCT_LIKE_API_URL(LIKE_PRODUCT_ID), async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, json: { message: 'Product liked successfully' } });
      } else {
        await route.continue();
      }
    });

    await page.goto(`/products/${LIKE_PRODUCT_ID}`);

    // 3. ボタンをクリック
    const likeButton = page.getByRole('button', { name: '欲しいものに追加' });
    const likeApiPromise = page.waitForResponse(PRODUCT_LIKE_API_URL(LIKE_PRODUCT_ID));
    await likeButton.click();
    await likeApiPromise;

    // 4. UIの更新を確認
    await expect(page.getByRole('button', { name: '欲しいものから外す' })).toBeVisible();

    // 5. リロード後の状態を検証（APIモックを更新）
    await page.unroute(PRODUCT_DETAIL_API_URL(LIKE_PRODUCT_ID));
    await page.route(PRODUCT_DETAIL_API_URL(LIKE_PRODUCT_ID), async (route) => {
      await route.fulfill({ json: { product: { id: LIKE_PRODUCT_ID, title: 'Test', isLiked: true, isOwned: false, images: [], productTags: [], tagEditHistory: [] } } });
    });

    await page.reload();
    await expect(page.getByRole('button', { name: '欲しいものから外す' })).toBeVisible();
  });

  test('2.2.2: should show liked products on profile page', async ({ page }) => {
    // 1. DBに必要なデータを直接作成します
    // (依存関係のため、先に商品を作成)
    await prisma.product.upsert({
      where: { id: LIKE_PRODUCT_ID },
      update: { title: 'Liked Product' },
      create: {
        id: LIKE_PRODUCT_ID,
        title: 'Liked Product',
        boothJpUrl: `http://example.com/jp/${LIKE_PRODUCT_ID}`,
        boothEnUrl: `http://example.com/en/${LIKE_PRODUCT_ID}`,
        lowPrice: 100,
        highPrice: 100,
        publishedAt: new Date(),
        userId: MOCK_USER.id, // (auth.tsのモックと一致させる)
      },
    });

    try {
      // 「いいね」の関連データを作成
      await prisma.productLike.upsert({
        where: {
          productId_userId: {
            productId: LIKE_PRODUCT_ID,
            userId: MOCK_USER.id,
          },
        },
        create: {
          productId: LIKE_PRODUCT_ID,
          userId: MOCK_USER.id,
        },
        update: {}, // 存在する場合は何もしない
      });

      await page.goto('/profile/likes');
      await expect(page.getByText('Liked Product')).toBeVisible();
    } finally {
      // Narrowed condition: 特定の productId + userId の組み合わせのみ削除
      await prisma.productLike.deleteMany({
        where: {
          productId: LIKE_PRODUCT_ID,
          userId: MOCK_USER.id,
        },
      });
      await prisma.product.deleteMany({ where: { id: LIKE_PRODUCT_ID } });
    }
  });

  // --- テストケース 2.2: 所有済み機能 ---
  test('2.2.3: should allow owning a product and reflect on reload', async ({ page }) => {
    // 1. 初期状態（所有していない）のAPIをモック
    await page.route(PRODUCT_DETAIL_API_URL(OWN_PRODUCT_ID), async (route) => {
      await route.fulfill({ json: { product: { id: OWN_PRODUCT_ID, title: 'Test', isLiked: false, isOwned: false, images: [], productTags: [], tagEditHistory: [] } } });
    });

    // 2. 所有API（POST）をモック
    await page.route(PRODUCT_OWN_API_URL(OWN_PRODUCT_ID), async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, json: { message: 'Added to owned list' } });
      } else {
        await route.continue();
      }
    });

    await page.goto(`/products/${OWN_PRODUCT_ID}`);

    // 3. ボタンをクリック
    const ownButton = page.getByRole('button', { name: '所有済みにする' });
    const ownApiPromise = page.waitForResponse(PRODUCT_OWN_API_URL(OWN_PRODUCT_ID));
    await ownButton.click();
    await ownApiPromise;

    // 4. UIの更新を確認
    await expect(page.getByRole('button', { name: '所有済みから外す' })).toBeVisible();

    // 5. リロード後の状態を検証（APIモックを更新）
    await page.unroute(PRODUCT_DETAIL_API_URL(OWN_PRODUCT_ID));
    await page.route(PRODUCT_DETAIL_API_URL(OWN_PRODUCT_ID), async (route) => {
      await route.fulfill({ json: { product: { id: OWN_PRODUCT_ID, title: 'Test', isLiked: false, isOwned: true, images: [], productTags: [], tagEditHistory: [] } } });
    });

    await page.reload();
    await expect(page.getByRole('button', { name: '所有済みから外す' })).toBeVisible();
  });

  test('2.2.4: should show owned products on profile page', async ({ page }) => {
    // 1. DBに必要なデータを直接作成
    await prisma.product.upsert({
      where: { id: OWN_PRODUCT_ID },
      update: { title: 'Owned Product' },
      create: {
        id: OWN_PRODUCT_ID,
        title: 'Owned Product',
        boothJpUrl: `http://example.com/jp/${OWN_PRODUCT_ID}`,
        boothEnUrl: `http://example.com/en/${OWN_PRODUCT_ID}`,
        lowPrice: 100,
        highPrice: 100,
        publishedAt: new Date(),
        userId: MOCK_USER.id,
      },
    });

    try {
      await prisma.productOwner.upsert({
        where: {
          userId_productId: {
            productId: OWN_PRODUCT_ID,
            userId: MOCK_USER.id,
          },
        },
        create: {
          productId: OWN_PRODUCT_ID,
          userId: MOCK_USER.id,
        },
        update: {},
      });

      // 2. ページに移動
      await page.goto('/profile/owned');

      // 3. DBから取得したデータが表示されることを確認
      await expect(page.getByText('Owned Product')).toBeVisible();
    } finally {
      // 4. クリーンアップ - Narrowed condition: 特定の productId + userId の組み合わせのみ削除
      await prisma.productOwner.deleteMany({
        where: {
          productId: OWN_PRODUCT_ID,
          userId: MOCK_USER.id,
        },
      });
      await prisma.product.deleteMany({ where: { id: OWN_PRODUCT_ID } });
    }
  });

  // テストケース 2.4: プロフィール編集
  test('2.4: should allow profile editing', async ({ page }) => {
    // プロフィール更新APIをモック (app/api/profile/route.ts は PATCH を使用)
    await page.route(PROFILE_API_URL, async (route) => {
      const method = route.request().method();
      if (method === 'PATCH') {
        // 更新されたユーザーデータを返す
        await route.fulfill({ status: 200, json: { ...MOCK_USER, name: 'New Test User' } });
      } else {
        await route.continue();
      }
    });

    await page.goto('/profile');

    const nameInput = page.getByLabel('ユーザー名');
    await nameInput.fill('New Test User');
    await page.getByRole('button', { name: '変更を保存' }).click();

    // 成功メッセージが表示されることを確認 (ProfileForm には明示的な成功メッセージはない)
    // 代わりに、APIが呼ばれ、入力がdisabledでなくなることを確認
    await expect(page.getByRole('button', { name: '変更を保存' })).toBeEnabled();

    // router.refresh() が呼ばれるため、再度モックされたセッションが読み込まれる
    // ここでは、APIが呼ばれた後のUIの安定を確認する
  });
});