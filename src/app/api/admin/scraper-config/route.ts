
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return new NextResponse('Unauthorized', { status: 403 });
  }

  try {
    // Get the first config or create default
    let config = await prisma.scraperConfig.findFirst();

    if (!config) {
        config = await prisma.scraperConfig.create({
            data: {
                isSchedulerEnabled: true,
                newScanIntervalMin: 10,
                backfillIntervalMin: 5,
            }
        });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to fetch scraper config:', error);
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return new NextResponse('Unauthorized', { status: 403 });
  }

  try {
    const body = await req.json();
    const { isSchedulerEnabled, newScanIntervalMin, newScanPageLimit, backfillIntervalMin } = body;

    // Validation
    if (newScanIntervalMin !== undefined && newScanIntervalMin < 1) {
        return NextResponse.json({ error: 'New scan interval must be at least 1 minute' }, { status: 400 });
    }
    if (backfillIntervalMin !== undefined && backfillIntervalMin < 1) {
        return NextResponse.json({ error: 'Backfill interval must be at least 1 minute' }, { status: 400 });
    }
    if (newScanPageLimit !== undefined && newScanPageLimit < 1) {
        return NextResponse.json({ error: 'New scan page limit must be at least 1' }, { status: 400 });
    }

    let config = await prisma.scraperConfig.findFirst();
    
    if (!config) {
        // Create if not exists
        config = await prisma.scraperConfig.create({
            data: {
                isSchedulerEnabled: isSchedulerEnabled ?? true,
                newScanIntervalMin: newScanIntervalMin ?? 10,
                newScanPageLimit: newScanPageLimit ?? 3,
                backfillIntervalMin: backfillIntervalMin ?? 5,
                lastUpdatedBy: session.user.id,
            }
        });
    } else {
        // Update
        config = await prisma.scraperConfig.update({
            where: { id: config.id },
            data: {
                isSchedulerEnabled: isSchedulerEnabled !== undefined ? isSchedulerEnabled : undefined,
                newScanIntervalMin: newScanIntervalMin !== undefined ? newScanIntervalMin : undefined,
                newScanPageLimit: newScanPageLimit !== undefined ? newScanPageLimit : undefined,
                backfillIntervalMin: backfillIntervalMin !== undefined ? backfillIntervalMin : undefined,
                lastUpdatedBy: session.user.id,
            }
        });
    }

    return NextResponse.json(config);

  } catch (error) {
    console.error('Failed to update scraper config:', error);
    // Return detailed error for debugging
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Failed to update config: ${msg}` }, { status: 500 });
  }
}
