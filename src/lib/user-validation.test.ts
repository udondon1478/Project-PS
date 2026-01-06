import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateUserExists } from './user-validation';
import { prisma } from '@/lib/prisma';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe('validateUserExists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return false for empty string userId', async () => {
    const result = await validateUserExists('');
    expect(result).toBe(false);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('should return false for whitespace-only userId', async () => {
    const result = await validateUserExists('   ');
    expect(result).toBe(false);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('should return true when user exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: 'existing-user' } as any);

    const result = await validateUserExists('existing-user');
    expect(result).toBe(true);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'existing-user' },
      select: { id: true },
    });
  });

  it('should return false when user does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

    const result = await validateUserExists('non-existent-user');
    expect(result).toBe(false);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'non-existent-user' },
      select: { id: true },
    });
  });
});
