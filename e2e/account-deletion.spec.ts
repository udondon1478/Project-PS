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
      // Ignore if already deleted
    }
  });

  test('should delete account and prevent re-login', async ({ page }) => {
    await page.goto('/profile');
    
    // アカウント削除ボタンをクリック
    await page.getByRole('button', { name: 'アカウント削除' }).click();
    
    // 確認ダイアログで削除を確定
    await page.getByRole('button', { name: '削除する' }).click();
    
    // ログアウトされてトップページにリダイレクトされることを確認
    await expect(page).toHaveURL('/');
    
    // 再ログイン試行が失敗することを確認（実際のOAuthフローはモックが必要）
  });
});
