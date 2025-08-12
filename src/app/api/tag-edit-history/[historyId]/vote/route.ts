import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth'; // authをインポート

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ historyId: string }> }
) {
  const session = await auth(); // セッション情報を取得

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { historyId } = await context.params;
  const { score } = await req.json(); // { score: 1 } or { score: -1 } を期待

  if (!historyId || (score !== 1 && score !== -1)) {
    return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 既存の評価があるか確認
      const existingVote = await tx.tagEditVote.findUnique({
        where: {
          historyId_userId: {
            historyId: historyId,
            userId: session.user.id!,
          },
        },
      });

      if (existingVote) {
        // 既に評価済みの場合、評価を更新
        await tx.tagEditVote.update({
          where: { id: existingVote.id },
          data: { score: score },
        });

        // TagEditHistoryのスコアを更新
        await tx.tagEditHistory.update({
          where: { id: historyId },
          data: {
            score: {
              increment: score - existingVote.score, // 差分を更新
            },
          },
        });
      } else {
        // 新規評価の場合
        await tx.tagEditVote.create({
          data: {
            historyId: historyId,
            userId: session.user.id!,
            score: score,
          },
        });

        // TagEditHistoryのスコアを更新
        await tx.tagEditHistory.update({
          where: { id: historyId },
          data: {
            score: {
              increment: score, // 新規スコアを加算
            },
          },
        });
      }
    });

    return NextResponse.json({ message: 'Vote recorded successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error recording vote:', error);
    return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 });
  }
}