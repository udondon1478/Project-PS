import { test, expect } from '@playwright/test';
import { mockSession, MOCK_ADMIN_USER } from './lib/auth';
import { prisma } from '../src/lib/prisma';

// Define constants
const BOOTH_URL = 'https://booth.pm/ja/items/7522386';
const MOCK_PRODUCT_TITLE = 'Mocked Product Title';
const MOCK_SELLER_NAME = 'Mock Seller';
const API_ITEMS_URL = '**/api/items';
const API_TAGS_BY_TYPE_URL = '**/api/tags/by-type*';

// Mock Data
const MOCK_PRODUCT_INFO = {
  boothJpUrl: BOOTH_URL,
  boothEnUrl: 'https://booth.pm/en/items/7522386',
  title: MOCK_PRODUCT_TITLE,
  description: 'Mocked product description.',
  lowPrice: 500,
  highPrice: 1500,
  publishedAt: new Date().toISOString(),
  sellerName: MOCK_SELLER_NAME,
  sellerUrl: 'https://seller.example.com',
  sellerIconUrl: '/pslogo.svg',
  images: [{ imageUrl: '/pslogo.svg', isMain: true, order: 0 }],
  variations: [{ name: 'Default', price: 500, type: 'download', order: 0, isMain: true }],
};

const MOCK_AGE_RATING_TAGS = [{ id: 'tag-age-1', name: '全年齢' }];
const MOCK_CATEGORY_TAGS = [{ id: 'tag-cat-1', name: 'アバター' }];

test.describe('Guideline Buttons Interaction', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page, context }) => {
    // Skip onboarding
    await page.addInitScript(() => {
      localStorage.setItem('guideline-onboarding-shown-register-item', 'true');
      localStorage.setItem('onboarding_completed', 'true');
    });

    // Mock Authentication
    await mockSession(context, MOCK_ADMIN_USER);

    // Mock API responses
    await page.route(API_ITEMS_URL, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          json: {
            status: 'new',
            productInfo: MOCK_PRODUCT_INFO,
          }
        });
      } else {
        await route.continue();
      }
    });

    await page.route(API_TAGS_BY_TYPE_URL, async (route) => {
      const url = new URL(route.request().url());
      const categoryNames = url.searchParams.get('categoryNames');
      let data: any[] = [];
      if (categoryNames === 'age_rating') {
        data = MOCK_AGE_RATING_TAGS;
      } else if (categoryNames === 'product_category') {
        data = MOCK_CATEGORY_TAGS;
      } else if (categoryNames === 'feature') {
        data = [];
      }
      await route.fulfill({ status: 200, json: data });
    });
  });

  test('should open Policy Modal when clicking the "?" icon', async ({ page }) => {
    // Navigate to register page
    await page.goto('/register-item');

    // Fill URL and submit to reach the details form
    const urlInput = page.getByPlaceholder('https://example.booth.pm/items/123456');
    await urlInput.fill(BOOTH_URL);
    await urlInput.press('Enter');
    await page.waitForSelector('text=商品情報の確認と登録', { timeout: 10000 });

    // Locate the "?" button (GuidelineButton) and click it
    // Note: GuidelineButton has a Sparkles icon if it's the "Diagnose" button,
    // but the one next to the label should be the question mark icon (HelpCircle).
    // The previous implementation used GuidelineButton with a tooltip.
    // Based on the code changes:
    // <GuidelineButton tooltip="レーティング基準について" onClick={() => setIsPolicyDialogOpen(true)} />

    // Find button by tooltip text
    const helpButton = page.getByRole('button', { name: 'レーティング基準について' });
    await expect(helpButton).toBeVisible();
    await helpButton.click();

    // Verify Modal Content
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('PolySeekのレーティング基準について')).toBeVisible();
    await expect(page.getByText('独自のレーティングシステムを採用している理由について')).toBeVisible();
  });

  test('should open Guideline Panel (Categories Tab) when clicking "Tag Guideline" button', async ({ page }) => {
    // Navigate to register page
    await page.goto('/register-item');

    // Fill URL and submit
    const urlInput = page.getByPlaceholder('https://example.booth.pm/items/123456');
    await urlInput.fill(BOOTH_URL);
    await urlInput.press('Enter');
    await page.waitForSelector('text=商品情報の確認と登録', { timeout: 10000 });

    // Locate "Tag Guideline" button in TagInput component
    const tagGuidelineButton = page.getByRole('button', { name: 'タグガイドライン' });
    await expect(tagGuidelineButton).toBeVisible();

    // Click it
    await tagGuidelineButton.click();

    // Verify Side Panel opens
    const sidePanel = page.locator('aside[aria-label="タグ付けガイドライン"]');
    await expect(sidePanel).toBeVisible();

    // Verify "Categories" tab is active
    // Shadcn Tabs triggers usually have data-state="active"
    const categoriesTabTrigger = page.getByRole('tab', { name: 'タグカテゴリ' });
    await expect(categoriesTabTrigger).toHaveAttribute('data-state', 'active');

    // Verify "Rating" tab is NOT active
    const ratingTabTrigger = page.getByRole('tab', { name: 'レーティング' });
    await expect(ratingTabTrigger).toHaveAttribute('data-state', 'inactive');
  });
});
