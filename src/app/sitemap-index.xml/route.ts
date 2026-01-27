import { prisma } from '@/lib/prisma';
import { BASE_URL } from '@/lib/constants';
import { UserStatus } from '@prisma/client';

const PRODUCTS_PER_SITEMAP = 5000;

export async function GET() {
  // 1. 商品数のカウント
  const productCount = await prisma.product.count().catch((error) => {
    console.error('Failed to count products for sitemap index:', error);
    return 0;
  });
  const productSitemapCount = Math.max(1, Math.ceil(productCount / PRODUCTS_PER_SITEMAP));

  // 2. ユーザー数のカウント
  const userCount = await prisma.user.count({
    where: { status: UserStatus.ACTIVE },
  }).catch((error) => {
    console.error('Failed to count users for sitemap index:', error);
    return 0;
  });
  const userSitemapCount = Math.ceil(userCount / PRODUCTS_PER_SITEMAP);

  const totalSitemaps = productSitemapCount + userSitemapCount;

  // 3. XMLの生成
  const sitemaps = Array.from({ length: totalSitemaps }, (_, i) => `${BASE_URL}/sitemap/${i}.xml`);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map(
  (url) => `  <sitemap>
    <loc>${url}</loc>
  </sitemap>`
).join('\n')}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
