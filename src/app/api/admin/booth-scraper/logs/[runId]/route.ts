import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Default number of log entries to fetch.
 * 200 provides a good balance between performance and visibility.
 */
const DEFAULT_LOG_FETCH_LIMIT = 200;
const MAX_LOG_FETCH_LIMIT = 1000;
const MIN_LOG_FETCH_LIMIT = 1;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return new NextResponse('Unauthorized: Admin access required', { status: 403 });
  }

  const { runId } = await params;

  // Parse optional limit query parameter
  const url = new URL(req.url);
  const limitParam = url.searchParams.get('limit');
  let limit = DEFAULT_LOG_FETCH_LIMIT;

  if (limitParam !== null) {
    const parsedLimit = parseInt(limitParam, 10);
    if (!isNaN(parsedLimit) && parsedLimit >= MIN_LOG_FETCH_LIMIT && parsedLimit <= MAX_LOG_FETCH_LIMIT) {
      limit = parsedLimit;
    }
  }

  try {
    const logs = await prisma.scraperLog.findMany({
      where: { runId: runId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Failed to fetch logs:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
