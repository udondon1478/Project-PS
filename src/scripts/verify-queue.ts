

import { orchestrator } from '../lib/booth-scraper/orchestrator';

// Remove the manual instantiation since we are importing the singleton
// const orchestrator = BoothScraperOrchestrator.getInstance();

// Mock console to keep output clean(er)
const originalLog = console.log;


// Helper to poll for status change
async function waitForStatus(condition: (status: any) => boolean, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = orchestrator.getStatus();
    if (condition(status)) return status;
    await new Promise(r => setTimeout(r, 500));
  }
  return orchestrator.getStatus();
}

(async () => {
  console.log('--- Starting Queue Verification ---');

  // 1. Enqueue Task A
  console.log('Enqueueing Task A (Manual)...');
  await orchestrator.start('NEW', 'test-user', {
    searchParams: { query: 'QueueTestA' }
  });

  // 2. Enqueue Task B
  console.log('Enqueueing Task B (Manual)...');
  await orchestrator.start('NEW', 'test-user', {
    searchParams: { query: 'QueueTestB' }
  });

  // 3. Check Queue
  let status = orchestrator.getStatus();
  console.log('Queue Length (Should be 2 or 1 if A started):', status?.queue.length);
  console.log('Current Target:', status?.currentTarget?.targetName);

  if (status?.currentTarget?.targetName !== 'QueueTestA') {
      console.log('Waiting for A to start...');
      status = await waitForStatus(s => s?.currentTarget?.targetName === 'QueueTestA');
      console.log('Current Target (After wait):', status?.currentTarget?.targetName);
  }

  // 4. Skip Current (A)
  console.log('Skipping current task...');
  await orchestrator.skipCurrent();

  // 5. Wait for transition to B
  console.log('Waiting for Task B to start...');
  status = await waitForStatus(s => s?.currentTarget?.targetName === 'QueueTestB');
  console.log('After Skip - Current Target (Should be QueueTestB):', status?.currentTarget?.targetName);

  // 6. Stop All
  console.log('Stopping all...');
  await orchestrator.stopAll();

  console.log('--- Verification Complete ---');
  process.exit(0);
})();
