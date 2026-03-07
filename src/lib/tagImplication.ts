import { prisma as globalPrisma } from '@/lib/prisma';
import { Prisma, PrismaClient } from '@prisma/client';

type TxClient = Prisma.TransactionClient | PrismaClient;

/**
 * Given a list of tag IDs, resolve all implied tags recursively.
 * Returns a unique array of ALL tag IDs (original + implied).
 * 
 * @param tagIds - The initial set of tag IDs.
 * @param tx - Optional transaction client.
 * @returns Promise<string[]> - Array of all tag IDs including implied ones.
 */
export async function resolveImplications(tagIds: string[], tx: TxClient = globalPrisma): Promise<string[]> {
  if (!tagIds || tagIds.length === 0) return [];

  const resolvedTagIds = new Set<string>(tagIds);
  const queue = [...tagIds];

  // We process in batches to minimize DB calls, but breadth-first search is good.
  // To avoid circular dependency infinite loops, we only add to queue if not already in resolvedTagIds.

  while (queue.length > 0) {
    // Process the entire current queue in one batch query
    const currentBatch = [...queue];
    queue.length = 0; // Clear the queue for the next iteration

    const implications = await tx.tagImplication.findMany({
      where: {
        implyingTagId: { in: currentBatch },
      },
      select: {
        impliedTagId: true,
      },
    });

    for (const imp of implications) {
      if (!resolvedTagIds.has(imp.impliedTagId)) {
        resolvedTagIds.add(imp.impliedTagId);
        queue.push(imp.impliedTagId);
      }
    }
  }

  return Array.from(resolvedTagIds);
}

/**
 * Returns the implied tags separated from the original tags.
 * 
 * @param originalTagIds - The explicit tag IDs.
 * @param tx - Optional transaction client.
 * @returns Promise<string[]>
 */
export async function getImpliedTags(originalTagIds: string[], tx: TxClient = globalPrisma): Promise<string[]> {
  const allTags = await resolveImplications(originalTagIds, tx);
  const originalSet = new Set(originalTagIds);
  return allTags.filter(id => !originalSet.has(id));
}
