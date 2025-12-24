
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkExistingProducts } from './product-checker';
import { createProductFromScraper } from './product-creator';
import { prisma } from '../prisma'; // Import relative to match tag-resolver likely resolution if needed, or alias

// Mock prisma module
vi.mock('../prisma', () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    seller: {
      upsert: vi.fn(),
    },
    tag: {
        findMany: vi.fn(),
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(), // TagResolver might use upsert? No, it uses create/findUnique manually in the provided code.
    },
    tagCategory: {
        findUnique: vi.fn(),
        create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

describe('Product Checker', () => {
    it('should identify existing products', async () => {
        const mockFindMany = vi.mocked(prisma.product.findMany);
        mockFindMany.mockResolvedValueOnce([
            { boothJpUrl: 'https://booth.pm/ja/items/123' } as any
        ]);

        const result = await checkExistingProducts(['https://booth.pm/ja/items/123', 'https://booth.pm/ja/items/456']);
        expect(result.size).toBe(1);
        expect(result.has('https://booth.pm/ja/items/123')).toBe(true);
        expect(mockFindMany).toHaveBeenCalledWith({
            where: {
                boothJpUrl: { in: expect.any(Array) }
            },
            select: { boothJpUrl: true }
        });
    });
});

describe('Product Creator', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should create product with related entities', async () => {
        const mockProductCreate = vi.mocked(prisma.product.create);
        const mockSellerUpsert = vi.mocked(prisma.seller.upsert);
        const mockTagFindMany = vi.mocked(prisma.tag.findMany);
        const mockTagCreate = vi.mocked(prisma.tag.create);
        
        // Mock TagResolver dependencies
        mockTagFindMany.mockResolvedValue([]); // No existing tags
        mockTagCreate.mockImplementation((args) => Promise.resolve({ id: `tag-${args.data.name}`, name: args.data.name } as any));
        
        const mockTagCategoryFindUnique = vi.mocked(prisma.tagCategory.findUnique);
        const mockTagCategoryCreate = vi.mocked(prisma.tagCategory.create);
        
        // Mock TagCategory for age rating
        mockTagCategoryFindUnique.mockResolvedValue({ id: 'cat-age', name: 'age_rating' } as any);
        mockTagCategoryCreate.mockResolvedValue({ id: 'cat-age', name: 'age_rating' } as any);

        // Mock Seller upsert
        mockSellerUpsert.mockResolvedValue({ id: 'seller-1' } as any);

        // Mock Product create
        mockProductCreate.mockResolvedValue({ id: 'prod-1' } as any);

        const input = {
            boothJpUrl: 'https://booth.pm/ja/items/100',
            title: 'Test Item',
            description: 'Desc',
            price: 500,
            images: ['img1.jpg'],
            tags: ['VRChat', 'Avatar'],
            ageRating: 'all_ages',
            sellerName: 'Test Seller',
            sellerUrl: 'https://test.booth.pm',
        };

        await createProductFromScraper(input, 'sys-user-1');

        // Verify seller upsert
        expect(mockSellerUpsert).toHaveBeenCalledWith(expect.objectContaining({
            where: { sellerUrl: 'https://test.booth.pm' }
        }));

        // Verify product create
        expect(mockProductCreate).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                boothJpUrl: 'https://booth.pm/ja/items/100',
                title: 'Test Item',
                user: { connect: { id: 'sys-user-1' } },
                seller: { connect: { id: 'seller-1' } },
                // Check nested creates
                images: expect.any(Object),
                variations: expect.any(Object),
                productTags: expect.any(Object),
            })
        }));
    });
});
