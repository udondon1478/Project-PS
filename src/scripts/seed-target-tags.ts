import { prisma } from '@/lib/prisma';

const TARGETS = [
  { tag: 'VRChat', category: '3Dモデル' },
  { tag: 'VRChat', category: '素材データ' }
];

async function seed() {
  console.log('Seeding optimal scraper target tags...');

  // Optional: Disable or delete the generic "VRChat" query (no category) if it creates noise
  // We won't delete it automatically to be safe, but we'll disable it if found
  try {
    const generic = await prisma.scraperTargetTag.findFirst({
      where: {
        tag: 'VRChat',
        category: null,
      },
    });

    if (generic) {
        console.log('Found generic "VRChat" tag (no category). Disabling it to reduce noise...');
        await prisma.scraperTargetTag.update({
            where: { id: generic.id },
            data: { enabled: false }
        });
    }
  } catch(e) {
    console.warn('Error checking generic tag:', e);
  }

  for (const target of TARGETS) {
    try {
      const existing = await prisma.scraperTargetTag.findUnique({
        where: {
          tag_category: {
            tag: target.tag,
            category: target.category as string // Cast as we know it's string in our defined targets
          }
        }
      });

      if (existing) {
        if (!existing.enabled) {
          console.log(`Enabling existing target: ${target.tag} (${target.category})`);
          await prisma.scraperTargetTag.update({
            where: { id: existing.id },
            data: { enabled: true }
          });
        } else {
            console.log(`Target already exists and enabled: ${target.tag} (${target.category})`);
        }
      } else {
        console.log(`Creating new target: ${target.tag} (${target.category})`);
        await prisma.scraperTargetTag.create({
          data: {
            tag: target.tag,
            category: target.category,
            enabled: true
          }
        });
      }
    } catch (e) {
      console.error(`Failed to process target ${target.tag} (${target.category}):`, e);
    }
  }

  console.log('Seeding completed.');
  
  // Verify final list
  const allTags = await prisma.scraperTargetTag.findMany({ where: { enabled: true } });
  console.log('--- Active Scraper Targets ---');
  allTags.forEach(t => {
      console.log(`- Tag: "${t.tag}", Category: "${t.category || '(None)'}"`);
  });
}

seed()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
