import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { ReportTargetType, Prisma } from '@prisma/client';
import { REPORT_ERROR_MESSAGES } from '@/lib/constants/messages';

const reportSchema = z.object({
  targetType: z.nativeEnum(ReportTargetType),
  targetId: z.string().min(1, "Target ID is required"),
  reason: z.string().min(1, "Reason is required").max(1000, "Reason must be 1000 characters or less"),
});

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: REPORT_ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    // Check for suspended user
    if (session.user.status === 'SUSPENDED') {
      return NextResponse.json({ error: REPORT_ERROR_MESSAGES.ACCOUNT_SUSPENDED }, { status: 403 });
    }

    const body = await req.json();
    const validation = reportSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten() }, { status: 400 });
    }

    const { targetType, targetId, reason } = validation.data;

    // Rate limiting: Max 5 reports per 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentReportsCount = await prisma.report.count({
      where: {
        reporterId: session.user.id,
        createdAt: { gt: tenMinutesAgo },
      },
    });

    if (recentReportsCount >= 5) {
      return NextResponse.json(
        { error: REPORT_ERROR_MESSAGES.TOO_MANY_REPORTS },
        { status: 429 }
      );
    }

    // Check for self-reporting
    if (targetType === 'PRODUCT') {
      const product = await prisma.product.findUnique({
        where: { id: targetId },
        select: { userId: true },
      });
      if (product && product.userId === session.user.id) {
        return NextResponse.json(
          { error: REPORT_ERROR_MESSAGES.OWN_PRODUCT },
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
          { error: REPORT_ERROR_MESSAGES.OWN_TAG },
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
      return NextResponse.json({ error: REPORT_ERROR_MESSAGES.INVALID_TARGET_TYPE }, { status: 400 });
    }

    const report = await prisma.report.create({
      data: reportData,
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error('Error creating report:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: REPORT_ERROR_MESSAGES.ALREADY_REPORTED },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: REPORT_ERROR_MESSAGES.INTERNAL_SERVER_ERROR }, { status: 500 });
  }
}
