import { PrismaClient, Role } from '@prisma/client'; // Roleをインポート

const prisma = new PrismaClient();

async function main() {
  // 既存のタグデータをクリア処理はコメントアウトまたは削除（管理画面から管理するため）
  // await prisma.tag.deleteMany();

  // 初期管理者ユーザーの追加 (テスト用)
  // TODO: 実際の運用では、安全な方法で管理者ユーザーを作成してください。
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' }, // 管理者として設定したいメールアドレス
    update: {
      role: Role.ADMIN,
    },
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: Role.ADMIN,
      // 他の必須フィールドがあればここに追加
    },
  });
  console.log(`Created/Updated admin user with id: ${adminUser.id}`);

  // タグカテゴリの初期データを作成
  const ageRatingCategory = await prisma.tagCategory.upsert({
    where: { name: 'age_rating' },
    update: {},
    create: { name: 'age_rating', color: '#CCCCCC' },
  });

  const productCategory = await prisma.tagCategory.upsert({
    where: { name: 'product_category' },
    update: {},
    create: { name: 'product_category', color: '#00CC99' },
  });

  const featureCategory = await prisma.tagCategory.upsert({
    where: { name: 'feature' },
    update: {},
    create: { name: 'feature', color: '#33CCFF' },
  });

  // その他のタグカテゴリの初期データ
  const otherTagCategory = await prisma.tagCategory.upsert({
    where: { name: 'other' },
    update: {},
    create: { name: 'other', color: '#999999' }, // 仮の色を設定
  });

  // 対象年齢タグの初期データ
  const ageRatingTags = [
    { name: '全年齢', tagCategoryId: ageRatingCategory.id },
    { name: 'R-15', tagCategoryId: ageRatingCategory.id },
    { name: 'R-18', tagCategoryId: ageRatingCategory.id },
    { name: 'NSFW', tagCategoryId: ageRatingCategory.id },
  ];

  for (const tagData of ageRatingTags) {
    await prisma.tag.upsert({
      where: { name: tagData.name },
      update: {},
      create: { ...tagData, language: 'ja' },
    });
  }

  // カテゴリータグの初期データ
  const categoryTags = [
    { name: 'アバター', tagCategoryId: productCategory.id },
    { name: '衣装', tagCategoryId: productCategory.id },
    { name: 'アクセサリー', tagCategoryId: productCategory.id },
    { name: 'ホーム', tagCategoryId: productCategory.id },
    { name: 'ワールド', tagCategoryId: productCategory.id },
    { name: 'ツール', tagCategoryId: productCategory.id },
    { name: 'その他', tagCategoryId: productCategory.id },
  ];

  for (const tagData of categoryTags) {
    await prisma.tag.upsert({
      where: { name: tagData.name },
      update: {},
      create: { ...tagData, language: 'ja' },
    });
  }

  // 主要機能タグの初期データ
  const featureTags = [
    { name: 'Quest対応', tagCategoryId: featureCategory.id },
    { name: 'PhysBone対応', tagCategoryId: featureCategory.id },
    { name: 'Modular Avatar対応', tagCategoryId: featureCategory.id },
    { name: 'SDK3', tagCategoryId: featureCategory.id },
    { name: 'SDK2', tagCategoryId: featureCategory.id },
  ];

  for (const tagData of featureTags) {
    await prisma.tag.upsert({
      where: { name: tagData.name },
      update: {},
      create: { ...tagData, language: 'ja' },
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