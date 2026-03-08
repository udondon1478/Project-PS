import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindMany = vi.fn();

vi.mock('../prisma', () => ({
  prisma: {
    tagImplication: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

// Import after mock setup
const { resolveImplications, wouldCreateCycle } = await import(
  '../tagImplication'
);

describe('resolveImplications', () => {
  beforeEach(() => {
    mockFindMany.mockReset();
  });

  it('should return empty array when no implications exist', async () => {
    // Given: tags with no implications
    const tagIds = ['tag-a', 'tag-b'];
    mockFindMany.mockResolvedValueOnce([]);

    // When: resolving implications
    const result = await resolveImplications(tagIds);

    // Then: no additional tags
    expect(result).toEqual([]);
  });

  it('should return implied tag IDs not already in input', async () => {
    // Given: tag-a implies tag-c
    const tagIds = ['tag-a', 'tag-b'];
    mockFindMany
      .mockResolvedValueOnce([
        { implyingTagId: 'tag-a', impliedTagId: 'tag-c' },
      ])
      .mockResolvedValueOnce([]); // tag-c has no further implications

    // When: resolving implications
    const result = await resolveImplications(tagIds);

    // Then: tag-c is returned as implied
    expect(result).toEqual(['tag-c']);
  });

  it('should resolve chained implications (A→B→C)', async () => {
    // Given: tag-a implies tag-b, tag-b implies tag-c
    const tagIds = ['tag-a'];
    mockFindMany
      .mockResolvedValueOnce([
        { implyingTagId: 'tag-a', impliedTagId: 'tag-b' },
      ])
      .mockResolvedValueOnce([
        { implyingTagId: 'tag-b', impliedTagId: 'tag-c' },
      ])
      .mockResolvedValueOnce([]); // tag-c has no further implications

    // When: resolving implications
    const result = await resolveImplications(tagIds);

    // Then: both tag-b and tag-c are returned
    expect(result).toContain('tag-b');
    expect(result).toContain('tag-c');
    expect(result).toHaveLength(2);
  });

  it('should not include tags already in input', async () => {
    // Given: tag-a implies tag-b, but tag-b is already in input
    const tagIds = ['tag-a', 'tag-b'];
    mockFindMany
      .mockResolvedValueOnce([
        { implyingTagId: 'tag-a', impliedTagId: 'tag-b' },
      ])
      .mockResolvedValueOnce([]); // tag-b checked but no new implications

    // When: resolving implications
    const result = await resolveImplications(tagIds);

    // Then: tag-b is not duplicated
    expect(result).toEqual([]);
  });

  it('should handle circular references without infinite loop', async () => {
    // Given: tag-a → tag-b → tag-a (circular)
    const tagIds = ['tag-a'];
    mockFindMany
      .mockResolvedValueOnce([
        { implyingTagId: 'tag-a', impliedTagId: 'tag-b' },
      ])
      .mockResolvedValueOnce([
        { implyingTagId: 'tag-b', impliedTagId: 'tag-a' },
      ]);
    // BFS stops because tag-a is already visited

    // When: resolving implications
    const result = await resolveImplications(tagIds);

    // Then: only tag-b is returned, no infinite loop
    expect(result).toEqual(['tag-b']);
  });

  it('should handle diamond-shaped implications without duplicates', async () => {
    // Given: tag-a → tag-b, tag-a → tag-c, both tag-b and tag-c → tag-d
    const tagIds = ['tag-a'];
    mockFindMany
      .mockResolvedValueOnce([
        { implyingTagId: 'tag-a', impliedTagId: 'tag-b' },
        { implyingTagId: 'tag-a', impliedTagId: 'tag-c' },
      ])
      .mockResolvedValueOnce([
        { implyingTagId: 'tag-b', impliedTagId: 'tag-d' },
        { implyingTagId: 'tag-c', impliedTagId: 'tag-d' },
      ])
      .mockResolvedValueOnce([]); // tag-d has no further implications

    // When: resolving implications
    const result = await resolveImplications(tagIds);

    // Then: each tag appears only once
    expect(result).toContain('tag-b');
    expect(result).toContain('tag-c');
    expect(result).toContain('tag-d');
    expect(result).toHaveLength(3);
  });

  it('should use batch queries with findMany', async () => {
    // Given: multiple input tags
    const tagIds = ['tag-a', 'tag-b', 'tag-c'];
    mockFindMany.mockResolvedValueOnce([]);

    // When: resolving implications
    await resolveImplications(tagIds);

    // Then: batch query is used with `in` clause
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          implyingTagId: { in: expect.arrayContaining(tagIds) },
        },
      })
    );
  });

  it('should return empty array for empty input', async () => {
    // Given: no tags
    const tagIds: string[] = [];

    // When: resolving implications
    const result = await resolveImplications(tagIds);

    // Then: empty result, no DB queries
    expect(result).toEqual([]);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('should stop at MAX_DEPTH to prevent excessive chain traversal', async () => {
    // Given: a chain deeper than MAX_DEPTH (10 levels)
    const tagIds = ['tag-0'];
    for (let i = 0; i < 12; i++) {
      mockFindMany.mockResolvedValueOnce([
        { implyingTagId: `tag-${i}`, impliedTagId: `tag-${i + 1}` },
      ]);
    }

    // When: resolving implications
    const result = await resolveImplications(tagIds);

    // Then: should not exceed MAX_DEPTH iterations
    // findMany should be called at most MAX_DEPTH + 1 times (initial + MAX_DEPTH levels)
    expect(mockFindMany.mock.calls.length).toBeLessThanOrEqual(11);
    // Should still return some results (up to depth limit)
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(10);
  });

  it('should handle multiple implications from a single tag', async () => {
    // Given: tag-a implies tag-b, tag-c, tag-d
    const tagIds = ['tag-a'];
    mockFindMany
      .mockResolvedValueOnce([
        { implyingTagId: 'tag-a', impliedTagId: 'tag-b' },
        { implyingTagId: 'tag-a', impliedTagId: 'tag-c' },
        { implyingTagId: 'tag-a', impliedTagId: 'tag-d' },
      ])
      .mockResolvedValueOnce([]); // none of them have further implications

    // When: resolving implications
    const result = await resolveImplications(tagIds);

    // Then: all three tags are returned
    expect(result).toContain('tag-b');
    expect(result).toContain('tag-c');
    expect(result).toContain('tag-d');
    expect(result).toHaveLength(3);
  });
});

describe('wouldCreateCycle', () => {
  beforeEach(() => {
    mockFindMany.mockReset();
  });

  it('should return true when adding implication would create a direct cycle', async () => {
    // Given: tag-b already implies tag-a
    // Adding tag-a → tag-b would create A→B→A cycle
    mockFindMany
      .mockResolvedValueOnce([
        { implyingTagId: 'tag-b', impliedTagId: 'tag-a' },
      ]);

    // When: checking if tag-a → tag-b would create a cycle
    const result = await wouldCreateCycle('tag-a', 'tag-b');

    // Then: cycle detected
    expect(result).toBe(true);
  });

  it('should return true when adding implication would create an indirect cycle', async () => {
    // Given: tag-b → tag-c → tag-a (existing chain)
    // Adding tag-a → tag-b would create A→B→C→A cycle
    mockFindMany
      .mockResolvedValueOnce([
        { implyingTagId: 'tag-b', impliedTagId: 'tag-c' },
      ])
      .mockResolvedValueOnce([
        { implyingTagId: 'tag-c', impliedTagId: 'tag-a' },
      ]);

    // When: checking if tag-a → tag-b would create a cycle
    const result = await wouldCreateCycle('tag-a', 'tag-b');

    // Then: cycle detected
    expect(result).toBe(true);
  });

  it('should return false when no cycle would be created', async () => {
    // Given: tag-b has no implications that lead back to tag-a
    mockFindMany
      .mockResolvedValueOnce([
        { implyingTagId: 'tag-b', impliedTagId: 'tag-c' },
      ])
      .mockResolvedValueOnce([]); // tag-c has no implications

    // When: checking if tag-a → tag-b would create a cycle
    const result = await wouldCreateCycle('tag-a', 'tag-b');

    // Then: no cycle
    expect(result).toBe(false);
  });

  it('should return false when implied tag has no outgoing implications', async () => {
    // Given: tag-b has no implications at all
    mockFindMany.mockResolvedValueOnce([]);

    // When: checking if tag-a → tag-b would create a cycle
    const result = await wouldCreateCycle('tag-a', 'tag-b');

    // Then: no cycle
    expect(result).toBe(false);
  });

  it('should return true for self-reference (A→A)', async () => {
    // Given/When: checking if tag-a → tag-a would create a cycle
    const result = await wouldCreateCycle('tag-a', 'tag-a');

    // Then: self-reference is a cycle
    expect(result).toBe(true);
  });
});
