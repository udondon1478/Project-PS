import { PrismaClient, Role } from '@prisma/client'; // Roleをインポート

const prisma = new PrismaClient();

async function main() {
  // 既存のタグデータをクリア処理はコメントアウトまたは削除（管理画面から管理するため）
  // await prisma.tag.deleteMany();

  // 初期管理者ユーザーの追加 (テスト用)
  // TODO: 実際の運用では、安全な方法で管理者ユーザーを作成してください。
  if (process.env.SEED_ENV === 'test') {
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

    // テスト用の一般ユーザーを追加
    const testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {
        role: Role.USER,
      },
      create: {
        email: 'test@example.com',
        name: 'Test User',
        role: Role.USER,
      },
    });
    console.log(`Created/Updated test user with id: ${testUser.id}`);
  }

  // システムユーザー (スクレイパー用) の作成
  // cronやスクリプトで使用するため、環境に関わらず作成する
  const systemUser = await prisma.user.upsert({
    where: { email: 'system-scraper@polyseek.com' },
    update: {}, // 既存の場合は更新しない
    create: {
      email: 'system-scraper@polyseek.com',
      name: 'System Bot',
      role: Role.USER, // Changed to USER for security
    },
  });
  console.log(`Created/Updated system user with id: ${systemUser.id}`);

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
    { name: 'R-17', tagCategoryId: ageRatingCategory.id },
    { name: 'R-18', tagCategoryId: ageRatingCategory.id },
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
    { name: 'プロップ(小道具)', tagCategoryId: productCategory.id },
    { name: 'ワールド', tagCategoryId: productCategory.id },
    { name: 'ツール・ギミック', tagCategoryId: productCategory.id },
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
  ];

  for (const tagData of featureTags) {
    await prisma.tag.upsert({
      where: { name: tagData.name },
      update: {},
      create: { ...tagData, language: 'ja' },
    });
  }

  if (process.env.SEED_ENV === 'test') {
    // テスト用商品データの作成
    const testUser = await prisma.user.findUnique({ where: { email: 'test@example.com' } });
    if (!testUser) throw new Error('Test user not found');

    // 販売者の作成
    const seller = await prisma.seller.upsert({
      where: { sellerUrl: 'https://test-seller.booth.pm' },
      // update: {} のため、既存レコードがある場合は更新されません。
      // 将来的にテストデータを変更したい場合は、DBをリセットするか、ここを修正してください。
      update: {},
      create: {
        name: 'Test Seller',
        sellerUrl: 'https://test-seller.booth.pm',
      }
    });

    // 商品1: アバター
    const avatarTag = await prisma.tag.findUnique({ where: { name: 'アバター' } });
    const product1 = await prisma.product.upsert({
      where: { boothJpUrl: 'https://booth.pm/ja/items/111111' },
      // update: {} のため、既存レコードがある場合は更新されません。
      update: {},
      create: {
        title: 'Test Product 1',
        boothJpUrl: 'https://booth.pm/ja/items/111111',
        boothEnUrl: 'https://booth.pm/en/items/111111',
        lowPrice: 1000,
        highPrice: 1000,
        publishedAt: new Date(),
        userId: testUser.id,
        sellerId: seller.id,
        images: {
          create: { imageUrl: 'https://via.placeholder.com/150', isMain: true }
        }
      }
    });

    if (avatarTag) {
      await prisma.productTag.upsert({
        where: {
          productId_tagId_isOfficial: {
            productId: product1.id,
            tagId: avatarTag.id,
            isOfficial: false,
          }
        },
        // update: {} のため、既存レコードがある場合は更新されません。
        update: {},
        create: {
          productId: product1.id,
          tagId: avatarTag.id,
          userId: testUser.id,
          isOfficial: false,
        }
      });
    }

    // 商品2: 衣装
    const costumeTag = await prisma.tag.findUnique({ where: { name: '衣装' } });
    const product2 = await prisma.product.upsert({
      where: { boothJpUrl: 'https://booth.pm/ja/items/222222' },
      // update: {} のため、既存レコードがある場合は更新されません。
      update: {},
      create: {
        title: 'Test Product 2',
        boothJpUrl: 'https://booth.pm/ja/items/222222',
        boothEnUrl: 'https://booth.pm/en/items/222222',
        lowPrice: 2000,
        highPrice: 2000,
        publishedAt: new Date(),
        userId: testUser.id,
        sellerId: seller.id,
        images: {
          create: { imageUrl: 'https://via.placeholder.com/150', isMain: true }
        }
      }
    });

    if (costumeTag) {
      await prisma.productTag.upsert({
        where: {
          productId_tagId_isOfficial: {
            productId: product2.id,
            tagId: costumeTag.id,
            isOfficial: false,
          }
        },
        // update: {} のため、既存レコードがある場合は更新されません。
        update: {},
        create: {
          productId: product2.id,
          tagId: costumeTag.id,
          userId: testUser.id,
          isOfficial: false,
        }
      });
    }
    console.log('Test products created/updated');
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
