import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { orchestrator } from "@/lib/booth-scraper/orchestrator";

/**
 * POST /api/admin/booth-scraper/scrape/[runId]/skip
 * リモートプロセスで実行中のスクレイパーにスキップリクエストを送信
 * DBのskipRequestedフラグをtrueに設定し、cron側で検出して停止する
 *
 * ローカルプロセスで実行中の場合は、直接orchestratorを操作して即時停止させる
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return new NextResponse('Unauthorized', { status: 403 });
  }

  try {
    const { runId } = await params;

    if (!runId) {
      return NextResponse.json({ error: 'runId is required' }, { status: 400 });
    }

    // Check if the run exists and is currently running
    const run = await prisma.scraperRun.findUnique({
      where: { runId },
    });

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    if (run.status !== 'RUNNING') {
      return NextResponse.json(
        { error: `Run is not running (status: ${run.status})` },
        { status: 400 }
      );
    }

    // OPTIMIZATION: If the task is running locally in this process, skip it immediately
    const currentStatus = orchestrator.getStatus();
    if (currentStatus && currentStatus.runId === runId) {
        console.log(`[API] Skipping local task ${runId} immediately`);
        await orchestrator.skipCurrent();
    }

    // Set skipRequested flag (works for both remote and ensures local state is persisted)
    await prisma.scraperRun.update({
      where: { runId },
      data: { skipRequested: true },
    });

    // Log the skip request
    await prisma.scraperLog.create({
      data: {
        runId,
        message: 'Skip requested from dashboard UI',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Skip request sent. The task will stop shortly.',
    });
  } catch (error) {
    console.error('Error sending skip request:', error);
    return NextResponse.json(
      { error: 'Failed to send skip request' },
      { status: 500 }
    );
  }
}
