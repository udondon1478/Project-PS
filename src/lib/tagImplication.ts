import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

const MAX_DEPTH = 10;

type DbClient = Prisma.TransactionClient | typeof prisma;

/**
 * BFS で含意チェーンを辿り、入力タグIDに含まれない含意タグIDを返す。
 */
export async function resolveImplications(
  tagIds: string[],
  tx?: Prisma.TransactionClient
): Promise<string[]> {
  if (tagIds.length === 0) {
    return [];
  }

  const db: DbClient = tx ?? prisma;
  const visited = new Set<string>(tagIds);
  const implied: string[] = [];
  let currentBatch = [...tagIds];

  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    if (currentBatch.length === 0) break;

    const implications = await db.tagImplication.findMany({
      where: {
        implyingTagId: { in: currentBatch },
      },
    });

    const nextBatch: string[] = [];
    for (const impl of implications) {
      if (!visited.has(impl.impliedTagId)) {
        visited.add(impl.impliedTagId);
        implied.push(impl.impliedTagId);
        nextBatch.push(impl.impliedTagId);
      }
    }

    currentBatch = nextBatch;
  }

  return implied;
}

/**
 * implyingTagId → impliedTagId の含意を追加したとき循環が生じるか BFS で判定する。
 */
export async function wouldCreateCycle(
  implyingTagId: string,
  impliedTagId: string,
  tx?: Prisma.TransactionClient
): Promise<boolean> {
  if (implyingTagId === impliedTagId) {
    return true;
  }

  const db: DbClient = tx ?? prisma;
  const visited = new Set<string>([impliedTagId]);
  let currentBatch = [impliedTagId];

  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    if (currentBatch.length === 0) break;

    const implications = await db.tagImplication.findMany({
      where: {
        implyingTagId: { in: currentBatch },
      },
    });

    const nextBatch: string[] = [];
    for (const impl of implications) {
      if (impl.impliedTagId === implyingTagId) {
        return true;
      }
      if (!visited.has(impl.impliedTagId)) {
        visited.add(impl.impliedTagId);
        nextBatch.push(impl.impliedTagId);
      }
    }

    currentBatch = nextBatch;
  }

  return false;
}
