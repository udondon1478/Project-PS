import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { BASE_URL } from '@/lib/constants';
import { UserStatus } from '@prisma/client';

const PRODUCTS_PER_SITEMAP = 5000;

export async function generateSitemaps() {
  const productCount = await prisma.product.count().catch((error) => {
    console.error('Failed to count products for sitemap:', error);
    return 0;
  });
  const sitemapCount = Math.max(1, Math.ceil(productCount / PRODUCTS_PER_SITEMAP));

  const userCount = await prisma.user.count({
    where: { status: UserStatus.ACTIVE },
  }).catch((error) => {
    console.error('Failed to count users for sitemap:', error);
    return 0;
  });
  const userSitemapCount = Math.ceil(userCount / PRODUCTS_PER_SITEMAP);

  return Array.from({ length: sitemapCount + userSitemapCount }, (_, i) => ({ id: i.toString() }));
}

export default async function sitemap(params: {
  id: Promise<string>
}): Promise<MetadataRoute.Sitemap> {
  const id = await params.id;
  const parsedId = Number.parseInt(id, 10);
  const sitemapId =
    Number.isFinite(parsedId) && parsedId >= 0 ? Math.floor(parsedId) : 0;

  const productCount = await prisma.product.count().catch((error) => {
    console.error('Failed to count products for sitemap:', error);
    return 0;
  });
  const productSitemapCount = Math.max(1, Math.ceil(productCount / PRODUCTS_PER_SITEMAP));

  if (sitemapId < productSitemapCount) {
    const skipCount = sitemapId * PRODUCTS_PER_SITEMAP;

    const now = new Date();
    // Static routes only in the first sitemap
    const lowPriorityRoutes = ['/faq', '/guidelines'];
    const staticRoutes = sitemapId === 0 ? ['', '/about', '/terms', '/privacy', '/search', '/faq', '/guidelines'].map((route) => ({
      url: `${BASE_URL}${route}`,
      lastModified: now,
      changeFrequency: (lowPriorityRoutes.includes(route) ? 'monthly' : 'daily') as 'monthly' | 'daily',
      priority: route === '' ? 1 : lowPriorityRoutes.includes(route) ? 0.7 : 0.8,
    })) : [];

    // Dynamic product routes with pagination
    const products = await prisma.product.findMany({
      skip: skipCount,
      take: PRODUCTS_PER_SITEMAP,
      orderBy: { publishedAt: 'desc' },
      select: { id: true, updatedAt: true },
    }).catch((error) => {
      console.error('Failed to fetch products for sitemap:', error);
      return [];
    });

    const productRoutes = products.map((product) => ({
      url: `${BASE_URL}/products/${product.id}`,
      lastModified: product.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

    return [...staticRoutes, ...productRoutes];
  } else {
    // User routes
    const userSitemapId = sitemapId - productSitemapCount;
    const skipCount = userSitemapId * PRODUCTS_PER_SITEMAP;

    const users = await prisma.user.findMany({
      where: { status: UserStatus.ACTIVE },
      skip: skipCount,
      take: PRODUCTS_PER_SITEMAP,
      orderBy: { createdAt: 'desc' },
      select: { id: true, updatedAt: true },
    }).catch((error) => {
      console.error('Failed to fetch users for sitemap:', error);
      return [];
    });

    const userRoutes = users.map((user) => ({
      url: `${BASE_URL}/users/${user.id}`,
      lastModified: user.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }));

    return userRoutes;
  }
}
