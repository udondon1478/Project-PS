import cron from 'node-cron';
import { prisma } from '@/lib/prisma';
import { orchestrator } from '@/lib/booth-scraper/orchestrator';
import * as Sentry from '@sentry/nextjs';

const SYSTEM_USER_EMAIL = 'system-scraper@polyseek.com';

async function getSystemUserId(): Promise<string> {
  let user = await prisma.user.findFirst({
    where: { email: SYSTEM_USER_EMAIL },
  });

  if (!user) {
    console.log(`System user not found. Creating ${SYSTEM_USER_EMAIL}...`);
    // Create a system user if not exists
    // Note: In production, you might want to ensure this user exists via migration or seed
    try {
        user = await prisma.user.create({
        data: {
            email: SYSTEM_USER_EMAIL,
            name: 'System Scraper',
            role: 'ADMIN', // Or a specific role if available
            isSafeSearchEnabled: true,
        },
        });
    } catch (e) {
        // Handle race condition or other errors
        console.error('Failed to create system user, trying to find existing admin...', e);
        const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        if (admin) return admin.id;
        throw new Error('No system user or admin user found for scraper execution.');
    }
  }
  return user.id;
}

async function start() {
  console.log('Starting BOOTH Cron Scheduler...');

  const userId = await getSystemUserId();
  console.log(`Using User ID: ${userId} for scraping operations.`);

  // Job 1: New Scans (Every 10 minutes)
  // "Novelty Scan": Check initial pages for new items
  cron.schedule('*/10 * * * *', async () => {
    console.log('[Cron] Triggering New Product Scan...');
    const status = orchestrator.getStatus();
    if (status && status.status === 'running') {
      console.log('[Cron] Scraper is already running. Skipping New Scan.');
      return;
    }

    try {
      const runId = await orchestrator.start('NEW', userId, {
        pageLimit: 3, // Check first 3 pages
      });
      console.log(`[Cron] New Product Scan started (RunID: ${runId})`);
    } catch (error) {
      console.error('[Cron] Failed to start New Product Scan:', error);
      Sentry.captureException(error);
    }
  });

  // Job 2: Backfill (Every 5 minutes)
  // "Backfill": Go deeper or update older items
  cron.schedule('*/5 * * * *', async () => {
    console.log('[Cron] Triggering Backfill...');
    const status = orchestrator.getStatus();
    if (status && status.status === 'running') {
      console.log('[Cron] Scraper is already running. Skipping Backfill.');
      return;
    }

    try {
      const runId = await orchestrator.start('BACKFILL', userId, {
        // Orchestrator handles resume logic based on DB
        // Orchestrator handles rate limiting (e.g. 9 items or similar limits) internally if implemented,
        // or we pass options here.
        // The requirement said "9 products/run". Orchestrator seems to handle this via hardcoded check or we can pass it via options if supported.
        // Current Orchestrator implementation has logic: "if (isBackfill) ... if (processedCount >= 9) ... stop"
        // So no extra options needed here for identifying the limit, but we rely on Orchestrator's internal logic.
      });
      console.log(`[Cron] Backfill started (RunID: ${runId})`);
    } catch (error) {
      console.error('[Cron] Failed to start Backfill:', error);
      Sentry.captureException(error);
    }
  });

  console.log('BOOTH Cron Scheduler is now running.');
  
  // Graceful Shutdown
  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    
    // Stop orchestrator if running
    await orchestrator.stop();
    
    // Disconnect Prisma
    await prisma.$disconnect();
    
    console.log('Cleanup complete. Exiting.');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((e) => {
  console.error('Fatal error in cron scheduler:', e);
  Sentry.captureException(e);
  process.exit(1);
});
