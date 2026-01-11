import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkExistingProducts } from './product-checker';
import { createProductFromScraper } from './product-creator';
import { validateUserExists } from '../user-validation';
import { prisma } from '../prisma'; // Import relative to match tag-resolver likely resolution if needed, or alias

// Mock user-validation module
vi.mock('../user-validation', () => ({
  validateUserExists: vi.fn().mockResolvedValue(true),
}));

// Mock prisma module
vi.mock('../prisma', () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
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
    user: {
        findUnique: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

describe('Product Checker', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

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

    it('should return empty set for empty array input', async () => {
        const mockFindMany = vi.mocked(prisma.product.findMany);
        const result = await checkExistingProducts([]);
        
        expect(result.size).toBe(0);
        expect(mockFindMany).not.toHaveBeenCalled();
    });
});

describe('Product Creator', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock user.findUnique to return a test user for validation
        const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
        mockUserFindUnique.mockResolvedValue({ id: 'sys-user-1' } as any);
    });

    it('should create product with related entities', async () => {
        const mockProductCreate = vi.mocked(prisma.product.create);
        const mockSellerUpsert = vi.mocked(prisma.seller.upsert);
        const mockTagFindMany = vi.mocked(prisma.tag.findMany);
        const mockTagCreate = vi.mocked(prisma.tag.create);
        
        // Mock TagResolver dependencies
        mockTagFindMany.mockResolvedValue([]); // No existing tags
        mockTagCreate.mockImplementation((args) => Promise.resolve({ id: `tag-${args.data.name}`, name: args.data.name } as any) as any);
        
        const mockTagCategoryFindUnique = vi.mocked(prisma.tagCategory.findUnique);
        const mockTagCategoryCreate = vi.mocked(prisma.tagCategory.create);
        
        // Mock TagCategory for age rating
        mockTagCategoryFindUnique.mockResolvedValue({ id: 'cat-age', name: 'age_rating' } as any);
        mockTagCategoryCreate.mockResolvedValue({ id: 'cat-age', name: 'age_rating' } as any);

        // Mock Seller upsert
        mockSellerUpsert.mockResolvedValue({ id: 'seller-1' } as any);

        // Mock Product create
        mockProductCreate.mockResolvedValue({ id: 'prod-1' } as any);
        
        // Mock Product findUnique (for verification step)
        const mockProductFindUnique = vi.mocked(prisma.product.findUnique);
        mockProductFindUnique.mockResolvedValue({ id: 'prod-1', boothJpUrl: 'https://booth.pm/ja/items/100' } as any);

        const input = {
            boothJpUrl: 'https://booth.pm/ja/items/100', // Matches verify logic
            title: 'Test Item',
            description: 'Desc',
            price: 500,
            images: ['img1.jpg'],
            tags: ['VRChat', 'Avatar'],
            ageRating: 'all_ages',
            sellerName: 'Test Seller',
            sellerUrl: 'https://test.booth.pm',
            variations: [{ name: 'Standard', price: 500, type: 'download', order: 0, isMain: true }],
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
                productTags: {
                    create: expect.arrayContaining([
                        // Normal tag -> Official
                        expect.objectContaining({
                            tagId: expect.stringMatching(/^tag-/),
                            userId: 'sys-user-1',
                            isOfficial: true
                        }),
                        // Age rating -> Official
                        expect.objectContaining({
                            tagId: 'tag-全年齢', // resolved via mockTagCreate using '全年齢'
                            userId: 'sys-user-1',
                            isOfficial: true
                        }),
                        // Age rating -> Proprietary
                        expect.objectContaining({
                            tagId: 'tag-全年齢',
                            userId: 'sys-user-1',
                            isOfficial: false
                        })
                    ])
                },
            })
        }));
    });

    it('should throw error when database transaction fails', async () => {
        const mockTransaction = vi.mocked(prisma.$transaction);
        mockTransaction.mockRejectedValueOnce(new Error('Database error'));

        const input = {
            boothJpUrl: 'https://booth.pm/ja/items/100',
            title: 'Test Item',
            description: 'Desc',
            price: 500,
            images: ['img1.jpg'],
            tags: ['tag1'],
            ageRating: 'all_ages',

            sellerName: 'Seller',
            sellerUrl: 'https://seller.booth.pm',
            variations: [],
        };

        await expect(createProductFromScraper(input, 'sys-user-1'))
            .rejects
            .toThrow('Database error');
    });

    it('should throw error when user validation fails', async () => {
        // Mock validateUserExists to return false for this specific test
        vi.mocked(validateUserExists).mockResolvedValueOnce(false);

        const input = {
            boothJpUrl: 'https://booth.pm/ja/items/999',
            title: 'Invalid User Item',
            description: 'Desc',
            price: 500,
            images: [], // Simplified for this check
            tags: [],
            ageRating: 'all_ages',
            sellerName: 'Seller',
            sellerUrl: 'https://seller.booth.pm',
            variations: [],
        };

        await expect(createProductFromScraper(input, 'non-existent-user'))
            .rejects
            .toThrow("User with ID 'non-existent-user' not found in database. Please re-authenticate.");
    });
});
