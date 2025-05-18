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
 
  // 対象年齢タグの初期データ
  const ageRatingTags = [
    { name: '全年齢', type: 'age_rating', category: 'null', color: '#CCCCCC' },
    { name: 'R-15', type: 'age_rating', category: 'null', color: '#FF9900' },
    { name: 'R-18', type: 'age_rating', category: 'null', color: '#FF0000' },
    { name: 'NSFW', type: 'age_rating', category: 'null', color: '#660099' },
  ];
 
  for (const tagData of ageRatingTags) {
    await prisma.tag.upsert({
      where: { name: tagData.name },
      update: {},
      create: { ...tagData, language: 'ja' }, // languageフィールドを追加
    });
  }
 
  // カテゴリータグの初期データ
  const categoryTags = [
    { name: 'アバター', type: 'product_category', category: 'null', color: '#00CC99' },
    { name: '衣装', type: 'product_category', category: 'null', color: '#3399FF' },
    { name: 'アクセサリー', type: 'product_category', category: 'null', color: '#FFCC00' },
    { name: 'ホーム', type: 'product_category', category: 'null', color: '#9966CC' },
    { name: 'ワールド', type: 'product_category', category: 'null', color: '#66CC33' },
    { name: 'ツール', type: 'product_category', category: 'null', color: '#FF6600' },
    { name: 'その他', type: 'product_category', category: 'null', color: '#CCCCCC' },
  ];
 
  for (const tagData of categoryTags) {
    await prisma.tag.upsert({
      where: { name: tagData.name },
      update: {},
      create: { ...tagData, language: 'ja' }, // languageフィールドを追加
    });
  }
 
  // 主要機能タグの初期データ
  const featureTags = [
    { name: 'Quest対応', type: 'feature', category: 'null', color: '#33CCFF' },
    { name: 'PhysBone対応', type: 'feature', category: 'null', color: '#FF99CC' },
    { name: 'Modular Avatar対応', type: 'feature', category: 'null', color: '#99CCFF' },
    { name: 'SDK3', type: 'feature', category: 'null', color: '#66CCFF' },
    { name: 'SDK2', type: 'feature', category: 'null', color: '#0099CC' },
  ];
 
  for (const tagData of featureTags) {
    await prisma.tag.upsert({
      where: { name: tagData.name },
      update: {},
      create: { ...tagData, language: 'ja' }, // languageフィールドを追加
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