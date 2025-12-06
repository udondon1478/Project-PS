// e2e/lib/auth.ts
import { BrowserContext } from '@playwright/test';
import { Role } from '@prisma/client';
// E2Eテストから本番のPrisma Clientをインポートします
// (テストがテスト用DBを指すように DATABASE_URL 環境変数を設定してください)
import { prisma } from '../../src/lib/prisma';
import { encode } from 'next-auth/jwt';

export async function mockSession(
  context: BrowserContext,
  user: MockSessionUser): Promise<void> {

  // Ensure clean state
  try {
    await prisma?.product.deleteMany({ where: { userId: user.id } });
    await prisma?.user.delete({ where: { id: user.id } });
  } catch (e) {
    // Ignore P2025: Record not found
    if (!(e instanceof Error && 'code' in e && (e as any).code === 'P2025')) {
      throw e;
    }
  }

  await prisma?.user.create({
    data: user,
  });

  // Generate JWT
  const token = await encode({
    token: {
      name: user.name,
      email: user.email,
      picture: null,
      sub: user.id,
      id: user.id,
      role: user.role,
      termsAgreedAt: user.termsAgreedAt ?? null,
    },
    secret: process.env.AUTH_SECRET || 'secret',
    salt: 'authjs.session-token',
  });

  await context.addCookies([
    {
      name: 'authjs.session-token',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    }
  ]);
}

export interface MockSessionUser {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  termsAgreedAt?: Date | null;
}

export const MOCK_USER: MockSessionUser = {
  id: 'test-user-id',
  name: 'Test User',
  email: 'test.user@example.com',
  role: Role.USER,
  termsAgreedAt: new Date(),
};

export const MOCK_ADMIN_USER: MockSessionUser = {
  id: 'test-admin-id',
  name: 'Test Admin',
  email: 'test.admin@example.com',
  role: Role.ADMIN,
  termsAgreedAt: new Date(),
};