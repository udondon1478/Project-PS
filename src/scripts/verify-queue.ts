import { orchestrator } from '../lib/booth-scraper/orchestrator';

/**
 * Custom error thrown when waitForStatus times out.
 */
class TimeoutError extends Error {
  public readonly lastStatus: ReturnType<typeof orchestrator.getStatus>;
  public readonly timeoutMs: number;

  constructor(lastStatus: ReturnType<typeof orchestrator.getStatus>, timeoutMs: number) {
    super(`waitForStatus timed out after ${timeoutMs}ms. Last status: ${JSON.stringify(lastStatus)}`);
    this.name = 'TimeoutError';
    this.lastStatus = lastStatus;
    this.timeoutMs = timeoutMs;
  }
}

// Helper to poll for status change. Throws TimeoutError if condition is not met.
async function waitForStatus(
  condition: (status: ReturnType<typeof orchestrator.getStatus>) => boolean,
  timeoutMs = 20000
): Promise<ReturnType<typeof orchestrator.getStatus>> {
  const start = Date.now();
  let lastStatus = orchestrator.getStatus();

  while (Date.now() - start < timeoutMs) {
    lastStatus = orchestrator.getStatus();
    if (condition(lastStatus)) return lastStatus;
    await new Promise(r => setTimeout(r, 500));
  }

  throw new TimeoutError(lastStatus, timeoutMs);
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

  try {
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
  } catch (e) {
    if (e instanceof TimeoutError) {
      console.error('Timeout waiting for status:', e.message);
      console.log('Last known status:', e.lastStatus);
    } else {
      throw e;
    }
  }

  // 6. Stop All
  console.log('Stopping all...');
  await orchestrator.stopAll();

  console.log('--- Verification Complete ---');
  process.exit(0);
})();
