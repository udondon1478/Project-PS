import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';

// Prisma mocks
const mockImplicationFindMany = vi.fn();
const mockImplicationCreate = vi.fn();
const mockImplicationDelete = vi.fn();
const mockImplicationFindUnique = vi.fn();
const mockImplicationCount = vi.fn();
const mockTagFindUnique = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    tagImplication: {
      findMany: (...args: unknown[]) => mockImplicationFindMany(...args),
      create: (...args: unknown[]) => mockImplicationCreate(...args),
      delete: (...args: unknown[]) => mockImplicationDelete(...args),
      findUnique: (...args: unknown[]) => mockImplicationFindUnique(...args),
      count: (...args: unknown[]) => mockImplicationCount(...args),
    },
    tag: {
      findUnique: (...args: unknown[]) => mockTagFindUnique(...args),
    },
  },
}));

// Auth mock
const mockIsAdmin = vi.fn();
vi.mock('@/lib/auth', () => ({
  isAdmin: () => mockIsAdmin(),
}));

// wouldCreateCycle mock
const mockWouldCreateCycle = vi.fn();
vi.mock('@/lib/tagImplication', () => ({
  wouldCreateCycle: (...args: unknown[]) => mockWouldCreateCycle(...args),
}));

const { GET, POST, DELETE } = await import('../route');

describe('GET /api/admin/tag-implications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 403 when user is not admin', async () => {
    // Given: non-admin user
    mockIsAdmin.mockResolvedValueOnce(false);

    // When: making GET request
    const request = new Request('http://localhost/api/admin/tag-implications');
    const response = await GET(request);

    // Then: forbidden
    expect(response.status).toBe(403);
  });

  it('should return implications list with tag details', async () => {
    // Given: admin user and existing implications
    mockIsAdmin.mockResolvedValueOnce(true);
    const implications = [
      {
        id: 'impl-1',
        implyingTagId: 'tag-a',
        impliedTagId: 'tag-b',
        createdAt: new Date('2026-01-01'),
        implyingTag: { id: 'tag-a', name: 'panties', displayName: 'パンツ' },
        impliedTag: { id: 'tag-b', name: 'clothing', displayName: '衣服' },
      },
    ];
    mockImplicationFindMany.mockResolvedValueOnce(implications);
    mockImplicationCount.mockResolvedValueOnce(1);

    // When: making GET request
    const request = new Request('http://localhost/api/admin/tag-implications');
    const response = await GET(request);
    const body = await response.json();

    // Then: returns implications with tag info
    expect(response.status).toBe(200);
    expect(body.implications).toHaveLength(1);
    expect(body.implications[0].implyingTag.name).toBe('panties');
    expect(body.implications[0].impliedTag.name).toBe('clothing');
    expect(body.total).toBe(1);
  });

  it('should support pagination with limit and offset', async () => {
    // Given: admin user
    mockIsAdmin.mockResolvedValueOnce(true);
    mockImplicationFindMany.mockResolvedValueOnce([]);
    mockImplicationCount.mockResolvedValueOnce(50);

    // When: making GET request with pagination
    const request = new Request(
      'http://localhost/api/admin/tag-implications?limit=10&offset=20'
    );
    const response = await GET(request);

    // Then: pagination params are applied
    expect(response.status).toBe(200);
    expect(mockImplicationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 20,
      })
    );
  });

  it('should filter by tagId when provided', async () => {
    // Given: admin user
    mockIsAdmin.mockResolvedValueOnce(true);
    mockImplicationFindMany.mockResolvedValueOnce([]);
    mockImplicationCount.mockResolvedValueOnce(0);

    // When: making GET request with tagId filter
    const request = new Request(
      'http://localhost/api/admin/tag-implications?tagId=tag-a'
    );
    const response = await GET(request);

    // Then: filter is applied
    expect(response.status).toBe(200);
    expect(mockImplicationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { implyingTagId: 'tag-a' },
            { impliedTagId: 'tag-a' },
          ]),
        }),
      })
    );
  });
});

describe('POST /api/admin/tag-implications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 403 when user is not admin', async () => {
    // Given: non-admin user
    mockIsAdmin.mockResolvedValueOnce(false);

    // When: making POST request
    const request = new Request('http://localhost/api/admin/tag-implications', {
      method: 'POST',
      body: JSON.stringify({
        implyingTagId: 'tag-a',
        impliedTagId: 'tag-b',
      }),
    });
    const response = await POST(request);

    // Then: forbidden
    expect(response.status).toBe(403);
  });

  it('should create implication successfully', async () => {
    // Given: admin user, valid tags, no cycle
    mockIsAdmin.mockResolvedValueOnce(true);
    mockTagFindUnique
      .mockResolvedValueOnce({ id: 'tag-a', name: 'panties' })
      .mockResolvedValueOnce({ id: 'tag-b', name: 'clothing' });
    mockWouldCreateCycle.mockResolvedValueOnce(false);
    mockImplicationFindUnique.mockResolvedValueOnce(null); // no duplicate
    const created = {
      id: 'impl-1',
      implyingTagId: 'tag-a',
      impliedTagId: 'tag-b',
      createdAt: new Date(),
    };
    mockImplicationCreate.mockResolvedValueOnce(created);

    // When: creating implication
    const request = new Request('http://localhost/api/admin/tag-implications', {
      method: 'POST',
      body: JSON.stringify({
        implyingTagId: 'tag-a',
        impliedTagId: 'tag-b',
      }),
    });
    const response = await POST(request);

    // Then: created successfully
    expect(response.status).toBe(201);
  });

  it('should return 400 when implyingTagId is missing', async () => {
    // Given: admin user, missing implyingTagId
    mockIsAdmin.mockResolvedValueOnce(true);

    // When: creating implication without implyingTagId
    const request = new Request('http://localhost/api/admin/tag-implications', {
      method: 'POST',
      body: JSON.stringify({ impliedTagId: 'tag-b' }),
    });
    const response = await POST(request);

    // Then: bad request
    expect(response.status).toBe(400);
  });

  it('should return 400 when impliedTagId is missing', async () => {
    // Given: admin user, missing impliedTagId
    mockIsAdmin.mockResolvedValueOnce(true);

    // When: creating implication without impliedTagId
    const request = new Request('http://localhost/api/admin/tag-implications', {
      method: 'POST',
      body: JSON.stringify({ implyingTagId: 'tag-a' }),
    });
    const response = await POST(request);

    // Then: bad request
    expect(response.status).toBe(400);
  });

  it('should return 400 for self-referencing implication', async () => {
    // Given: admin user, same tag for both sides
    mockIsAdmin.mockResolvedValueOnce(true);

    // When: creating self-referencing implication
    const request = new Request('http://localhost/api/admin/tag-implications', {
      method: 'POST',
      body: JSON.stringify({
        implyingTagId: 'tag-a',
        impliedTagId: 'tag-a',
      }),
    });
    const response = await POST(request);

    // Then: bad request
    expect(response.status).toBe(400);
  });

  it('should return 400 when implyingTag does not exist', async () => {
    // Given: admin user, implyingTag not found
    mockIsAdmin.mockResolvedValueOnce(true);
    mockTagFindUnique.mockResolvedValueOnce(null); // implyingTag not found

    // When: creating implication
    const request = new Request('http://localhost/api/admin/tag-implications', {
      method: 'POST',
      body: JSON.stringify({
        implyingTagId: 'nonexistent',
        impliedTagId: 'tag-b',
      }),
    });
    const response = await POST(request);

    // Then: bad request
    expect(response.status).toBe(400);
  });

  it('should return 400 when impliedTag does not exist', async () => {
    // Given: admin user, impliedTag not found
    mockIsAdmin.mockResolvedValueOnce(true);
    mockTagFindUnique
      .mockResolvedValueOnce({ id: 'tag-a', name: 'panties' })
      .mockResolvedValueOnce(null); // impliedTag not found

    // When: creating implication
    const request = new Request('http://localhost/api/admin/tag-implications', {
      method: 'POST',
      body: JSON.stringify({
        implyingTagId: 'tag-a',
        impliedTagId: 'nonexistent',
      }),
    });
    const response = await POST(request);

    // Then: bad request
    expect(response.status).toBe(400);
  });

  it('should return 400 when cycle would be created', async () => {
    // Given: admin user, valid tags, but would create cycle
    mockIsAdmin.mockResolvedValueOnce(true);
    mockTagFindUnique
      .mockResolvedValueOnce({ id: 'tag-a', name: 'panties' })
      .mockResolvedValueOnce({ id: 'tag-b', name: 'clothing' });
    mockWouldCreateCycle.mockResolvedValueOnce(true);

    // When: creating implication that would cause cycle
    const request = new Request('http://localhost/api/admin/tag-implications', {
      method: 'POST',
      body: JSON.stringify({
        implyingTagId: 'tag-a',
        impliedTagId: 'tag-b',
      }),
    });
    const response = await POST(request);

    // Then: bad request with cycle error
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toMatch(/循環/);
  });

  it('should return 409 when duplicate implication exists', async () => {
    // Given: admin user, valid tags, no cycle, but duplicate exists
    mockIsAdmin.mockResolvedValueOnce(true);
    mockTagFindUnique
      .mockResolvedValueOnce({ id: 'tag-a', name: 'panties' })
      .mockResolvedValueOnce({ id: 'tag-b', name: 'clothing' });
    mockWouldCreateCycle.mockResolvedValueOnce(false);
    mockImplicationFindUnique.mockResolvedValueOnce({
      id: 'existing-impl',
    }); // duplicate found

    // When: creating duplicate implication
    const request = new Request('http://localhost/api/admin/tag-implications', {
      method: 'POST',
      body: JSON.stringify({
        implyingTagId: 'tag-a',
        impliedTagId: 'tag-b',
      }),
    });
    const response = await POST(request);

    // Then: conflict
    expect(response.status).toBe(409);
  });
});

describe('DELETE /api/admin/tag-implications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 403 when user is not admin', async () => {
    // Given: non-admin user
    mockIsAdmin.mockResolvedValueOnce(false);

    // When: making DELETE request
    const request = new Request('http://localhost/api/admin/tag-implications', {
      method: 'DELETE',
      body: JSON.stringify({ id: 'impl-1' }),
    });
    const response = await DELETE(request);

    // Then: forbidden
    expect(response.status).toBe(403);
  });

  it('should delete implication successfully', async () => {
    // Given: admin user, existing implication
    mockIsAdmin.mockResolvedValueOnce(true);
    const deleted = {
      id: 'impl-1',
      implyingTagId: 'tag-a',
      impliedTagId: 'tag-b',
    };
    mockImplicationDelete.mockResolvedValueOnce(deleted);

    // When: deleting implication
    const request = new Request('http://localhost/api/admin/tag-implications', {
      method: 'DELETE',
      body: JSON.stringify({ id: 'impl-1' }),
    });
    const response = await DELETE(request);

    // Then: deleted successfully
    expect(response.status).toBe(200);
  });

  it('should return 400 when id is missing', async () => {
    // Given: admin user, no id
    mockIsAdmin.mockResolvedValueOnce(true);

    // When: deleting without id
    const request = new Request('http://localhost/api/admin/tag-implications', {
      method: 'DELETE',
      body: JSON.stringify({}),
    });
    const response = await DELETE(request);

    // Then: bad request
    expect(response.status).toBe(400);
  });

  it('should return 404 when implication does not exist', async () => {
    // Given: admin user, implication not found
    mockIsAdmin.mockResolvedValueOnce(true);
    mockImplicationDelete.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Record to delete not found', {
        code: 'P2025',
        clientVersion: '1',
      })
    );

    // When: deleting nonexistent implication
    const request = new Request('http://localhost/api/admin/tag-implications', {
      method: 'DELETE',
      body: JSON.stringify({ id: 'nonexistent' }),
    });
    const response = await DELETE(request);

    // Then: not found
    expect(response.status).toBe(404);
  });
});
