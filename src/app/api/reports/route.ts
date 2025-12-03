import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { ReportTargetType, Prisma } from '@prisma/client';

const reportSchema = z.object({
  targetType: z.nativeEnum(ReportTargetType),
  targetId: z.string(),
  reason: z.string().min(1, "Reason is required"),
});

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = reportSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten() }, { status: 400 });
    }

    const { targetType, targetId, reason } = validation.data;

    // Check for self-reporting
    if (targetType === 'PRODUCT') {
      const product = await prisma.product.findUnique({
        where: { id: targetId },
        select: { userId: true },
      });
      if (product && product.userId === session.user.id) {
        return NextResponse.json(
          { error: '自分の商品は通報できません' },
          { status: 400 }
        );
      }
    } else if (targetType === 'PRODUCT_TAG') {
      const productTag = await prisma.productTag.findUnique({
        where: { id: targetId },
        select: { userId: true },
      });
      if (productTag && productTag.userId === session.user.id) {
        return NextResponse.json(
          { error: '自分が付けたタグは通報できません' },
          { status: 400 }
        );
      }
    }

    let reportData;
    const baseData = {
      reporterId: session.user.id,
      targetType,
      reason,
    };

    if (targetType === 'TAG') {
      reportData = { ...baseData, tagId: targetId };
    } else if (targetType === 'PRODUCT_TAG') {
      reportData = { ...baseData, productTagId: targetId };
    } else if (targetType === 'PRODUCT') {
      reportData = { ...baseData, productId: targetId };
    } else {
      return NextResponse.json({ error: 'Invalid target type' }, { status: 400 });
    }

    const report = await prisma.report.create({
      data: reportData,
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error('Error creating report:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'この対象は既に通報済みです' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
