import { prisma } from '@/lib/prisma';
import { Tag } from '@prisma/client';

/**
 * Resolves a tag name or ID to its canonical tag.
 * If the tag is an alias, it recursively follows the canonicalId chain.
 * Handles loops by tracking visited IDs.
 * 
 * @param tagNameOrId The tag name or ID to resolve
 * @returns The canonical Tag object, or null if not found
 */
export async function resolveAlias(tagNameOrId: string): Promise<Tag | null> {
  let current: Tag | null = await prisma.tag.findFirst({
    where: {
      OR: [
        { id: tagNameOrId },
        { name: tagNameOrId },
        { displayName: tagNameOrId } // Also check displayName just in case
      ]
    }
  });

  if (!current) return null;

  const visited = new Set<string>();
  visited.add(current.id);

  // Traverse alias chain
  while (current && current.isAlias && current.canonicalId) {
    if (visited.has(current.canonicalId)) {
      console.warn(`Circular alias detected for tag ${current.name} (${current.id}) -> ${current.canonicalId}`);
      break; // Stop at the last valid tag before the loop
    }

    const next: Tag | null = await prisma.tag.findUnique({
      where: { id: current.canonicalId }
    });

    if (!next) {
      console.warn(`Broken alias link for tag ${current.name} (${current.id}) -> ${current.canonicalId}`);
      break; // Stop if link is broken
    }

    current = next;
    visited.add(current.id);
  }

  return current;
}

/**
 * Bulk resolves a list of tag names/IDs.
 * Returns a map of original input -> resolved canonical tag name.
 * If a tag is not found, it is mapped to itself (or null? Issue implies we want to search for the resolved one).
 * For search purposes, if we can't find it, we usually keep the original query.
 */
export async function resolveTagAliasesForSearch(inputs: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  
  // Resolve in parallel (concurrency limited by connection pool implicitly)
  await Promise.all(inputs.map(async (input) => {
    try {
      const resolved = await resolveAlias(input);
      if (resolved) {
        result.set(input, resolved.name);
      } else {
        result.set(input, input); // Keep original if not found
      }
    } catch (e) {
      console.error(`Error resolving alias for ${input}:`, e);
      result.set(input, input); // Fallback
    }
  }));

  return result;
}
