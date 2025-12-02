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
        tag: {
          select: { name: true },
        },
        product: {
          select: { title: true },
        },
        productTag: {
          include: {
            tag: { select: { name: true } },
            product: { select: { title: true, id: true } },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 関連する名前を取得
    const reportsWithDetails = reports.map((report) => {
      let targetName = 'Unknown';
      let targetContext = '';
      let targetUrl = '';

      if (report.targetType === 'TAG' && report.tag) {
        targetName = report.tag.name;
        targetUrl = `/search?tags=${encodeURIComponent(report.tag.name)}`;
      } else if (report.targetType === 'PRODUCT' && report.product) {
        targetName = report.product.title;
        targetUrl = `/products/${report.productId}`;
      } else if (report.targetType === 'PRODUCT_TAG' && report.productTag) {
        targetName = report.productTag.tag.name;
        targetContext = report.productTag.product.title;
        targetUrl = `/products/${report.productTag.product.id}`;
      }

      return {
        ...report,
        targetName,
        targetContext,
        targetUrl
      };
    });

    return NextResponse.json(reportsWithDetails);
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
