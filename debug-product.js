const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRecentProduct() {
  try {
    const product = await prisma.product.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        productTags: {
          include: {
            tag: true
          }
        }
      }
    });

    if (!product) {
      console.log('No products found.');
      return;
    }

    console.log('--- Recent Product ---');
    console.log('ID:', product.id);
    console.log('Title:', product.title);
    console.log('Description:', product.description);
    console.log('Tags:', product.productTags.map(pt => pt.tag.name));
    console.log('----------------------');

    // Check existing AvatarItem
    const avatarItems = await prisma.avatarItem.findMany();
    console.log('--- Avatar Items ---');
    console.log(avatarItems);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentProduct();
