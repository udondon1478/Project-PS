// e2e/lib/auth.ts

import { Page } from '@playwright/test';
import { SignJWT } from 'jose';

// 環境変数が設定されていない場合のエラー
if (!process.env.AUTH_SECRET) {
  throw new Error('AUTH_SECRET environment variable is not set');
}
if (!process.env.NEXTAUTH_URL) {
  throw new Error('NEXTAUTH_URL environment variable is not set');
}

/**
 * プログラムでテストユーザーとしてログインし、認証Cookieをブラウザに設定します。
 * @param page PlaywrightのPageオブジェクト
 * @param email ログインするユーザーのメールアドレス
 */
export async function loginAsTestUser(page: Page, email = 'test@example.com') {
  // 1. テストAPIを呼び出してユーザー情報を取得
  const response = await page.request.post('/api/test/login', {
    data: { email },
  });

  if (!response.ok()) {
    throw new Error(`Failed to fetch test user '${email}': ${await response.text()}`);
  }
  const user = await response.json();
  if (!user || !user.id) {
    throw new Error(`Test user '${email}' not found or has no ID.`);
  }

  // 2. NextAuth.js v5 と互換性のあるJWTセッショントークンを手動で作成
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
  const now = Math.floor(Date.now() / 1000);

  const sessionToken = await new SignJWT({
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    // NextAuth.jsが必要とする標準的なクレーム
    iat: now,
    exp: now + 30 * 24 * 60 * 60, // 30日間有効
    jti: crypto.randomUUID(),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .sign(secret);

  // 3. セッションクッキーを設定
  const nextAuthUrl = new URL(process.env.NEXTAUTH_URL);
  const isSecure = nextAuthUrl.protocol === 'https:';

  // v5 betaからクッキー名が `next-auth.session-token` -> `authjs.session-token` に変更
  const cookieName = isSecure ? '__Secure-authjs.session-token' : 'authjs.session-token';

  await page.context().addCookies([
    {
      name: cookieName,
      value: sessionToken,
      domain: nextAuthUrl.hostname,
      path: '/',
      httpOnly: true,
      secure: isSecure,
      sameSite: 'Lax',
    },
  ]);
}
