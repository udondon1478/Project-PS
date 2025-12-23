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
  } catch (error: any) {
    console.error('Scraper Start Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to start scraper' }, { status: 500 }); // 500 or 400 depending on error, safe default
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return new NextResponse('Unauthorized', { status: 403 });
  }
  
  const status = orchestrator.getStatus();
  return NextResponse.json({ status });
}
