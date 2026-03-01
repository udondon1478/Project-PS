
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { STALE_RUN_THRESHOLD_MS, SCRAPER_CONFIG_SINGLETON_ID, MAX_INTERVAL_MIN, MAX_PAGE_LIMIT, MAX_REQUEST_INTERVAL_MS, DEFAULT_NEW_SCAN_INTERVAL_MIN, DEFAULT_BACKFILL_INTERVAL_MIN, DEFAULT_NEW_SCAN_PAGE_LIMIT, DEFAULT_BACKFILL_PAGES_PER_RUN, DEFAULT_BACKFILL_MAX_PRODUCTS, DEFAULT_REQUEST_INTERVAL_MS } from "@/lib/constants";

// Stale run threshold (must match booth-cron.ts)
// const STALE_RUN_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

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
        newScanIntervalMin: DEFAULT_NEW_SCAN_INTERVAL_MIN,
        backfillIntervalMin: DEFAULT_BACKFILL_INTERVAL_MIN,
      }
    });

    // Fetch scheduler status information
    const now = new Date();

    // Get last COMPLETED runs for NEW and BACKFILL modes
    const [lastNewRun, lastBackfillRun] = await Promise.all([
      prisma.scraperRun.findFirst({
        where: {
          metadata: { path: ['mode'], equals: 'NEW' },
          status: { not: 'RUNNING' }, // Only completed or failed runs
        },
        orderBy: { startTime: 'desc' },
        select: { startTime: true, endTime: true, status: true, productsCreated: true, productsFound: true },
      }),
      prisma.scraperRun.findFirst({
        where: {
          metadata: { path: ['mode'], equals: 'BACKFILL' },
          status: { not: 'RUNNING' }, // Only completed or failed runs
        },
        orderBy: { startTime: 'desc' },
        select: { startTime: true, endTime: true, status: true, productsCreated: true, productsFound: true },
      }),
    ]);

    // Get stale RUNNING records (potential stuck jobs)
    const runningRecords = await prisma.scraperRun.findMany({
      where: { status: 'RUNNING' },
      select: { id: true, runId: true, startTime: true },
    });

    const staleRuns = runningRecords.filter(
      r => now.getTime() - r.startTime.getTime() > STALE_RUN_THRESHOLD_MS
    );
    const activeRuns = runningRecords.filter(
      r => now.getTime() - r.startTime.getTime() <= STALE_RUN_THRESHOLD_MS
    );

    // Calculate next scheduled runs
    const newScanIntervalMs = config.newScanIntervalMin * 60 * 1000;
    const backfillIntervalMs = config.backfillIntervalMin * 60 * 1000;

    const nextNewScan = lastNewRun
      ? new Date(lastNewRun.startTime.getTime() + newScanIntervalMs)
      : now; // Would run immediately if never ran

    const nextBackfill = lastBackfillRun
      ? new Date(lastBackfillRun.startTime.getTime() + backfillIntervalMs)
      : now;

    // Build scheduler status object
    const schedulerStatus = {
      lastNewRun: lastNewRun ? {
        startTime: lastNewRun.startTime.toISOString(),
        endTime: lastNewRun.endTime?.toISOString() ?? null,
        status: lastNewRun.status,
        productsCreated: lastNewRun.productsCreated,
        productsFound: lastNewRun.productsFound,
      } : null,
      lastBackfillRun: lastBackfillRun ? {
        startTime: lastBackfillRun.startTime.toISOString(),
        endTime: lastBackfillRun.endTime?.toISOString() ?? null,
        status: lastBackfillRun.status,
        productsCreated: lastBackfillRun.productsCreated,
        productsFound: lastBackfillRun.productsFound,
      } : null,
      nextNewScanAt: nextNewScan.toISOString(),
      nextBackfillAt: nextBackfill.toISOString(),
      activeRunsCount: activeRuns.length,
      staleRunsCount: staleRuns.length,
      staleRuns: staleRuns.map(r => ({
        runId: r.runId,
        startTime: r.startTime.toISOString(),
        ageMinutes: Math.floor((now.getTime() - r.startTime.getTime()) / 1000 / 60),
      })),
    };

    return NextResponse.json({ ...config, schedulerStatus });
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
        requestIntervalMs,
        // AI Tagging settings
        enableAITagging,
        aiProvider,
        aiModel,
        aiMaxImagesPerProduct,
        aiDailyCostLimitYen,
        aiConfidenceThreshold,
        aiMaxImageSize,
        aiBackfillEnabled,
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

    // AI Tagging validation
    if (aiProvider !== undefined && !['gemini', 'anthropic'].includes(aiProvider)) {
        return NextResponse.json({ error: 'AI provider must be "gemini" or "anthropic"' }, { status: 400 });
    }
    if (aiMaxImagesPerProduct !== undefined && (aiMaxImagesPerProduct < 1 || aiMaxImagesPerProduct > 10)) {
        return NextResponse.json({ error: 'AI max images must be between 1 and 10' }, { status: 400 });
    }
    if (aiDailyCostLimitYen !== undefined && (aiDailyCostLimitYen < 0 || aiDailyCostLimitYen > 10000)) {
        return NextResponse.json({ error: 'AI daily cost limit must be between ¥0 and ¥10,000' }, { status: 400 });
    }
    if (aiConfidenceThreshold !== undefined && (aiConfidenceThreshold < 0 || aiConfidenceThreshold > 1)) {
        return NextResponse.json({ error: 'AI confidence threshold must be between 0.0 and 1.0' }, { status: 400 });
    }
    if (aiMaxImageSize !== undefined && (aiMaxImageSize < 128 || aiMaxImageSize > 2048)) {
        return NextResponse.json({ error: 'AI max image size must be between 128 and 2048 pixels' }, { status: 400 });
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
        // AI Tagging fields
        enableAITagging,
        aiProvider,
        aiModel,
        aiMaxImagesPerProduct,
        aiDailyCostLimitYen,
        aiConfidenceThreshold,
        aiMaxImageSize,
        aiBackfillEnabled,
        lastUpdatedBy: session.user.id,
      },
      create: {
        id: SCRAPER_CONFIG_SINGLETON_ID,
        isSchedulerEnabled: isSchedulerEnabled ?? true,
        newScanIntervalMin: newScanIntervalMin ?? DEFAULT_NEW_SCAN_INTERVAL_MIN,
        newScanPageLimit: newScanPageLimit ?? DEFAULT_NEW_SCAN_PAGE_LIMIT,
        backfillIntervalMin: backfillIntervalMin ?? DEFAULT_BACKFILL_INTERVAL_MIN,
        backfillPageCount: backfillPageCount ?? DEFAULT_BACKFILL_PAGES_PER_RUN,
        backfillProductLimit: backfillProductLimit ?? DEFAULT_BACKFILL_MAX_PRODUCTS,
        requestIntervalMs: requestIntervalMs ?? DEFAULT_REQUEST_INTERVAL_MS,
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

/**
 * POST: AI日次コストリセット
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return new NextResponse('Unauthorized', { status: 403 });
  }

  try {
    const body = await req.json();

    if (body.action === 'resetAICost') {
      const config = await prisma.scraperConfig.update({
        where: { id: SCRAPER_CONFIG_SINGLETON_ID },
        data: {
          aiTodayCostYen: 0,
          aiCostResetAt: new Date(),
          lastUpdatedBy: session.user.id,
        },
      });
      return NextResponse.json(config);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Failed to process scraper config action:', error);
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 });
  }
}
