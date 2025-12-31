import { auth } from "@/auth";
import { orchestrator } from "@/lib/booth-scraper/orchestrator";
import { NextResponse } from "next/server";
import { Role, ScraperRunStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return new NextResponse('Unauthorized: Admin access required', { status: 403 });
  }

  try {
    const body = await req.json();
    const { mode, options } = body; // mode: 'NEW' | 'BACKFILL'

    if (!mode || !['NEW', 'BACKFILL'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode. Must be NEW or BACKFILL' }, { status: 400 });
    }

    // Now returns the IDs of enqueued items (or just the first one if single)
    const runId = await orchestrator.start(mode, session.user.id, options);
    
    return NextResponse.json({ 
      success: true, 
      runId, 
      message: `Scraper tasks enqueued in ${mode} mode`,
      status: orchestrator.getStatus() 
    });
  } catch (error: unknown) {
    console.error('Scraper Start Error:', typeof error === 'object' ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : String(error));
    
    const message = error instanceof Error ? error.message : 'Failed to start scraper';
    
    let status = 500;
    if (typeof error === 'object' && error !== null) {
      const err = error as Record<string, unknown>;
      if (typeof err.status === 'number') {
        status = err.status;
      } else if (typeof err.statusCode === 'number') {
        status = err.statusCode;
      }
    }

    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return new NextResponse('Unauthorized', { status: 403 });
  }
  
  // Returns status which now includes .queue and .currentTarget
  const status = orchestrator.getStatus();
  
  // DBからRUNNING状態のワーカーを取得（全プロセス共有）
  // Note: Since we only have one process usually, this should match what the orchestrator knows,
  // but good for checking if there are zombies or other instances.
  const runningFromDb = await prisma.scraperRun.findMany({
    where: { status: ScraperRunStatus.RUNNING },
    orderBy: { startTime: 'desc' },
  });
  
  return NextResponse.json({ status, runningFromDb });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return new NextResponse('Unauthorized: Admin access required', { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const runId = searchParams.get('runId'); // Legacy: Stop specific running Job
  const targetId = searchParams.get('targetId'); // New: Remove specific item from Queue
  const skipCurrent = searchParams.get('skipCurrent'); // New: Skip the currently running task

  try {
    if (skipCurrent === 'true') {
        await orchestrator.skipCurrent();
        return NextResponse.json({
            success: true,
            message: 'Skipped current task. Proceeding to next in queue.',
            status: orchestrator.getStatus()
        });
    }

    if (targetId) {
        orchestrator.removeFromQueue(targetId);
        return NextResponse.json({
            success: true,
            message: `Removed item ${targetId} from queue`,
            status: orchestrator.getStatus()
        });
    }

    if (runId) {
       // Stop Specific Run - Skip the current task if it matches
       const current = orchestrator.getStatus();
       if (current && current.runId === runId) {
         await orchestrator.skipCurrent();
       }
       
       // Update DB state to stopping
       await prisma.scraperRun.update({
         where: { runId },
         data: { status: ScraperRunStatus.STOPPING }
       });

       return NextResponse.json({
         success: true,
         message: `Stop signal sent to run ${runId}`,
       });
    }

    // No params = Stop Everything
    await orchestrator.stopAll();
    
    // Also mark DB runs as stopping for safety
    const updateResult = await prisma.scraperRun.updateMany({
        where: { status: ScraperRunStatus.RUNNING },
        data: { status: ScraperRunStatus.STOPPING }
    });
       
    return NextResponse.json({ 
        success: true, 
        message: `Global stop requested. Queue cleared. ${updateResult.count} jobs signalled.`,
        status: orchestrator.getStatus() 
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to stop scraper';
    
    let status = 500;
    if (typeof error === 'object' && error !== null) {
      const err = error as Record<string, unknown>;
      if (typeof err.status === 'number') {
        status = err.status;
      } else if (typeof err.statusCode === 'number') {
        status = err.statusCode;
      }
    }

    return NextResponse.json({ error: message }, { status });
  }
}
