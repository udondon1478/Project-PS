import { describe, it, expect } from 'vitest';
import { createBoothQueue } from './booth-queue';

describe('boothQueue', () => {
  it('should process tasks with the configured interval and concurrency', async () => {
    const boothQueue = createBoothQueue();
    const startTimes: number[] = [];
    const task = async () => {
      startTimes.push(Date.now());
      await new Promise((resolve) => setTimeout(resolve, 50)); // Short task
    };

    // Add 4 tasks. The first 3 should run immediately, the 4th should wait.
    const p1 = boothQueue.add(task);
    const p2 = boothQueue.add(task);
    const p3 = boothQueue.add(task);
    const p4 = boothQueue.add(task);

    await Promise.all([p1, p2, p3, p4]);

    expect(startTimes.length).toBe(4);

    // Sort times just in case
    startTimes.sort((a, b) => a - b);

    const t1 = startTimes[0];
    const t2 = startTimes[1];
    const t3 = startTimes[2];
    const t4 = startTimes[3];

    // t1, t2, t3 should be very close to each other (burst)
    // t4 should be approx 2000ms after t1
    
    console.log('Start times:', startTimes);

    // Expect first 3 requests to execute within a short window
    expect(t3 - t1).toBeLessThan(1000); 

    // Expect 4th request to be delayed by at least interval (2000ms) minus some buffer
    // The interval starts from the FIRST request in the window.
    expect(t4 - t1).toBeGreaterThanOrEqual(1900);
  }, 10000); 
});
