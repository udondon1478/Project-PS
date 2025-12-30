import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return new NextResponse('Unauthorized: Admin access required', { status: 403 });
  }

  const { runId } = await params;

  try {
    // @ts-ignore
    const logs = await prisma.scraperLog.findMany({
      where: { runId },
      orderBy: { createdAt: 'desc' }, // Newest first
      take: 200, // Limit to 200 recent logs
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Failed to fetch logs:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
