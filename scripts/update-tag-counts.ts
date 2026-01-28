
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting tag count update...');

  // 1. Get product counts per tag using groupBy (avoiding N+1)
  const tagCounts = await prisma.productTag.groupBy({
    by: ['tagId'],
    _count: {
      tagId: true,
    },
  });

  console.log(`Found counts for ${tagCounts.length} tags.`);

  // Create a map for easy lookup
  const countMap = new Map<string, number>();
  tagCounts.forEach((item) => {
    countMap.set(item.tagId, item._count.tagId);
  });

  // 2. Fetch all tags to check current counts
  const tags = await prisma.tag.findMany();
  console.log(`Checking ${tags.length} total tags.`);

  let updatedCount = 0;

  // 3. Update tags where count differs
  for (const tag of tags) {
    const correctCount = countMap.get(tag.id) || 0;

    if (tag.count !== correctCount) {
      await prisma.tag.update({
        where: { id: tag.id },
        data: { count: correctCount },
      });
      updatedCount++;

      if (updatedCount % 100 === 0) {
        process.stdout.write('.');
      }
    }
  }

  console.log(`\nUpdated counts for ${updatedCount} tags.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
