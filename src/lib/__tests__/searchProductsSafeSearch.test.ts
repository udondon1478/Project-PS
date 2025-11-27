import { vi, describe, it, expect, beforeEach } from 'vitest';
import { searchProducts, SearchParams } from '../searchProducts';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { Session } from 'next-auth';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// Type definition for Prisma where condition
type WhereCondition = {
  NOT?: unknown;
  AND?: unknown;
  OR?: unknown;
  [key: string]: unknown;
};

const mockedPrismaFindMany = prisma.product.findMany as vi.Mock;
const mockedAuth = auth as vi.MockedFunction<typeof auth>;

describe('searchProducts - Safe Search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrismaFindMany.mockResolvedValue([]);
  });

  it('should add R-18 to negativeTags when safe search is enabled (default)', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'test-user', isSafeSearchEnabled: true } } as any);
    
    await searchProducts({});

    const findManyArgs = mockedPrismaFindMany.mock.calls[0][0];
    const notCondition = findManyArgs?.where?.AND?.find((c: WhereCondition) => c.NOT);

    expect(notCondition).toBeDefined();
    expect(notCondition.NOT.productTags.some.tag.name.in).toContain('R-18');
  });

  it('should NOT add R-18 to negativeTags when safe search is disabled', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'test-user', isSafeSearchEnabled: false } } as any);
    
    await searchProducts({});

    const findManyArgs = mockedPrismaFindMany.mock.calls[0][0];
    const notCondition = findManyArgs?.where?.AND?.find((c: WhereCondition) => c.NOT);

    // If there are no other negative tags, NOT condition might be undefined or empty
    if (notCondition) {
        expect(notCondition.NOT.productTags.some.tag.name.in).not.toContain('R-18');
    } else {
        expect(notCondition).toBeUndefined();
    }
  });

  it('should append R-18 to existing negativeTags when safe search is enabled', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'test-user', isSafeSearchEnabled: true } } as any);
    
    await searchProducts({ negativeTags: ['other-tag'] });

    const findManyArgs = mockedPrismaFindMany.mock.calls[0][0];
    const notCondition = findManyArgs?.where?.AND?.find((c: WhereCondition) => c.NOT);

    expect(notCondition).toBeDefined();
    expect(notCondition.NOT.productTags.some.tag.name.in).toContain('R-18');
    expect(notCondition.NOT.productTags.some.tag.name.in).toContain('other-tag');
  });

  it('should not duplicate R-18 if already present when safe search is enabled', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'test-user', isSafeSearchEnabled: true } } as any);
    
    await searchProducts({ negativeTags: ['R-18'] });

    const findManyArgs = mockedPrismaFindMany.mock.calls[0][0];
    const notCondition = findManyArgs?.where?.AND?.find((c: WhereCondition) => c.NOT);

    expect(notCondition).toBeDefined();
    // Should contain R-18, logic handles duplication implicitly by array check or Set, 
    // but our implementation uses .includes check before pushing.
    // Let's verify it's there.
    expect(notCondition.NOT.productTags.some.tag.name.in).toContain('R-18');
    // To strictly check for duplicates, we'd need to check array length if we care, 
    // but functional requirement is just that it's excluded.
    // The implementation: if (!negativeTagNames.includes('R-18')) negativeTagNames.push('R-18');
    // So it should be unique.
    const tags = notCondition.NOT.productTags.some.tag.name.in;
    expect(tags.filter((t: string) => t === 'R-18').length).toBe(1);
  });

  it('should enable safe search for guest users (no session)', async () => {
    mockedAuth.mockResolvedValue(null);
    
    await searchProducts({});

    const findManyArgs = mockedPrismaFindMany.mock.calls[0][0];
    const notCondition = findManyArgs?.where?.AND?.find((c: WhereCondition) => c.NOT);

    expect(notCondition).toBeDefined();
    expect(notCondition.NOT.productTags.some.tag.name.in).toContain('R-18');
  });
});
