import { prisma } from '@/lib/prisma';

/**
 * Validates that a user exists in the database.
 * @param userId The user ID to validate
 * @returns True if the user exists, false otherwise
 */
export async function validateUserExists(userId: string): Promise<boolean> {
  if (!userId || userId.trim() === '') {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  return !!user;
}
