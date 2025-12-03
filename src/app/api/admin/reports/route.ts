import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // バリデーション
    if (isNaN(page) || page < 1) {
      return NextResponse.json({ error: 'Invalid page parameter' }, { status: 400 });
    }
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json({ error: 'Invalid limit parameter' }, { status: 400 });
    }

    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        skip,
        take: limit,
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
      }),
      prisma.report.count(),
    ]);

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

    return NextResponse.json({
      reports: reportsWithDetails,
      metadata: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
