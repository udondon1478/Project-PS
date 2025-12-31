
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Maximum allowed values for configuration
const MAX_INTERVAL_MIN = 10080; // One week in minutes
const MAX_PAGE_LIMIT = 1000;
const MAX_REQUEST_INTERVAL_MS = 60000;

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
    const { 
        isSchedulerEnabled, 
        newScanIntervalMin, 
        newScanPageLimit, 
        backfillIntervalMin,
        backfillPageCount,
        backfillProductLimit,
        requestIntervalMs
    } = body;

    // Minimum validation
    if (newScanIntervalMin !== undefined && newScanIntervalMin < 1) {
        return NextResponse.json({ error: 'New scan interval must be at least 1 minute' }, { status: 400 });
    }
    if (backfillIntervalMin !== undefined && backfillIntervalMin < 1) {
        return NextResponse.json({ error: 'Backfill interval must be at least 1 minute' }, { status: 400 });
    }
    if (newScanPageLimit !== undefined && newScanPageLimit < 1) {
        return NextResponse.json({ error: 'New scan page limit must be at least 1' }, { status: 400 });
    }
    if (backfillPageCount !== undefined && backfillPageCount < 1) {
        return NextResponse.json({ error: 'Backfill page count must be at least 1' }, { status: 400 });
    }
    if (backfillProductLimit !== undefined && backfillProductLimit < 1) {
         return NextResponse.json({ error: 'Backfill product limit must be at least 1' }, { status: 400 });
    }
    if (requestIntervalMs !== undefined && requestIntervalMs < 500) {
         return NextResponse.json({ error: 'Request interval too short (min 500ms)' }, { status: 400 });
    }

    // Maximum validation
    if (newScanIntervalMin !== undefined && newScanIntervalMin > MAX_INTERVAL_MIN) {
        return NextResponse.json({ error: `New scan interval must be at most ${MAX_INTERVAL_MIN} minutes (1 week)` }, { status: 400 });
    }
    if (backfillIntervalMin !== undefined && backfillIntervalMin > MAX_INTERVAL_MIN) {
        return NextResponse.json({ error: `Backfill interval must be at most ${MAX_INTERVAL_MIN} minutes (1 week)` }, { status: 400 });
    }
    if (newScanPageLimit !== undefined && newScanPageLimit > MAX_PAGE_LIMIT) {
        return NextResponse.json({ error: `New scan page limit must be at most ${MAX_PAGE_LIMIT}` }, { status: 400 });
    }
    if (backfillPageCount !== undefined && backfillPageCount > MAX_PAGE_LIMIT) {
        return NextResponse.json({ error: `Backfill page count must be at most ${MAX_PAGE_LIMIT}` }, { status: 400 });
    }
    if (backfillProductLimit !== undefined && backfillProductLimit > MAX_PAGE_LIMIT) {
        return NextResponse.json({ error: `Backfill product limit must be at most ${MAX_PAGE_LIMIT}` }, { status: 400 });
    }
    if (requestIntervalMs !== undefined && requestIntervalMs > MAX_REQUEST_INTERVAL_MS) {
        return NextResponse.json({ error: `Request interval must be at most ${MAX_REQUEST_INTERVAL_MS}ms` }, { status: 400 });
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
                backfillPageCount: backfillPageCount ?? 3,
                backfillProductLimit: backfillProductLimit ?? 9,
                requestIntervalMs: requestIntervalMs ?? 5000,
                lastUpdatedBy: session.user.id,
            }
        });
    } else {
        // Update - pass fields directly, Prisma ignores undefined values
        config = await prisma.scraperConfig.update({
            where: { id: config.id },
            data: {
                isSchedulerEnabled,
                newScanIntervalMin,
                newScanPageLimit,
                backfillIntervalMin,
                backfillPageCount,
                backfillProductLimit,
                requestIntervalMs,
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
