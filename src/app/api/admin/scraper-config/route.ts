
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Fixed ID for singleton enforcement
const SCRAPER_CONFIG_SINGLETON_ID = 'scraper-config-singleton';

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
    // Singleton: always use fixed ID with upsert pattern
    const config = await prisma.scraperConfig.upsert({
      where: { id: SCRAPER_CONFIG_SINGLETON_ID },
      update: {}, // No updates on GET, just return existing
      create: {
        id: SCRAPER_CONFIG_SINGLETON_ID,
        isSchedulerEnabled: true,
        newScanIntervalMin: 10,
        backfillIntervalMin: 5,
      }
    });

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

    // Singleton: use upsert with fixed ID to ensure only one record exists
    const config = await prisma.scraperConfig.upsert({
      where: { id: SCRAPER_CONFIG_SINGLETON_ID },
      update: {
        isSchedulerEnabled,
        newScanIntervalMin,
        newScanPageLimit,
        backfillIntervalMin,
        backfillPageCount,
        backfillProductLimit,
        requestIntervalMs,
        lastUpdatedBy: session.user.id,
      },
      create: {
        id: SCRAPER_CONFIG_SINGLETON_ID,
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

    return NextResponse.json(config);

  } catch (error) {
    console.error('Failed to update scraper config:', error);
    // Return detailed error for debugging
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Failed to update config: ${msg}` }, { status: 500 });
  }
}
