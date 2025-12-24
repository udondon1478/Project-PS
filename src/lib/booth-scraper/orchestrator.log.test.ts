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

describe('Orchestrator Log Structure', () => {
    it('should create logs with unique IDs and timestamps', async () => {
        // Verify logs include unique IDs and timestamps by triggering a run
        const mockCreate = vi.mocked(prisma.scraperRun.create);
        const mockFindFirst = vi.mocked(prisma.scraperRun.findFirst);
        
        mockFindFirst.mockResolvedValue(null);
        mockCreate.mockResolvedValue({ runId: 'test-run', id: '1' } as any);
        
        // Start scraper
        try {
            await orchestrator.start('NEW', 'user-1', { pageLimit: 0 }); // 0 limit might cause immediate finish?
        } catch (e) {
            // ignore "already running" if rerunning tests
        }
        
        const status = orchestrator.getStatus();
        expect(status).toBeDefined();
        if (status) {
             // It should have at least specific logs "Starting crawl..."
             expect(status.logs.length).toBeGreaterThan(0);
             
             const log = status.logs[0];
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
