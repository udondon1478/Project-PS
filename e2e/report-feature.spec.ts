import { test, expect } from '@playwright/test';
import { mockSession } from './lib/auth';
import { prisma } from '@/lib/prisma';

test.describe('Report Feature', () => {
  test.beforeEach(async () => {
    // Clean up any existing reports and users
    await prisma.report.deleteMany();
    await prisma.tag.deleteMany({
      where: { name: 'TestTag' }
    });
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
    await prisma.tag.deleteMany({
      where: { name: 'TestTag' }
    });
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
    await page.getByTestId('tag-info-button').first().click();
    
    // 3. Report the tag
    await page.getByTestId('report-tag-button').click();
    await page.getByTestId('report-reason-input').fill('This is a test report');
    await page.getByTestId('report-submit-button').click();
    
    await expect(page.getByTestId('report-success-message')).toBeVisible();

    // 4. Login as Admin
    await mockSession(page.context(), {
      id: 'admin-1', name: 'Admin User', email: 'admin@example.com', role: 'ADMIN',
      termsAgreedAt: new Date(),
    });
    await page.reload();

    // 5. Go to Admin Panel
    await page.goto('/admin');
    
    await page.getByTestId('admin-reports-tab').click();

    // 6. Verify report is visible
    const reportRow = page.getByRole('row').filter({ hasText: 'This is a test report' });
    await expect(reportRow).toBeVisible();
    
    await expect(reportRow.getByTestId('report-reason')).toHaveText('This is a test report');
    
    // Verify target name is displayed and is a link (CodeRabbit fix & URL feature)
    const link = reportRow.getByTestId('report-link');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/search?tags=TestTag');

    // 7. Resolve the report
    await reportRow.getByTestId('report-resolve-button').click();
    
    // Verify status update (might need reload or it updates automatically)
    await expect(page.getByTestId('report-status-badge')).toHaveText('解決済み');
  });
});
