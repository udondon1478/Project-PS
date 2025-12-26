import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TagResolver } from './tag-resolver';

// Mocks
const mockFindMany = vi.fn();
const mockCreate = vi.fn();
const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
const mockTagCategoryFindUnique = vi.fn();
const mockTagCategoryCreate = vi.fn();

vi.mock('../prisma', () => ({
  prisma: {
    tag: {
      findMany: (...args: any[]) => mockFindMany(...args),
      create: (...args: any[]) => mockCreate(...args),
      findUnique: (...args: any[]) => mockFindUnique(...args),
      update: (...args: any[]) => mockUpdate(...args),
    },
    tagCategory: {
      findUnique: (...args: any[]) => mockTagCategoryFindUnique(...args),
      create: (...args: any[]) => mockTagCategoryCreate(...args),
    }
  }
}));

describe('TagResolver', () => {
  let resolver: TagResolver;

  beforeEach(() => {
    resolver = new TagResolver();
    vi.clearAllMocks();
  });

  describe('resolveTags', () => {
    it('should return existing tag IDs and create new ones with displayName', async () => {
      const inputTags = ['existing', 'NewTag'];
      
      // Mock existing tag finding (normalized to lowercase)
      mockFindMany.mockResolvedValueOnce([
        { id: 'id-existing', name: 'existing', displayName: 'existing' }
      ]);
      
      // Mock creation with displayName
      mockCreate.mockResolvedValueOnce({ id: 'id-new' });
      
      const result = await resolver.resolveTags(inputTags);

      // Expect finding existing tags with normalized (lowercase) names
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { name: { in: ['existing', 'newtag'] } },
        select: { id: true, name: true, displayName: true },
      });

      // Expect creation of 'newtag' with displayName 'NewTag'
      expect(mockCreate).toHaveBeenCalledWith({
        data: { name: 'newtag', displayName: 'NewTag', language: 'ja' },
        select: { id: true },
      });

      expect(result).toContain('id-existing');
      expect(result).toContain('id-new');
      expect(result.length).toBe(2);
    });

    it('should ignore duplicate inputs (exact match)', async () => {
        mockFindMany.mockResolvedValue([]);
        mockCreate.mockResolvedValue({ id: 'id-dup' });

        await resolver.resolveTags(['Dup', 'Dup']);

        // Normalized to lowercase 'dup'
        expect(mockFindMany).toHaveBeenCalledWith({
             where: { name: { in: ['dup'] } }, 
             select: { id: true, name: true, displayName: true },
        });
        expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('should treat different casing as same tag and preserve first displayName', async () => {
        mockFindMany.mockResolvedValue([]);
        mockCreate.mockResolvedValue({ id: 'id-new' });

        await resolver.resolveTags(['NEW', 'new']);

        // Both normalize to 'new', so only one tag is searched/created
        expect(mockFindMany).toHaveBeenCalledWith({
             where: { name: { in: ['new'] } },
             select: { id: true, name: true, displayName: true },
        });
        // Only 1 create since they are deduplicated to the same normalized name
        expect(mockCreate).toHaveBeenCalledTimes(1);
        // displayName should be 'NEW' (first occurrence)
        expect(mockCreate).toHaveBeenCalledWith({
             data: { name: 'new', displayName: 'NEW', language: 'ja' },
             select: { id: true },
        });
    });

    it('should handle VRChat variants and preserve first displayName', async () => {
        mockFindMany.mockResolvedValue([]);
        mockCreate.mockResolvedValue({ id: 'id-vrchat' });

        const result = await resolver.resolveTags(['VRChat', 'vrChat', 'vrchat']);

        // All normalize to 'vrchat'
        expect(mockFindMany).toHaveBeenCalledWith({
             where: { name: { in: ['vrchat'] } },
             select: { id: true, name: true, displayName: true },
        });
        // Only 1 create
        expect(mockCreate).toHaveBeenCalledTimes(1);
        // displayName should be 'VRChat' (first occurrence)
        expect(mockCreate).toHaveBeenCalledWith({
             data: { name: 'vrchat', displayName: 'VRChat', language: 'ja' },
             select: { id: true },
        });
        expect(result).toEqual(['id-vrchat']);
    });

    it('should not overwrite existing displayName', async () => {
        // Tag already exists with displayName
        mockFindMany.mockResolvedValue([{
            id: 'id-existing',
            name: 'vrchat',
            displayName: 'VRChat'
        }]);

        const result = await resolver.resolveTags(['VRCHAT', 'vrchat']);

        // No creation should happen
        expect(mockCreate).not.toHaveBeenCalled();
        // Should return the existing tag's ID
        expect(result).toEqual(['id-existing']);
    });

    it('should normalize full-width characters and spaces', async () => {
        mockFindMany.mockResolvedValue([]);
        mockCreate.mockResolvedValue({ id: 'id-tag' });

        await resolver.resolveTags(['Ｔａｇ　Ｎａｍｅ']); // Full-width chars and space

        // Normalized to lowercase with single space
        expect(mockFindMany).toHaveBeenCalledWith({
             where: { name: { in: ['tag name'] } },
             select: { id: true, name: true, displayName: true },
        });
        // displayName preserves the original input (NFKC normalized but not lowercased here,
        // but the original string is stored as-is before toLowerCase)
        expect(mockCreate).toHaveBeenCalledWith({
             data: { name: 'tag name', displayName: 'Ｔａｇ　Ｎａｍｅ', language: 'ja' },
             select: { id: true },
        });
    });

    it('should collapse multiple spaces', async () => {
        mockFindMany.mockResolvedValue([]);
        mockCreate.mockResolvedValue({ id: 'id-tag' });

        await resolver.resolveTags(['Tag   Name']);

        // Normalized to lowercase with collapsed spaces
        expect(mockFindMany).toHaveBeenCalledWith({
             where: { name: { in: ['tag name'] } },
             select: { id: true, name: true, displayName: true },
        });
    });

    it('should throw error if creation and fetch both fail', async () => {
        mockFindMany.mockResolvedValue([]);
        // First create fails
        mockCreate.mockRejectedValue(new Error('DB Error'));
        // Fallback fetch also fails (returns null)
        mockFindUnique.mockResolvedValue(null);

        const promise = resolver.resolveTags(['FailTag']);
        // Error message uses normalized name (lowercase)
        await expect(promise).rejects.toThrow('Failed to create or find tag: failtag');
    });
  });

  describe('resolveAgeRating', () => {
      it('should return null for null input', async () => {
          expect(await resolver.resolveAgeRating(null)).toBeNull();
      });

      it('should create age_rating category if missing and resolve tag', async () => {
          // Mock category missing then created
          mockTagCategoryFindUnique.mockResolvedValueOnce(null);
          mockTagCategoryCreate.mockResolvedValueOnce({ id: 'cat-age', name: 'age_rating' });

          // Mock tag missing then created
          mockFindUnique.mockResolvedValueOnce(null);
          mockCreate.mockResolvedValueOnce({ id: 'tag-r18', name: 'r-18' });

          const result = await resolver.resolveAgeRating('R-18');

          expect(mockTagCategoryCreate).toHaveBeenCalled();
          // normalizeTagName applies toLowerCase, so 'r-18' is expected
          expect(mockCreate).toHaveBeenCalledWith({
              data: {
                  name: 'r-18',
                  language: 'ja',
                  tagCategoryId: 'cat-age'
              }
          });
          expect(result).toBe('tag-r18');
      });

      it('should use existing category and tag', async () => {
        mockTagCategoryFindUnique.mockResolvedValue({ id: 'cat-age', name: 'age_rating' });
        
        // Mock tag exists and is linked
        mockFindUnique.mockResolvedValue({ id: 'tag-adult', name: 'R-18', tagCategoryId: 'cat-age' });

        const result = await resolver.resolveAgeRating('R-18');

        expect(mockTagCategoryCreate).not.toHaveBeenCalled();
        expect(mockCreate).not.toHaveBeenCalled();
        expect(result).toBe('tag-adult');
      });

      it('should link existing tag to category if not linked', async () => {
         mockTagCategoryFindUnique.mockResolvedValue({ id: 'cat-age', name: 'age_rating' });
         mockFindUnique.mockResolvedValue({ id: 'tag-r15', name: 'R-15', tagCategoryId: null });

         await resolver.resolveAgeRating('R-15');

         expect(mockUpdate).toHaveBeenCalledWith({
             where: { id: 'tag-r15' },
             data: { tagCategoryId: 'cat-age' }
         });
      });

      it('should throw error if resolveAgeRating creation and fetch both fail', async () => {
          mockTagCategoryFindUnique.mockResolvedValue({ id: 'cat-age', name: 'age_rating' });
          mockFindUnique.mockResolvedValueOnce(null); // Initial find fails

          // Create fails
          mockCreate.mockRejectedValueOnce(new Error('DB Unique constraint violations or something'));
          
          // Fallback find also fails (returns null)
          mockFindUnique.mockResolvedValueOnce(null);

          await expect(resolver.resolveAgeRating('RiskTag')).rejects.toThrow();
      });
  });
});
