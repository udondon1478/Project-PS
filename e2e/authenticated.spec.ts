import { test, expect } from '@playwright/test';
import { mockSession, MOCK_USER } from './lib/auth';

test.describe('Authenticated User Features', () => {

  test.beforeEach(async ({ page }) => {
    // 各テストの前に、一般ユーザーとしてログイン状態をモック
    await mockSession(page, MOCK_USER);
  });

  // テストケース 2.1: ログイン・ログアウト
  test('2.1: should show authenticated header and allow logout', async ({ page }) => {
    await page.goto('/');

    // ログイン後のヘッダー表示を確認
    const profileButton = page.getByRole('button', { name: 'プロフィール' });
    const logoutButton = page.getByRole('button', { name: 'ログアウト' });
    await expect(profileButton).toBeVisible();
    await expect(logoutButton).toBeVisible();

    // ログアウト処理
    // ログアウトAPIをモックして、成功を返すようにする
    await page.route('**/api/auth/signout', async route => {
      await route.fulfill({ status: 200, json: {} });
      // ログアウト後はセッションがなくなるので、セッションAPIは空を返すようにする
      await page.unroute('**/api/auth/session');
      await page.route('**/api/auth/session', async r => await r.fulfill({ status: 200, json: {} }));
    });

    await logoutButton.click();

    // UIが匿名状態に戻ることを確認
    await expect(page.getByRole('button', { name: 'Googleログイン' })).toBeVisible();
    await expect(profileButton).not.toBeVisible();
    await expect(logoutButton).not.toBeVisible();
  });

  // テストケース 2.4: プロフィール編集
  test('2.4: should allow profile editing', async ({ page }) => {
    // プロフィール更新APIをモック
    await page.route('**/api/profile', async (route) => {
      const method = route.request().method();
      if (method === 'PUT') {
        await route.fulfill({ status: 200, json: { message: 'Profile updated successfully!' } });
      } else {
        await route.continue();
      }
    });

    await page.goto('/profile');

    const nameInput = page.getByLabel('ユーザー名');
    await nameInput.fill('New Test User');
    await page.getByRole('button', { name: '変更を保存' }).click();

    // 成功メッセージが表示されることを確認
    await expect(page.getByText('Profile updated successfully!')).toBeVisible();

    // ページをリロードしても変更が維持されていることを確認
    await page.reload();
    await expect(nameInput).toHaveValue('New Test User');
  });

  // テストケース 2.2: いいね・所有済み機能
  test.describe('2.2: Like and Own functionality', () => {
    const productId = 'prod_123';

    test('should allow liking a product', async ({ page }) => {
      // いいね状態を返すAPIをモック（最初はいいねしていない）
      await page.route(`**/api/products/${productId}`, async (route) => {
        await route.fulfill({ json: { isLiked: false, isOwned: false } });
      });
      // いいねAPI（PUT）をモック
      await page.route(`**/api/products/${productId}/like`, async (route) => {
        await route.fulfill({ json: { isLiked: true } });
      });

      await page.goto(`/products/${productId}`);

      const likeButton = page.getByRole('button', { name: 'いいね' });
      await likeButton.click();

      // ボタンの状態が「いいね済み」に変わることを確認
      await expect(page.getByRole('button', { name: 'いいね済み' })).toBeVisible();

      // リロード後の状態を検証するために、APIモックを更新
      await page.unroute(`**/api/products/${productId}`);
      await page.route(`**/api/products/${productId}`, async (route) => {
        await route.fulfill({ json: { isLiked: true, isOwned: false } });
      });

      await page.reload();
      await expect(page.getByRole('button', { name: 'いいね済み' })).toBeVisible();
    });

    test('should show liked products on profile page', async ({ page }) => {
        // プロフィールのいいねリストAPIをモック
        await page.route('**/api/profile/likes', async route => {
            await route.fulfill({ json: [{ product: { id: productId, title: 'Liked Product' } }] });
        });

        await page.goto('/profile/likes');
        await expect(page.getByText('Liked Product')).toBeVisible();
    });
  });

  test.describe('2.2: Own functionality', () => {
    const productId = 'prod_456';

    test('should allow owning a product', async ({ page }) => {
      // 初期状態APIをモック（所有していない）
      await page.route(`**/api/products/${productId}`, async (route) => {
        await route.fulfill({ json: { isLiked: false, isOwned: false } });
      });
      // 所有API（PUT）をモック
      await page.route(`**/api/products/${productId}/own`, async (route) => {
        await route.fulfill({ json: { isOwned: true } });
      });

      await page.goto(`/products/${productId}`);

      const ownButton = page.getByRole('button', { name: '所有済み' }); // ボタン名はUIに合わせてください
      await ownButton.click();

      await expect(page.getByRole('button', { name: '所有済み' })).toBeDisabled(); // 例：クリック後は無効化される

      // リロード後の状態を検証
      await page.unroute(`**/api/products/${productId}`);
      await page.route(`**/api/products/${productId}`, async (route) => {
        await route.fulfill({ json: { isLiked: false, isOwned: true } });
      });

      await page.reload();
      await expect(page.getByRole('button', { name: '所有済み' })).toBeDisabled();
    });

    test('should show owned products on profile page', async ({ page }) => {
        await page.route('**/api/profile/owned', async route => {
            await route.fulfill({ json: [{ product: { id: productId, title: 'Owned Product' } }] });
        });

        await page.goto('/profile/owned');
        await expect(page.getByText('Owned Product')).toBeVisible();
    });
  });
});
