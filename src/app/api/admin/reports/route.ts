import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();

    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reports = await prisma.report.findMany({
      include: {
        reporter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 関連する名前を取得
    const reportsWithDetails = await Promise.all(reports.map(async (report) => {
      let targetName = 'Unknown';
      let targetContext = '';
      let targetUrl = '';

      try {
        if (report.targetType === 'TAG') {
          const tag = await prisma.tag.findUnique({
            where: { id: report.targetId },
            select: { name: true }
          });
          if (tag) {
            targetName = tag.name;
            targetUrl = `/search?tags=${encodeURIComponent(tag.name)}`;
          }
        } else if (report.targetType === 'PRODUCT') {
          const product = await prisma.product.findUnique({
            where: { id: report.targetId },
            select: { title: true }
          });
          if (product) {
            targetName = product.title;
            targetUrl = `/products/${report.targetId}`;
          }
        } else if (report.targetType === 'PRODUCT_TAG') {
          const productTag = await prisma.productTag.findUnique({
            where: { id: report.targetId },
            include: {
              tag: { select: { name: true } },
              product: { select: { title: true, id: true } }
            }
          });
          if (productTag) {
            targetName = productTag.tag.name;
            targetContext = productTag.product.title;
            targetUrl = `/products/${productTag.product.id}`;
          }
        }
      } catch (e) {
        console.error(`Error fetching details for report ${report.id}:`, e);
      }

      return {
        ...report,
        targetName,
        targetContext,
        targetUrl
      };
    }));

    return NextResponse.json(reportsWithDetails);
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
