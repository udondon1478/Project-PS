// e2e/lib/auth.ts
import { Page, Route } from '@playwright/test';
import { Role } from '@prisma/client';

// セッションユーザーの型定義
export interface MockSessionUser {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
}

// モックユーザーデータ
export const MOCK_USER: MockSessionUser = {
  id: 'test-user-id',
  name: 'Test User',
  email: 'test.user@example.com',
  role: Role.USER,
};

export const MOCK_ADMIN_USER: MockSessionUser = {
  id: 'test-admin-id',
  name: 'Test Admin',
  email: 'test.admin@example.com',
  role: Role.ADMIN,
};

// NextAuthのセッションレスポンスの型
interface MockSession {
  user: MockSessionUser;
  expires: string;
}

/**
 * PlaywrightのテストでNextAuthのセッションをモックします。
 * `/api/auth/session` へのリクエストを傍受し、偽のセッションデータを返します。
 * @param page PlaywrightのPageオブジェクト
 * @param user モックするユーザーオブジェクト
 */
export async function mockSession(page: Page, user: MockSessionUser) {
  const session: MockSession = {
    user,
    // expiresは未来のISO文字列であれば何でも良い
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  await page.route('**/api/auth/session', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session),
    });
  });
}
