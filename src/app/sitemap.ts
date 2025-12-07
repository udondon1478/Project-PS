import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma'; // Assumes prisma client is available here

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://polyseek.com'; // Adjust domain as needed

  // Static routes
  const routes = ['', '/about', '/terms', '/privacy', '/search'].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // Dynamic routes (Products)
  // Performance optimization: Limit to recent 1,000 products or implement pagination strategies for larger sites
  const products = await prisma.product.findMany({
    take: 1000,
    orderBy: { publishedAt: 'desc' },
    select: { id: true, updatedAt: true },
  }).catch((error) => {
    console.error('Failed to fetch products for sitemap:', error);
    return [];
  });

  const productRoutes = products.map((product) => ({
    url: `${baseUrl}/products/${product.id}`,
    lastModified: product.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [...routes, ...productRoutes];
}
