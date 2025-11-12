// e2e/lib/auth.ts
import { BrowserContext } from '@playwright/test';
import { Role } from '@prisma/client';
// E2Eテストから本番のPrisma Clientをインポートします
// (テストがテスト用DBを指すように DATABASE_URL 環境変数を設定してください)
import { prisma } from '../../src/lib/prisma'; 
import { randomUUID } from 'crypto';
import { Mock } from 'vitest';
const expires = new Date(Date.now() + 60 * 60 * 1000);

export async function mockSession(
  context: BrowserContext,
  user: MockSessionUser): Promise<void> {
  const token = randomUUID();

  await prisma?.user.upsert({
    where: { id: user.id },
    update: {},
    create: user,
  });

  await prisma?.session.create({
    data: {
      sessionToken: token,
      userId: user.id,
      expires,
    },
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
  email: string | null;
  role: Role;
}

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