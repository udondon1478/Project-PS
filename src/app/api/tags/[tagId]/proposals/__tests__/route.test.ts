import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAuth, mockPrisma } = vi.hoisted(() => {
  const mockAuth = vi.fn<() => Promise<any>>();
  const mockPrisma = {
    tag: { findUnique: vi.fn() },
    tagCategory: { findUnique: vi.fn() },
    tagProposal: { count: vi.fn(), create: vi.fn() },
  };
  return { mockAuth, mockPrisma };
});

vi.mock('@/auth', () => ({
  auth: mockAuth,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

import { POST } from '../route';

type RouteContext = { params: Promise<{ tagId: string }> };

function createRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/tags/test-tag-id/proposals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createContext(tagId: string): RouteContext {
  return { params: Promise.resolve({ tagId }) };
}

describe('POST /api/tags/[tagId]/proposals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);
      const req = createRequest({ type: 'CATEGORY', categoryId: 'cat-1' });

      const res = await POST(req, createContext('tag-1'));

      expect(res.status).toBe(401);
    });

    it('should return 401 when session has no user id', async () => {
      mockAuth.mockResolvedValueOnce({ user: {} } as any);
      const req = createRequest({ type: 'CATEGORY', categoryId: 'cat-1' });

      const res = await POST(req, createContext('tag-1'));

      expect(res.status).toBe(401);
    });

    it('should return 403 when user is suspended', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', status: 'SUSPENDED' },
      } as any);
      const req = createRequest({ type: 'CATEGORY', categoryId: 'cat-1' });

      const res = await POST(req, createContext('tag-1'));

      expect(res.status).toBe(403);
    });
  });

  describe('Tag existence validation', () => {
    it('should return 404 when tag does not exist', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', status: 'ACTIVE' },
      } as any);
      mockPrisma.tag.findUnique.mockResolvedValueOnce(null);
      const req = createRequest({ type: 'CATEGORY', categoryId: 'cat-1' });

      const res = await POST(req, createContext('tag-1'));

      expect(res.status).toBe(404);
    });
  });

  describe('Validation - Category proposal', () => {
    it('should return 400 when type is missing', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', status: 'ACTIVE' },
      } as any);
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-1' } as any);
      const req = createRequest({ categoryId: 'cat-1' });

      const res = await POST(req, createContext('tag-1'));

      expect(res.status).toBe(400);
    });

    it('should return 400 when type is invalid', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', status: 'ACTIVE' },
      } as any);
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-1' } as any);
      const req = createRequest({ type: 'INVALID_TYPE' });

      const res = await POST(req, createContext('tag-1'));

      expect(res.status).toBe(400);
    });

    it('should return 400 when categoryId is missing for CATEGORY type', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', status: 'ACTIVE' },
      } as any);
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-1' } as any);
      const req = createRequest({ type: 'CATEGORY' });

      const res = await POST(req, createContext('tag-1'));

      expect(res.status).toBe(400);
    });

    it('should return 400 when categoryId is empty string for CATEGORY type', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', status: 'ACTIVE' },
      } as any);
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-1' } as any);
      const req = createRequest({ type: 'CATEGORY', categoryId: '' });

      const res = await POST(req, createContext('tag-1'));

      expect(res.status).toBe(400);
    });
  });

  describe('Validation - Translation proposal', () => {
    it('should return 400 when neither existingTagId nor newTagName is provided for TRANSLATION', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', status: 'ACTIVE' },
      } as any);
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-1' } as any);
      const req = createRequest({ type: 'TRANSLATION' });

      const res = await POST(req, createContext('tag-1'));

      expect(res.status).toBe(400);
    });

    it('should return 400 when newTagName is provided without language for TRANSLATION', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', status: 'ACTIVE' },
      } as any);
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-1' } as any);
      const req = createRequest({ type: 'TRANSLATION', newTagName: 'new-tag' });

      const res = await POST(req, createContext('tag-1'));

      expect(res.status).toBe(400);
    });

    it('should return 400 when language is invalid for TRANSLATION with new tag', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', status: 'ACTIVE' },
      } as any);
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-1' } as any);
      const req = createRequest({
        type: 'TRANSLATION',
        newTagName: 'new-tag',
        language: 'fr',
      });

      const res = await POST(req, createContext('tag-1'));

      expect(res.status).toBe(400);
    });

    it('should accept valid TRANSLATION proposal with existing tag', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', status: 'ACTIVE' },
      } as any);
      mockPrisma.tag.findUnique
        .mockResolvedValueOnce({ id: 'tag-1' } as any)
        .mockResolvedValueOnce({ id: 'existing-tag-id' } as any);
      mockPrisma.tagProposal.count.mockResolvedValueOnce(0);
      mockPrisma.tagProposal.create.mockResolvedValueOnce({
        id: 'proposal-1',
        type: 'TRANSLATION',
        tagId: 'tag-1',
        proposerId: 'user-1',
        existingTagId: 'existing-tag-id',
        status: 'PENDING',
      } as any);
      const req = createRequest({
        type: 'TRANSLATION',
        existingTagId: 'existing-tag-id',
      });

      const res = await POST(req, createContext('tag-1'));

      expect(res.status).toBe(201);
    });

    it('should accept valid TRANSLATION proposal with new tag name and language', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', status: 'ACTIVE' },
      } as any);
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-1' } as any);
      mockPrisma.tagProposal.count.mockResolvedValueOnce(0);
      mockPrisma.tagProposal.create.mockResolvedValueOnce({
        id: 'proposal-2',
        type: 'TRANSLATION',
        tagId: 'tag-1',
        proposerId: 'user-1',
        newTagName: 'hat',
        language: 'en',
        status: 'PENDING',
      } as any);
      const req = createRequest({
        type: 'TRANSLATION',
        newTagName: 'hat',
        language: 'en',
      });

      const res = await POST(req, createContext('tag-1'));

      expect(res.status).toBe(201);
    });
  });

  describe('Validation - Implication proposal', () => {
    it('should return 400 when neither existingTagId nor newTagName is provided for IMPLICATION', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', status: 'ACTIVE' },
      } as any);
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-1' } as any);
      const req = createRequest({ type: 'IMPLICATION' });

      const res = await POST(req, createContext('tag-1'));

      expect(res.status).toBe(400);
    });

    it('should return 400 when newTagName is provided without language for IMPLICATION', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', status: 'ACTIVE' },
      } as any);
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-1' } as any);
      const req = createRequest({ type: 'IMPLICATION', newTagName: 'parent-tag' });

      const res = await POST(req, createContext('tag-1'));

      expect(res.status).toBe(400);
    });
  });

  describe('Validation - reason field', () => {
    it('should accept proposal without reason (optional)', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', status: 'ACTIVE' },
      } as any);
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-1' } as any);
      mockPrisma.tagProposal.count.mockResolvedValueOnce(0);
      mockPrisma.tagCategory.findUnique.mockResolvedValueOnce({ id: 'cat-1' } as any);
      mockPrisma.tagProposal.create.mockResolvedValueOnce({
        id: 'proposal-1',
        type: 'CATEGORY',
        tagId: 'tag-1',
        proposerId: 'user-1',
        categoryId: 'cat-1',
        status: 'PENDING',
      } as any);
      const req = createRequest({ type: 'CATEGORY', categoryId: 'cat-1' });

      const res = await POST(req, createContext('tag-1'));

      expect(res.status).toBe(201);
    });

    it('should accept proposal with reason', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', status: 'ACTIVE' },
      } as any);
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-1' } as any);
      mockPrisma.tagProposal.count.mockResolvedValueOnce(0);
      mockPrisma.tagCategory.findUnique.mockResolvedValueOnce({ id: 'cat-1' } as any);
      mockPrisma.tagProposal.create.mockResolvedValueOnce({
        id: 'proposal-2',
        type: 'CATEGORY',
        tagId: 'tag-1',
        proposerId: 'user-1',
        categoryId: 'cat-1',
        reason: 'This tag belongs to this category because...',
        status: 'PENDING',
      } as any);
      const req = createRequest({
        type: 'CATEGORY',
        categoryId: 'cat-1',
        reason: 'This tag belongs to this category because...',
      });

      const res = await POST(req, createContext('tag-1'));

      expect(res.status).toBe(201);
    });

    it('should return 400 when reason exceeds 1000 characters', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', status: 'ACTIVE' },
      } as any);
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-1' } as any);
      const longReason = 'a'.repeat(1001);
      const req = createRequest({
        type: 'CATEGORY',
        categoryId: 'cat-1',
        reason: longReason,
      });

      const res = await POST(req, createContext('tag-1'));

      expect(res.status).toBe(400);
    });
  });

  describe('Rate limiting', () => {
    it('should return 429 when rate limit exceeded', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', status: 'ACTIVE' },
      } as any);
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-1' } as any);
      mockPrisma.tagProposal.count.mockResolvedValueOnce(5);
      const req = createRequest({ type: 'CATEGORY', categoryId: 'cat-1' });

      const res = await POST(req, createContext('tag-1'));

      expect(res.status).toBe(429);
    });

    it('should allow request when under rate limit', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', status: 'ACTIVE' },
      } as any);
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-1' } as any);
      mockPrisma.tagProposal.count.mockResolvedValueOnce(2);
      mockPrisma.tagCategory.findUnique.mockResolvedValueOnce({ id: 'cat-1' } as any);
      mockPrisma.tagProposal.create.mockResolvedValueOnce({
        id: 'proposal-1',
        type: 'CATEGORY',
        tagId: 'tag-1',
        proposerId: 'user-1',
        categoryId: 'cat-1',
        status: 'PENDING',
      } as any);
      const req = createRequest({ type: 'CATEGORY', categoryId: 'cat-1' });

      const res = await POST(req, createContext('tag-1'));

      expect(res.status).toBe(201);
    });
  });

  describe('Successful proposal creation', () => {
    it('should create CATEGORY proposal and return 201', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', status: 'ACTIVE' },
      } as any);
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-1' } as any);
      mockPrisma.tagProposal.count.mockResolvedValueOnce(0);
      mockPrisma.tagCategory.findUnique.mockResolvedValueOnce({ id: 'cat-1' } as any);
      mockPrisma.tagProposal.create.mockResolvedValueOnce({
        id: 'proposal-1',
        type: 'CATEGORY',
        tagId: 'tag-1',
        proposerId: 'user-1',
        categoryId: 'cat-1',
        status: 'PENDING',
      } as any);
      const req = createRequest({ type: 'CATEGORY', categoryId: 'cat-1' });

      const res = await POST(req, createContext('tag-1'));

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.type).toBe('CATEGORY');
      expect(data.status).toBe('PENDING');
    });

    it('should create TRANSLATION proposal with existing tag and return 201', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', status: 'ACTIVE' },
      } as any);
      mockPrisma.tag.findUnique
        .mockResolvedValueOnce({ id: 'tag-1' } as any)
        .mockResolvedValueOnce({ id: 'existing-trans-tag' } as any);
      mockPrisma.tagProposal.count.mockResolvedValueOnce(0);
      mockPrisma.tagProposal.create.mockResolvedValueOnce({
        id: 'proposal-2',
        type: 'TRANSLATION',
        tagId: 'tag-1',
        proposerId: 'user-1',
        existingTagId: 'existing-trans-tag',
        status: 'PENDING',
      } as any);
      const req = createRequest({
        type: 'TRANSLATION',
        existingTagId: 'existing-trans-tag',
      });

      const res = await POST(req, createContext('tag-1'));

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.type).toBe('TRANSLATION');
    });

    it('should create TRANSLATION proposal with new tag name and return 201', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', status: 'ACTIVE' },
      } as any);
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-1' } as any);
      mockPrisma.tagProposal.count.mockResolvedValueOnce(0);
      mockPrisma.tagProposal.create.mockResolvedValueOnce({
        id: 'proposal-3',
        type: 'TRANSLATION',
        tagId: 'tag-1',
        proposerId: 'user-1',
        newTagName: 'hat',
        language: 'en',
        status: 'PENDING',
      } as any);
      const req = createRequest({
        type: 'TRANSLATION',
        newTagName: 'hat',
        language: 'en',
      });

      const res = await POST(req, createContext('tag-1'));

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.newTagName).toBe('hat');
      expect(data.language).toBe('en');
    });

    it('should create IMPLICATION proposal with existing tag and return 201', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', status: 'ACTIVE' },
      } as any);
      mockPrisma.tag.findUnique
        .mockResolvedValueOnce({ id: 'tag-1' } as any)
        .mockResolvedValueOnce({ id: 'implied-tag-id' } as any);
      mockPrisma.tagProposal.count.mockResolvedValueOnce(0);
      mockPrisma.tagProposal.create.mockResolvedValueOnce({
        id: 'proposal-4',
        type: 'IMPLICATION',
        tagId: 'tag-1',
        proposerId: 'user-1',
        existingTagId: 'implied-tag-id',
        status: 'PENDING',
      } as any);
      const req = createRequest({
        type: 'IMPLICATION',
        existingTagId: 'implied-tag-id',
      });

      const res = await POST(req, createContext('tag-1'));

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.type).toBe('IMPLICATION');
    });

    it('should create IMPLICATION proposal with new tag and return 201', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', status: 'ACTIVE' },
      } as any);
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-1' } as any);
      mockPrisma.tagProposal.count.mockResolvedValueOnce(0);
      mockPrisma.tagProposal.create.mockResolvedValueOnce({
        id: 'proposal-5',
        type: 'IMPLICATION',
        tagId: 'tag-1',
        proposerId: 'user-1',
        newTagName: 'clothing',
        language: 'en',
        status: 'PENDING',
      } as any);
      const req = createRequest({
        type: 'IMPLICATION',
        newTagName: 'clothing',
        language: 'en',
      });

      const res = await POST(req, createContext('tag-1'));

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.newTagName).toBe('clothing');
    });

    it('should include reason in proposal when provided', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', status: 'ACTIVE' },
      } as any);
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-1' } as any);
      mockPrisma.tagProposal.count.mockResolvedValueOnce(0);
      mockPrisma.tagCategory.findUnique.mockResolvedValueOnce({ id: 'cat-1' } as any);
      mockPrisma.tagProposal.create.mockResolvedValueOnce({
        id: 'proposal-6',
        type: 'CATEGORY',
        tagId: 'tag-1',
        proposerId: 'user-1',
        categoryId: 'cat-1',
        reason: 'Fits this category well',
        status: 'PENDING',
      } as any);
      const req = createRequest({
        type: 'CATEGORY',
        categoryId: 'cat-1',
        reason: 'Fits this category well',
      });

      const res = await POST(req, createContext('tag-1'));

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.reason).toBe('Fits this category well');
    });
  });

  describe('Error handling', () => {
    it('should return 500 when create fails unexpectedly', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', status: 'ACTIVE' },
      } as any);
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-1' } as any);
      mockPrisma.tagProposal.count.mockResolvedValueOnce(0);
      mockPrisma.tagCategory.findUnique.mockResolvedValueOnce({ id: 'cat-1' } as any);
      mockPrisma.tagProposal.create.mockRejectedValueOnce(new Error('Database error'));

      const req = createRequest({ type: 'CATEGORY', categoryId: 'cat-1' });

      const res = await POST(req, createContext('tag-1'));

      expect(res.status).toBe(500);
    });

    it('should return 404 when categoryId does not exist', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', status: 'ACTIVE' },
      } as any);
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-1' } as any);
      mockPrisma.tagProposal.count.mockResolvedValueOnce(0);
      mockPrisma.tagCategory.findUnique.mockResolvedValueOnce(null);

      const req = createRequest({ type: 'CATEGORY', categoryId: 'non-existent' });

      const res = await POST(req, createContext('tag-1'));

      expect(res.status).toBe(404);
    });

    it('should return 404 when existingTagId does not exist', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: 'user-1', status: 'ACTIVE' },
      } as any);
      mockPrisma.tag.findUnique
        .mockResolvedValueOnce({ id: 'tag-1' } as any)
        .mockResolvedValueOnce(null);
      mockPrisma.tagProposal.count.mockResolvedValueOnce(0);

      const req = createRequest({ type: 'TRANSLATION', existingTagId: 'non-existent' });

      const res = await POST(req, createContext('tag-1'));

      expect(res.status).toBe(404);
    });
  });
});
