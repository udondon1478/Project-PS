import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { orchestrator } from './orchestrator';
import { prisma } from '@/lib/prisma';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    scraperRun: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('./http-client', () => ({
  boothHttpClient: {
    fetch: vi.fn(),
  },
}));

// Mock ListingCrawler to force an error for log generation
vi.mock('./listing-crawler', () => {
    return {
        ListingCrawler: vi.fn().mockImplementation(() => ({
            run: vi.fn().mockRejectedValue(new Error('Forced crawler error')),
        })),
    };
});

describe('Orchestrator Log Structure', () => {
    it('should create logs with unique IDs and timestamps', async () => {
        // Verify logs include unique IDs and timestamps by triggering a run
        const mockCreate = vi.mocked(prisma.scraperRun.create);
        const mockFindFirst = vi.mocked(prisma.scraperRun.findFirst);
        
        mockFindFirst.mockResolvedValue(null);
        mockCreate.mockResolvedValue({ runId: 'test-run', id: '1' } as any);
        
        // Start scraper
        try {
            // Use pageLimit: 1 and fast rate limit to ensure valid pages and quick logs
            await orchestrator.start('NEW', 'user-1', { pageLimit: 1, rateLimitOverride: 1 }); 
        } catch (e) {
            // ignore "already running" if rerunning tests
        }
        
        // Wait for background tasks (crawler/error handling) to emit more logs
        await new Promise(resolve => setTimeout(resolve, 100));

        const status = orchestrator.getStatus();
        expect(status).toBeDefined();
        if (status) {
             // Verify we have multiple logs to test uniqueness
             // e.g. "Starting crawl" and then "Error" or "Run finalized"
             expect(status.logs.length).toBeGreaterThanOrEqual(2);
             
             const logs = status.logs;
             const ids = logs.map(l => l.id);
             
             // Assert IDs are unique
             expect(new Set(ids).size).toBe(logs.length);

             // Verify structure of a log entry
             const log = logs[0];
             expect(log).toHaveProperty('id');
             expect(log).toHaveProperty('timestamp');
             expect(log).toHaveProperty('message');
             expect(typeof log.id).toBe('string');
             expect(typeof log.timestamp).toBe('string');
             expect(typeof log.message).toBe('string');
        }
        
        await orchestrator.stop();
    });
});
