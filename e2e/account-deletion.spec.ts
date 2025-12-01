import { test, expect } from '@playwright/test';
import { mockSession, MOCK_USER } from './lib/auth';

import { prisma } from '../src/lib/prisma';

test.describe('Account Deletion', () => {
  test.beforeEach(async ({ context, page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('onboarding_completed', 'true');
    });
    await mockSession(context, MOCK_USER);
  });

  test.afterEach(async () => {
    // Clean up the anonymized user after deletion test
    try {
      await prisma?.user.delete({ where: { id: MOCK_USER.id } });
    } catch (e) {
      // Ignore P2025: Record not found
      if (!(e instanceof Error && 'code' in e && (e as any).code === 'P2025')) {
        throw e;
      }
    }
  });

  test('should delete account and update DB status', async ({ page }) => {
    await page.goto('/profile');
    
    // アカウント削除ボタンをクリック
    await page.getByRole('button', { name: 'アカウント削除' }).click();
    
    // 確認ダイアログで削除を確定
    await page.getByRole('button', { name: '削除する' }).click();
    
    // ログアウトされてトップページにリダイレクトされることを確認
    await expect(page).toHaveURL('/');
    
    // DBの状態を検証
    const deletedUser = await prisma?.user.findUnique({
      where: { id: MOCK_USER.id },
    });

    expect(deletedUser).not.toBeNull();
    expect(deletedUser?.status).toBe('DELETED');
    expect(deletedUser?.name).toBe('Deleted User');
    expect(deletedUser?.email).toMatch(/^deleted-/);
    expect(deletedUser?.image).toBeNull();
  });
});
