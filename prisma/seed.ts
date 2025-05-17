import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 対象年齢の初期データ
  const ageRatings = [
    { name: '全年齢' },
    { name: 'R-15' },
    { name: 'R-18' },
    { name: 'NSFW' },
  ];

  for (const rating of ageRatings) {
    await prisma.ageRating.upsert({
      where: { name: rating.name },
      update: {},
      create: rating,
    });
  }

  // カテゴリーの初期データ
  const categories = [
    { name: 'アバター' },
    { name: '衣装' },
    { name: 'アクセサリー' },
    { name: 'ホーム' },
    { name: 'ワールド' },
    { name: 'ツール' },
    { name: 'その他' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }

  console.log('Seed data inserted successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });