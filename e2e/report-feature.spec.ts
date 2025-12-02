import { test, expect } from '@playwright/test';
import { mockSession } from './lib/auth';
import { prisma } from '@/lib/prisma';

test.describe('Report Feature', () => {
  test.beforeEach(async ({ page }) => {
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
    // 1. Login as a regular user
    await mockSession(page.context(), {
      id: 'user-1', name: 'Test User', email: 'test@example.com', role: 'USER'
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
    // I will assume there is a way to click a tag.
    // For now, let's try to visit a page that lists tags.
    await page.goto('/search');
    
    // Note: This part depends heavily on how tags are rendered and clickable.
    // If this is too flaky, I might need to adjust.
    // Let's assume we can search for the tag and click it.
    // Or better, let's assume we can open the modal via URL if supported? No, it's a modal.
    
    // Let's try to find the tag in the UI.
    // If the search page lists tags, we can click it.
    // If not, we might need to seed a product with this tag and go to the product page.
    
    const product = await prisma.product.create({
      data: {
        title: 'Test Product',
        boothJpUrl: 'https://booth.pm/ja/items/123',
        boothEnUrl: 'https://booth.pm/en/items/123',
        lowPrice: 100,
        highPrice: 200,
        publishedAt: new Date(),
        userId: 'user-1', // created by same user for simplicity
        productTags: {
          create: {
            tagId: tag.id,
            userId: 'user-1',
          }
        }
      }
    });

    await page.goto(`/products/${product.id}`);
    
    // Dismiss onboarding tour if present
    await page.keyboard.press('Escape');
    
    // Click the info button to open modal
    await page.getByRole('button', { name: 'TestTagの詳細を見る' }).click();
    
    // 3. Report the tag
    await page.getByRole('button', { name: 'このタグを通報する' }).click();
    await page.getByLabel('通報理由').fill('This is a test report');
    await page.getByRole('button', { name: '送信' }).click();
    
    await expect(page.getByText('通報を受け付けました')).toBeVisible();

    // 4. Login as Admin
    await mockSession(page.context(), {
      id: 'admin-1', name: 'Admin User', email: 'admin@example.com', role: 'ADMIN'
    });

    // 5. Go to Admin Panel
    await page.goto('/admin');
    await page.getByRole('tab', { name: '通報管理' }).click();

    // 6. Verify report is visible
    await expect(page.getByText('This is a test report')).toBeVisible();
    await expect(page.getByText('TestTag')).toBeVisible();

    // 7. Resolve the report
    await page.getByRole('button', { name: '解決' }).click();
    
    // Verify status update (might need reload or it updates automatically)
    await expect(page.getByText('RESOLVED')).toBeVisible();
  });
});
