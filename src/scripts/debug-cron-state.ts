
import { prisma } from '../lib/prisma';
import { orchestrator } from '../lib/booth-scraper/orchestrator';

const SYSTEM_USER_EMAIL = 'system-scraper@polyseek.com';

async function main() {
  console.log('--- Cron Debug Info ---');

  // 1. Check System User
  const user = await prisma.user.findUnique({ where: { email: SYSTEM_USER_EMAIL } });
  console.log(`System User (${SYSTEM_USER_EMAIL}):`, user ? `Found (${user.id})` : 'MISSING! (Run npx prisma db seed)');

  // 2. Check Config
  const config = await prisma.scraperConfig.findFirst();
  console.log('ScraperConfig:', config ? JSON.stringify(config, null, 2) : 'MISSING!');

  // 3. Check Tags
  const enabledTags = await prisma.scraperTargetTag.count({ where: { enabled: true } });
  console.log('Enabled Tags:', enabledTags);

  // 4. Check Last Runs
  const lastNewRun = await prisma.scraperRun.findFirst({
    where: { metadata: { path: ['mode'], equals: 'NEW' } },
    orderBy: { startTime: 'desc' }
  });
  console.log('Last NEW Run:', lastNewRun ? `${lastNewRun.startTime.toISOString()} (${lastNewRun.status})` : 'None');

  const lastBackfillRun = await prisma.scraperRun.findFirst({
    where: { metadata: { path: ['mode'], equals: 'BACKFILL' } },
    orderBy: { startTime: 'desc' }
  });
  console.log('Last BACKFILL Run:', lastBackfillRun ? `${lastBackfillRun.startTime.toISOString()} (${lastBackfillRun.status})` : 'None');

  // 5. Check Current Orchestrator Status (In this process - likely idle if separate from cron)
  console.log('Orchestrator Status (Local):', orchestrator.getStatus()?.status);

  // 6. Check Active Runs in DB
  const activeRuns = await prisma.scraperRun.findMany({ where: { status: 'RUNNING' } });
  console.log('Active Runs in DB:', activeRuns.length);
  activeRuns.forEach(r => console.log(` - ${r.runId} (${r.metadata}) started at ${r.startTime.toISOString()}`));

  // 7. Config Logic Check
  if (config) {
      const now = new Date();
      if (lastNewRun) {
          const diff = now.getTime() - lastNewRun.startTime.getTime();
          const threshold = config.newScanIntervalMin * 60 * 1000;
          console.log(`Time since last NEW run: ${Math.floor(diff/1000)}s`);
          console.log(`NEW Run Threshold: ${threshold/1000}s`);
          console.log(`Should start NEW? ${config.isSchedulerEnabled && diff >= threshold && activeRuns.length === 0}`);
      } else {
          console.log('Should start NEW? (First Run)', config.isSchedulerEnabled && activeRuns.length === 0);
      }
  }

  console.log('-----------------------');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
