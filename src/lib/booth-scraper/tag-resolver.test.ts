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
    it('should return existing tag IDs and create new ones', async () => {
      const inputTags = ['Existing', 'NewTag'];
      
      // Mock existing tag finding
      mockFindMany.mockResolvedValueOnce([
        { id: 'id-existing', name: 'Existing' }
      ]);
      
      // Mock creation
      mockCreate.mockResolvedValueOnce({ id: 'id-new', name: 'newtag' });

      // Mock verifying creation (if fallback logic is triggered? No, logic pushes directly if create succeeds)
      
      const result = await resolver.resolveTags(inputTags);

      // Expect finding existing tags with normalized names
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { name: { in: ['Existing', 'NewTag'] } },
        select: { id: true, name: true },
      });

      // Expect creation of 'newtag'
      expect(mockCreate).toHaveBeenCalledWith({
        data: { name: 'NewTag', language: 'ja' },
        select: { id: true },
      });

      expect(result).toContain('id-existing');
      expect(result).toContain('id-new');
      expect(result.length).toBe(2);
    });

    it('should ignore duplicate inputs (exact match)', async () => {
        mockFindMany.mockResolvedValue([]);
        mockCreate.mockResolvedValue({ id: 'id-dup', name: 'Dup' });

        await resolver.resolveTags(['Dup', 'Dup']);

        expect(mockFindMany).toHaveBeenCalledWith({
             where: { name: { in: ['Dup'] } }, 
             select: { id: true, name: true },
        });
        expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('should treat different casing as different tags', async () => {
        mockFindMany.mockResolvedValue([]);
        mockCreate.mockResolvedValue({ id: 'id-new', name: 'new' });

        await resolver.resolveTags(['Dup', 'dup']);

        expect(mockFindMany).toHaveBeenCalledWith({
             where: { name: { in: ['Dup', 'dup'] } },
             select: { id: true, name: true },
        });
        // Both created if not found (mockCreate called twice)
        expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('should throw error if tag creation and fetch both fail', async () => {
        mockFindMany.mockResolvedValue([]);
        // First create fails
        mockCreate.mockRejectedValue(new Error('DB Error'));
        // Fallback fetch also fails (returns null)
        mockFindUnique.mockResolvedValue(null);

        await expect(resolver.resolveTags(['FailTag'])).rejects.toThrow('Failed to create or find tag FailTag: Error: DB Error');
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
          mockCreate.mockResolvedValueOnce({ id: 'tag-r18', name: 'R-18' });

          const result = await resolver.resolveAgeRating('R-18');

          expect(mockTagCategoryCreate).toHaveBeenCalled();
          expect(mockCreate).toHaveBeenCalledWith({
              data: {
                  name: 'R-18',
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
