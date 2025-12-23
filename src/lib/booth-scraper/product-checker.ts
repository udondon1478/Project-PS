
import { prisma } from '@/lib/prisma';

/**
 * Checks which of the provided BOOTH JP URLs already exist in the database.
 * Returns a Set of existing URLs.
 * 
 * @param boothJpUrls List of BOOTH JP URLs to check
 */
export async function checkExistingProducts(boothJpUrls: string[]): Promise<Set<string>> {
  if (!boothJpUrls || boothJpUrls.length === 0) {
    return new Set();
  }

  try {
    const existing = await prisma.product.findMany({
      where: {
        boothJpUrl: {
          in: boothJpUrls
        }
      },
      select: {
        boothJpUrl: true
      }
    });

    return new Set(existing.map(p => p.boothJpUrl));
  } catch (error) {
    console.error('Failed to check existing products:', error);
    // In case of error (e.g. DB down), we might want to throw or return empty.
    // Throwing ensures we don't accidentally try to create duplicates if uniqueness is crucial,
    // though Prisma create would fail on unique constraint anyway.
    throw error;
  }
}
