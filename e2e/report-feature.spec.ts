import { test, expect } from '@playwright/test';
import { mockSession } from './lib/auth';
import { prisma } from '@/lib/prisma';

test.describe('Report Feature', () => {
  test.beforeEach(async () => {
    // Clean up any existing reports and users
    await prisma.report.deleteMany();
    await prisma.productTag.deleteMany({
      where: {
        user: {
          email: { in: ['test@example.com', 'admin@example.com'] }
        }
      }
    });
    await prisma.product.deleteMany({
      where: {
        user: {
          email: { in: ['test@example.com', 'admin@example.com'] }
        }
      }
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['test@example.com', 'admin@example.com']
        }
      }
    });
  });

  test.afterEach(async () => {
    // Clean up any existing reports and users
    await prisma.report.deleteMany();
    await prisma.productTag.deleteMany({
      where: {
        user: {
          email: { in: ['test@example.com', 'admin@example.com'] }
        }
      }
    });
    await prisma.product.deleteMany({
      where: {
        user: {
          email: { in: ['test@example.com', 'admin@example.com'] }
        }
      }
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['test@example.com', 'admin@example.com']
        }
      }
    });
  });

  test('should allow a user to report a tag and admin to resolve it', async ({ page }) => {
    // Disable onboarding tour
    await page.addInitScript(() => {
      localStorage.setItem('onboarding_completed', 'true');
    });

    // 1. Login as a regular user
    await mockSession(page.context(), {
      id: 'user-1', name: 'Test User', email: 'test@example.com', role: 'USER',
      termsAgreedAt: new Date(),
    });

    // 2. Go to a page with tags (assuming search page has tags or we can mock a tag)
    // For simplicity, let's create a tag first
    const tag = await prisma.tag.upsert({
      where: { name: 'TestTag' },
      update: {},
      create: { name: 'TestTag', language: 'ja' },
    });

    // Navigate to search page where tags are listed or accessible
    // Alternatively, if TagDetailModal is triggered by clicking a tag, we need to find a tag on the UI.
    // Let's assume we can go to /search?tags=TestTag and click the tag there if implemented,
    // or just trigger the modal if we can find the tag element.
    // Since I don't know the exact UI flow for opening the modal from search, 
    const product = await prisma.product.create({
      data: {
        title: 'Test Product',
        boothJpUrl: 'https://booth.pm/ja/items/123456',
        boothEnUrl: 'https://booth.pm/en/items/123456',
        lowPrice: 100,
        highPrice: 200,
        publishedAt: new Date(),
        userId: 'user-1', // Matches the mocked user
        productTags: {
          create: {
            tagId: tag.id,
            userId: 'user-1',
          }
        }
      }
    });

    await page.goto(`/products/${product.id}`);
    
    // Click the info button to open modal
    await page.getByRole('button', { name: 'TestTagの詳細を見る' }).click();
    
    // 3. Report the tag
    await page.getByRole('button', { name: 'このタグを通報する' }).click();
    await page.getByLabel('通報理由').fill('This is a test report');
    await page.getByRole('button', { name: '送信' }).click();
    
    await expect(page.getByText('通報を受け付けました')).toBeVisible();

    // 4. Login as Admin
    await mockSession(page.context(), {
      id: 'admin-1', name: 'Admin User', email: 'admin@example.com', role: 'ADMIN',
      termsAgreedAt: new Date(),
    });

    // 5. Go to Admin Panel
    await page.goto('/admin');
    
    await page.getByRole('tab', { name: '通報管理' }).click();

    // 6. Verify report is visible
    await expect(page.getByText('This is a test report')).toBeVisible();
    // Verify target name is displayed and is a link (CodeRabbit fix & URL feature)
    const link = page.getByRole('link', { name: 'TestTag' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/search?tags=TestTag');

    // 7. Resolve the report
    await page.getByRole('button', { name: '解決' }).click();
    
    // Verify status update (might need reload or it updates automatically)
    await expect(page.getByText('RESOLVED')).toBeVisible();
  });
});
