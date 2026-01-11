import { createBoothQueue, addToBoothQueue } from './booth-queue';
import { setTimeout } from 'timers/promises';
import { describe, it, expect } from 'vitest';

describe('BoothQueue Pressure & Timeout', () => {
  it('should timeout tasks taking longer than configured limit', async () => {
    // Create queue with 100ms timeout
    const queue = createBoothQueue({ timeout: 100 });
    
    // Task taking 500ms
    const longRunningTask = async () => {
      await setTimeout(500);
      return 'done';
    };

    // Should throw
    await expect(addToBoothQueue(longRunningTask, queue)).rejects.toThrow();
  });

  it('should reject new tasks when queue is full', async () => {
    // Concurrency 1 -> 1 Active task
    // MAX_QUEUE_SIZE 10 -> 10 Waiting tasks
    const queue = createBoothQueue({ concurrency: 1 });
    
    // Task that hangs for a while to keep queue full
    const slowTask = async () => {
      await setTimeout(1000);
      return 'done';
    };

    // 1. Add Active Task (Pending: 1, Size: 0)
    queue.add(slowTask);
    
    // 2. Add 10 Waiting Tasks (Pending: 1, Size: 10)
    // We must NOT await here, otherwise we wait for each task to finish (sequential execution)
    // causing test timeout. We just want to fill the queue.
    const promises = [];
    for (let i = 0; i < 10; i++) {
        // catch error to avoid unhandled rejection if something goes wrong, though these should pass
        promises.push(addToBoothQueue(slowTask, queue).catch(() => {}));
    }

    // Wait a tiny bit to ensure p-queue processed the adds? 
    // p-queue add is synchronous regarding internal queue state update.

    expect(queue.size).toBe(10);
    expect(queue.pending).toBe(1);

    // 3. Add 12th task -> Should fail "Queue is full"
    // This call should be rejected immediately by our check, not by p-queue
    await expect(addToBoothQueue(slowTask, queue)).rejects.toThrow('Queue is full');
    
    // Cleanup: Clear queue to not hang tests and resolve pending tasks
    queue.clear();
    // We can allow remaining tasks to finish or just end test (vitest might complain about open handles)
  });
});
