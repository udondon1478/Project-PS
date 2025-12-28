import { auth } from "@/auth";
import { orchestrator } from "@/lib/booth-scraper/orchestrator";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

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

    const runId = await orchestrator.start(mode, session.user.id, options);
    
    return NextResponse.json({ 
      success: true, 
      runId, 
      message: `Scraper started in ${mode} mode`,
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
  
  const status = orchestrator.getStatus();
  return NextResponse.json({ status });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return new NextResponse('Unauthorized: Admin access required', { status: 403 });
  }

  try {
    await orchestrator.stop();
    return NextResponse.json({ 
      success: true, 
      message: 'Scraper stop requested',
      status: orchestrator.getStatus() 
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to stop scraper';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
