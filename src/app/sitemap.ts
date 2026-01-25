import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { BASE_URL } from '@/lib/constants';

const PRODUCTS_PER_SITEMAP = 5000;

export async function generateSitemaps() {
  const productCount = await prisma.product.count().catch((error) => {
    console.error('Failed to count products for sitemap:', error);
    return 0;
  });
  const sitemapCount = Math.max(1, Math.ceil(productCount / PRODUCTS_PER_SITEMAP));

  return Array.from({ length: sitemapCount }, (_, i) => ({ id: i }));
}

export default async function sitemap(params: {
  id: Promise<string>
}): Promise<MetadataRoute.Sitemap> {
  const id = await params.id;
  const parsedId = Number.parseInt(id, 10);
  const sitemapId =
    Number.isFinite(parsedId) && parsedId >= 0 ? Math.floor(parsedId) : 0;
  const skipCount = sitemapId * PRODUCTS_PER_SITEMAP;

  const now = new Date();
  // Static routes only in the first sitemap
  const staticRoutes = sitemapId === 0 ? ['', '/about', '/terms', '/privacy', '/search'].map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
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
}
