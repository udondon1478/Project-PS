import cron from 'node-cron';
import { prisma } from '@/lib/prisma';
import { orchestrator } from '@/lib/booth-scraper/orchestrator';
import * as Sentry from '@sentry/nextjs';
import { STALE_RUN_THRESHOLD_MS, SYSTEM_USER_EMAIL, DEFAULT_BACKFILL_PAGES_PER_RUN, DEFAULT_BACKFILL_MAX_PRODUCTS, DEFAULT_REQUEST_INTERVAL_MS } from '@/lib/constants';

async function getSystemUserId(): Promise<string> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: SYSTEM_USER_EMAIL },
    });

    if (!user) {
      throw new Error(
        `System user (${SYSTEM_USER_EMAIL}) not found. ` +
        'Please run `npx prisma db seed` or the migration that upserts the system user.'
      );
    }

    return user.id;
  } catch (error) {
    console.error(
      `[getSystemUserId] Failed to retrieve system user. ` +
      `Run \`npx prisma db seed\` to create the system user.`,
      error
    );
    throw error;
  }
}

async function start() {
  console.log('Starting BOOTH Cron Scheduler...');

  const userId = await getSystemUserId();
  console.log(`Using User ID: ${userId} for scraping operations.`);

  // Throttle for scheduler disabled logs (log every 10 minutes)
  let lastDisabledLogTime = 0;
  const DISABLED_LOG_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

  // Main Scheduler Loop (Runs every minute)
  cron.schedule('* * * * *', async () => {
    try {
      // 1. Get Configuration
      const config = await prisma.scraperConfig.findFirst();
      
      if (!config) {
        console.log('[Cron] No ScraperConfig found. Skipping.');
        return;
      }

      if (!config.isSchedulerEnabled) {
        // Log disabled state every 10 minutes to avoid spam
        const now = Date.now();
        if (now - lastDisabledLogTime >= DISABLED_LOG_INTERVAL_MS) {
          console.log(`[Cron] ${new Date().toISOString()} - Scheduler disabled in DB.`);
          lastDisabledLogTime = now;
        }
        return;
      }

      // 2. Check Scraper Status (both in-memory and DB state for safety across restarts/processes)
      const status = orchestrator.getStatus();
      if (status && status.status === 'running') {
        console.log(`[Cron] Scraper is currently running in-memory (${status.mode}). Skipping trigger.`);
        return;
      }

      // Also check DB for RUNNING state (handles separate processes or restarts)
      let dbRunning = false;
      try {
        const activeRuns = await prisma.scraperRun.findMany({
          where: { status: 'RUNNING' },
        });

        // Auto-recover stale RUNNING records (older than threshold)
        const now = new Date();
        for (const run of activeRuns) {
          const runAge = now.getTime() - run.startTime.getTime();
          if (runAge > STALE_RUN_THRESHOLD_MS) {
            const ageMin = Math.floor(runAge / 1000 / 60);
            console.log(`[Cron] Recovering stale run: ${run.runId} (started ${run.startTime.toISOString()}, age: ${ageMin}min)`);
            await prisma.scraperRun.update({
              where: { id: run.id },
              data: {
                status: 'FAILED',
                endTime: now,
                errors: {
                  push: 'Auto-recovered: Run exceeded stale threshold'
                }
              },
            });

            // Log the recovery action
            await prisma.scraperLog.create({
              data: {
                runId: run.runId,
                message: `Auto-recovered: Run was stale (${ageMin}min old)`,
              },
            }).catch(() => {}); // Non-blocking
          } else {
            dbRunning = true; // Still have a valid running process
          }
        }
      } catch (err) {
        console.error('[Cron] Failed to check DB running state, conservatively assuming running:', err);
        dbRunning = true; // Conservative fallback
      }

      if (dbRunning) {
        console.log('[Cron] Scraper is currently running (DB state). Skipping trigger.');
        return;
      }

      // 3. Check Last Run for NEW Mode
      const lastNewRun = await prisma.scraperRun.findFirst({
        where: {
          metadata: {
            path: ['mode'],
            equals: 'NEW',
          },
        },
        orderBy: { startTime: 'desc' },
      });

      const now = new Date();
      const newRunIntervalMs = config.newScanIntervalMin * 60 * 1000;
      const timeSinceLastNewRun = lastNewRun ? now.getTime() - lastNewRun.startTime.getTime() : Infinity;

      if (timeSinceLastNewRun >= newRunIntervalMs) {
         console.log(`[Cron] Triggering New Product Scan (Last run: ${lastNewRun?.startTime.toISOString() ?? 'Never'}, Interval: ${config.newScanIntervalMin}m)`);
         try {
           console.log('Starting NEW product scan (Scheduled)');
           const runId = await orchestrator.start('NEW', userId, {
             pageLimit: config.newScanPageLimit, // Use configurable limit
             // rateLimitOverride: 1500, // Fixed rate limit for cron safety -> Now use config
             requestInterval: config.requestIntervalMs ?? DEFAULT_REQUEST_INTERVAL_MS, 
             searchParams: { useTargetTags: true }
           });
           console.log(`[Cron] New Product Scan started (RunID: ${runId})`);
           return; // Only start one task at a time
         } catch (e) {
           console.error('[Cron] Failed to start New Product Scan:', e);
           Sentry.captureException(e);
         }
      }

      // 4. Check Last Run for BACKFILL Mode
      // Only runs if NEW scan didn't just start
      
      const lastBackfillRun = await prisma.scraperRun.findFirst({
        where: {
          metadata: {
            path: ['mode'],
            equals: 'BACKFILL',
          },
        },
        orderBy: { startTime: 'desc' },
      });

      const backfillIntervalMs = config.backfillIntervalMin * 60 * 1000;
      const timeSinceLastBackfill = lastBackfillRun ? now.getTime() - lastBackfillRun.startTime.getTime() : Infinity;

      if (timeSinceLastBackfill >= backfillIntervalMs) {
         console.log(`[Cron] Triggering Backfill (Last run: ${lastBackfillRun?.startTime.toISOString() ?? 'Never'}, Interval: ${config.backfillIntervalMin}m)`);
         try {
           const runId = await orchestrator.start('BACKFILL', userId, {
             // Orchestrator keeps track of pagination
             searchParams: { useTargetTags: true },
             pagesPerRun: config.backfillPageCount ?? DEFAULT_BACKFILL_PAGES_PER_RUN,
             maxProducts: config.backfillProductLimit ?? DEFAULT_BACKFILL_MAX_PRODUCTS,
             requestInterval: config.requestIntervalMs ?? DEFAULT_REQUEST_INTERVAL_MS,
           });
           console.log(`[Cron] Backfill started (RunID: ${runId})`);
         } catch (e) {
           console.error('[Cron] Failed to start Backfill:', e);
           Sentry.captureException(e);
         }
      }

    } catch (error) {
      console.error('[Cron] Error in scheduler loop:', error);
      Sentry.captureException(error);
    }
  });

  console.log('BOOTH Cron Scheduler is now running (DB-Driven Mode).');
  
  // Graceful Shutdown
  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    
    // Stop orchestrator if running
    await orchestrator.stopAll();
    
    // Disconnect Prisma
    await prisma.$disconnect();
    
    console.log('Cleanup complete.');
  };

  process.on('SIGTERM', () => {
    shutdown('SIGTERM')
      .then(() => process.exit(0))
      .catch((err) => {
        console.error('Shutdown failed', err);
        process.exit(1);
      });
  });
  process.on('SIGINT', () => {
    shutdown('SIGINT')
      .then(() => process.exit(0))
      .catch((err) => {
        console.error('Shutdown failed', err);
        process.exit(1);
      });
  });
}

start().catch((e) => {
  console.error('Fatal error in cron scheduler:', e);
  Sentry.captureException(e);
  process.exit(1);
});
