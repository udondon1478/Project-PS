
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting tag count update...');

  // 1. Fetch all tags
  const tags = await prisma.tag.findMany();
  console.log(`Found ${tags.length} tags.`);

  let updatedCount = 0;

  for (const tag of tags) {
    // 2. Count associated products
    const count = await prisma.productTag.count({
      where: {
        tagId: tag.id,
      },
    });

    // 3. Update tag count if different
    if (tag.count !== count) {
      await prisma.tag.update({
        where: { id: tag.id },
        data: { count },
      });
      updatedCount++;
    }

    // Log progress every 100 tags
    if (updatedCount % 100 === 0 && updatedCount > 0) {
        process.stdout.write('.');
    }
  }

  console.log(`\nUpdated counts for ${updatedCount} tags.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
