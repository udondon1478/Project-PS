import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ======== Mock Setup ========

const {
  mockUserFindUnique,
  mockProductFindMany,
  mockProductTagCreateMany,
  mockDisconnect,
  mockHttpFetch,
  mockParseProductJson,
  mockParseProductPage,
  mockResolveTags,
  mockResolveAgeRating,
  mockWaitJitter,
} = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockProductFindMany: vi.fn(),
  mockProductTagCreateMany: vi.fn(),
  mockDisconnect: vi.fn(),
  mockHttpFetch: vi.fn(),
  mockParseProductJson: vi.fn(),
  mockParseProductPage: vi.fn(),
  mockResolveTags: vi.fn(),
  mockResolveAgeRating: vi.fn(),
  mockWaitJitter: vi.fn(),
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(function () {
    return {
      user: { findUnique: mockUserFindUnique },
      product: { findMany: mockProductFindMany },
      productTag: { createMany: mockProductTagCreateMany },
      $disconnect: mockDisconnect,
    };
  }),
}));

vi.mock('@/lib/booth-scraper/http-client', () => ({
  boothHttpClient: { fetch: mockHttpFetch },
}));

vi.mock('@/lib/booth-scraper/product-parser', () => ({
  parseProductJson: mockParseProductJson,
  parseProductPage: mockParseProductPage,
}));

vi.mock('@/lib/booth-scraper/tag-resolver', () => ({
  TagResolver: vi.fn(function () {
    return {
      resolveTags: mockResolveTags,
      resolveAgeRating: mockResolveAgeRating,
    };
  }),
}));

vi.mock('@/lib/booth-scraper/utils', () => ({
  waitJitter: mockWaitJitter,
}));

import { main, fetchTagsFromBooth } from './backfill-booth-tags';

// ======== Fixtures ========

const SYSTEM_USER = { id: 'system-user-id', email: 'system-scraper@polyseek.com' };
const PRODUCT_A = { id: 'prod-a', boothJpUrl: 'https://booth.pm/ja/items/111', title: 'Product A' };
const PRODUCT_B = { id: 'prod-b', boothJpUrl: 'https://booth.pm/ja/items/222', title: 'Product B' };

function makePageResult(tags: string[], ageRating: string | null) {
  return {
    title: 'Test', description: '', price: 0, images: [],
    tags, ageRating,
    sellerName: '', sellerUrl: '', variations: [],
  };
}

function mockJsonSuccess(tags: string[], ageRating: string | null): void {
  mockHttpFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({}),
  } as unknown as Response);
  mockParseProductJson.mockReturnValueOnce(makePageResult(tags, ageRating));
}

function mockHtmlSuccess(tags: string[], ageRating: string | null): void {
  mockHttpFetch.mockResolvedValueOnce({
    ok: true,
    text: () => Promise.resolve('<html></html>'),
  } as unknown as Response);
  mockParseProductPage.mockReturnValueOnce(makePageResult(tags, ageRating));
}

function setupMainFlow(products: typeof PRODUCT_A[]): void {
  mockUserFindUnique.mockResolvedValueOnce(SYSTEM_USER);
  mockProductFindMany.mockResolvedValueOnce(products);
}

// ======== Tests ========

describe('backfill-booth-tags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDisconnect.mockResolvedValue(undefined);
    mockWaitJitter.mockResolvedValue(undefined);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchTagsFromBooth', () => {
    it('should return tags from JSON API when response is ok', async () => {
      // Given
      mockJsonSuccess(['VRChat', '3Dモデル'], 'R-18');

      // When
      const result = await fetchTagsFromBooth('https://booth.pm/ja/items/111');

      // Then
      expect(mockHttpFetch).toHaveBeenCalledWith('https://booth.pm/ja/items/111.json');
      expect(mockParseProductJson).toHaveBeenCalled();
      expect(mockParseProductPage).not.toHaveBeenCalled();
      expect(result).toEqual({ tagNames: ['VRChat', '3Dモデル'], ageRating: 'R-18' });
    });

    it('should fall back to HTML when JSON API request throws', async () => {
      // Given
      mockHttpFetch.mockRejectedValueOnce(new Error('Network error'));
      mockHtmlSuccess(['衣装'], '全年齢');

      // When
      const result = await fetchTagsFromBooth('https://booth.pm/ja/items/222');

      // Then
      expect(mockHttpFetch).toHaveBeenCalledTimes(2);
      expect(mockHttpFetch).toHaveBeenNthCalledWith(2, 'https://booth.pm/ja/items/222');
      expect(mockParseProductPage).toHaveBeenCalled();
      expect(result).toEqual({ tagNames: ['衣装'], ageRating: '全年齢' });
    });

    it('should fall back to HTML when JSON response is not ok', async () => {
      // Given
      mockHttpFetch.mockResolvedValueOnce({ ok: false } as Response);
      mockHtmlSuccess(['アクセサリー'], null);

      // When
      const result = await fetchTagsFromBooth('https://booth.pm/ja/items/333');

      // Then
      expect(mockHttpFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ tagNames: ['アクセサリー'], ageRating: null });
    });

    it('should return null when both JSON and HTML fail', async () => {
      // Given
      mockHttpFetch.mockRejectedValueOnce(new Error('JSON fail'));
      mockHttpFetch.mockResolvedValueOnce({ ok: false } as Response);

      // When
      const result = await fetchTagsFromBooth('https://booth.pm/ja/items/444');

      // Then
      expect(result).toBeNull();
    });
  });

  describe('main', () => {
    it('should throw when system user is not found', async () => {
      // Given
      mockUserFindUnique.mockResolvedValueOnce(null);

      // When/Then
      await expect(main()).rejects.toThrow();
    });

    it('should query products filtering by no official tags', async () => {
      // Given
      setupMainFlow([]);

      // When
      await main();

      // Then
      expect(mockProductFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { productTags: { none: { isOfficial: true } } },
        })
      );
    });

    it('should complete without fetching when no products exist', async () => {
      // Given
      setupMainFlow([]);

      // When
      await main();

      // Then
      expect(mockHttpFetch).not.toHaveBeenCalled();
      expect(mockWaitJitter).not.toHaveBeenCalled();
    });

    it('should resolve tags and save ProductTag with isOfficial true', async () => {
      // Given
      setupMainFlow([PRODUCT_A]);
      mockJsonSuccess(['tag1', 'tag2'], 'R-18');
      mockResolveTags.mockResolvedValueOnce(['tid-1', 'tid-2']);
      mockResolveAgeRating.mockResolvedValueOnce('tid-age');
      mockProductTagCreateMany.mockResolvedValueOnce({ count: 3 });

      // When
      await main();

      // Then
      expect(mockResolveTags).toHaveBeenCalledWith(['tag1', 'tag2']);
      expect(mockResolveAgeRating).toHaveBeenCalledWith('R-18');
      expect(mockProductTagCreateMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          { productId: 'prod-a', tagId: 'tid-1', userId: SYSTEM_USER.id, isOfficial: true },
          { productId: 'prod-a', tagId: 'tid-2', userId: SYSTEM_USER.id, isOfficial: true },
          { productId: 'prod-a', tagId: 'tid-age', userId: SYSTEM_USER.id, isOfficial: true },
        ]),
        skipDuplicates: true,
      });
    });

    it('should not include age rating tag when ageRating resolves to null', async () => {
      // Given
      setupMainFlow([PRODUCT_A]);
      mockJsonSuccess(['tag1'], null);
      mockResolveTags.mockResolvedValueOnce(['tid-1']);
      mockResolveAgeRating.mockResolvedValueOnce(null);
      mockProductTagCreateMany.mockResolvedValueOnce({ count: 1 });

      // When
      await main();

      // Then
      expect(mockResolveAgeRating).toHaveBeenCalledWith(null);
      expect(mockProductTagCreateMany).toHaveBeenCalledWith({
        data: [{ productId: 'prod-a', tagId: 'tid-1', userId: SYSTEM_USER.id, isOfficial: true }],
        skipDuplicates: true,
      });
    });

    it('should skip product when fetch returns no data', async () => {
      // Given: Both JSON and HTML fail → fetchTagsFromBooth returns null
      setupMainFlow([PRODUCT_A]);
      mockHttpFetch.mockRejectedValueOnce(new Error('fail'));
      mockHttpFetch.mockResolvedValueOnce({ ok: false } as Response);

      // When
      await main();

      // Then
      expect(mockResolveTags).not.toHaveBeenCalled();
      expect(mockProductTagCreateMany).not.toHaveBeenCalled();
    });

    it('should skip product when resolved tags are empty', async () => {
      // Given: Page exists but has no tags
      setupMainFlow([PRODUCT_A]);
      mockJsonSuccess([], null);
      mockResolveTags.mockResolvedValueOnce([]);
      mockResolveAgeRating.mockResolvedValueOnce(null);

      // When
      await main();

      // Then
      expect(mockProductTagCreateMany).not.toHaveBeenCalled();
    });

    it('should skip errored product and continue with next', async () => {
      // Given: Product A fails (TagResolver throws), Product B succeeds
      setupMainFlow([PRODUCT_A, PRODUCT_B]);
      mockJsonSuccess(['tag-a'], null);
      mockResolveTags.mockRejectedValueOnce(new Error('DB Error'));
      mockJsonSuccess(['tag-b'], '全年齢');
      mockResolveTags.mockResolvedValueOnce(['tid-b']);
      mockResolveAgeRating.mockResolvedValueOnce('tid-age');
      mockProductTagCreateMany.mockResolvedValueOnce({ count: 2 });

      // When
      await main();

      // Then: Product B was still processed
      expect(mockProductTagCreateMany).toHaveBeenCalledTimes(1);
      expect(mockProductTagCreateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ productId: 'prod-b' }),
          ]),
        })
      );
    });

    it('should call waitJitter before each product fetch', async () => {
      // Given
      setupMainFlow([PRODUCT_A, PRODUCT_B]);
      mockJsonSuccess(['tag'], null);
      mockResolveTags.mockResolvedValueOnce(['tid']);
      mockResolveAgeRating.mockResolvedValueOnce(null);
      mockProductTagCreateMany.mockResolvedValueOnce({ count: 1 });
      mockJsonSuccess(['tag'], null);
      mockResolveTags.mockResolvedValueOnce(['tid']);
      mockResolveAgeRating.mockResolvedValueOnce(null);
      mockProductTagCreateMany.mockResolvedValueOnce({ count: 1 });

      // When
      await main();

      // Then
      expect(mockWaitJitter).toHaveBeenCalledTimes(2);
    });

    it('should disconnect Prisma after completion', async () => {
      // Given
      setupMainFlow([]);

      // When
      await main();

      // Then
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });
});
