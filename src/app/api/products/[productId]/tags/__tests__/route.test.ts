import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockAuth = vi.fn();
vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}));

vi.mock('@/lib/sanitize', () => ({
  sanitizeAndValidate: (name: string) => name,
}));

const mockProductTagFindMany = vi.fn();
const mockProductTagDeleteMany = vi.fn();
const mockProductTagCreate = vi.fn();
const mockTagFindUnique = vi.fn();
const mockTagCreate = vi.fn();
const mockTagEditHistoryFindFirst = vi.fn();
const mockTagEditHistoryCreate = vi.fn();

const mockTx = {
  productTag: {
    findMany: (...args: unknown[]) => mockProductTagFindMany(...args),
    deleteMany: (...args: unknown[]) => mockProductTagDeleteMany(...args),
    create: (...args: unknown[]) => mockProductTagCreate(...args),
  },
  tag: {
    findUnique: (...args: unknown[]) => mockTagFindUnique(...args),
    create: (...args: unknown[]) => mockTagCreate(...args),
  },
  tagEditHistory: {
    findFirst: (...args: unknown[]) => mockTagEditHistoryFindFirst(...args),
    create: (...args: unknown[]) => mockTagEditHistoryCreate(...args),
  },
};

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: (fn: (tx: typeof mockTx) => Promise<void>) => fn(mockTx),
  },
}));

const mockResolveImplications = vi.fn();
vi.mock('@/lib/tagImplication', () => ({
  resolveImplications: (...args: unknown[]) => mockResolveImplications(...args),
}));

const { PUT } = await import('../route');

function createPutRequest(productId: string, tags: { name: string }[], comment?: string) {
  const req = new NextRequest(`http://localhost/api/products/${productId}/tags`, {
    method: 'PUT',
    body: JSON.stringify({ tags, comment }),
  });
  return { req, context: { params: Promise.resolve({ productId }) } };
}

describe('PUT /api/products/[productId]/tags - implication auto-apply', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockProductTagDeleteMany.mockResolvedValue({ count: 0 });
    mockProductTagCreate.mockResolvedValue({});
    mockTagEditHistoryFindFirst.mockResolvedValue(null);
    mockTagEditHistoryCreate.mockResolvedValue({});
  });

  it('should auto-add implied tags with isImplied: true', async () => {
    // Given: tag-a exists and implies tag-b
    mockProductTagFindMany
      .mockResolvedValueOnce([]) // currentProductTags (initial)
      .mockResolvedValueOnce([{ tagId: 'tag-a' }]) // manual tags query
      .mockResolvedValueOnce([{ tagId: 'tag-a' }]); // existing tags query

    mockTagFindUnique.mockResolvedValue({ id: 'tag-a', name: 'panties' });
    mockResolveImplications.mockResolvedValueOnce(['tag-b']);

    // When: saving tags
    const { req, context } = createPutRequest('product-1', [{ name: 'panties' }]);
    const response = await PUT(req, context);

    // Then: implied tag created with isImplied: true
    expect(response.status).toBe(200);
    expect(mockProductTagCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          productId: 'product-1',
          tagId: 'tag-b',
          isImplied: true,
        }),
      })
    );
  });

  it('should skip implied tags that already exist as manual tags', async () => {
    // Given: tag-a implies tag-b, but tag-b is already a manual tag
    mockProductTagFindMany
      .mockResolvedValueOnce([]) // currentProductTags
      .mockResolvedValueOnce([{ tagId: 'tag-a' }, { tagId: 'tag-b' }]) // manual tags
      .mockResolvedValueOnce([{ tagId: 'tag-a' }, { tagId: 'tag-b' }]); // existing tags

    mockTagFindUnique
      .mockResolvedValueOnce({ id: 'tag-a', name: 'panties' })
      .mockResolvedValueOnce({ id: 'tag-b', name: 'clothing' });
    mockResolveImplications.mockResolvedValueOnce(['tag-b']);

    // When: saving tags
    const { req, context } = createPutRequest('product-1', [
      { name: 'panties' },
      { name: 'clothing' },
    ]);
    const response = await PUT(req, context);

    // Then: no duplicate tag-b created
    expect(response.status).toBe(200);
    const impliedCreates = mockProductTagCreate.mock.calls.filter(
      (call) => call[0]?.data?.isImplied === true
    );
    expect(impliedCreates).toHaveLength(0);
  });

  it('should call resolveImplications with manual tag IDs', async () => {
    // Given: manual tags exist
    mockProductTagFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ tagId: 'tag-a' }, { tagId: 'tag-c' }])
      .mockResolvedValueOnce([{ tagId: 'tag-a' }, { tagId: 'tag-c' }]);

    mockTagFindUnique
      .mockResolvedValueOnce({ id: 'tag-a', name: 'panties' })
      .mockResolvedValueOnce({ id: 'tag-c', name: 'underwear' });
    mockResolveImplications.mockResolvedValueOnce([]);

    // When: saving tags
    const { req, context } = createPutRequest('product-1', [
      { name: 'panties' },
      { name: 'underwear' },
    ]);
    await PUT(req, context);

    // Then: resolveImplications called with manual tag IDs and transaction client
    expect(mockResolveImplications).toHaveBeenCalledWith(
      ['tag-a', 'tag-c'],
      mockTx
    );
  });
});
