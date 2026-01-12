import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/booth-scraper/scrape/[runId]/skip
 * リモートプロセスで実行中のスクレイパーにスキップリクエストを送信
 * DBのskipRequestedフラグをtrueに設定し、cron側で検出して停止する
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
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

    // Set skipRequested flag
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
      message: 'Skip request sent. The task will stop on next iteration.',
    });
  } catch (error) {
    console.error('Error sending skip request:', error);
    return NextResponse.json(
      { error: 'Failed to send skip request' },
      { status: 500 }
    );
  }
}
