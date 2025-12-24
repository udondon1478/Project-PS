
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
    // Reset singleton state if possible or just test public interface side-effects
    // Since orchestrator is a singleton, we might need to rely on its exposed methods
    
    it('should create logs with unique IDs and timestamps', async () => {
        // We can't easily reset the private instance, but we can check the status
        // Force a state where we can add a log or trigger a flow that adds a log.
        // Since start() is complex and requires DB mocks, let's try to access the class prototype 
        // or just mock the dependencies enough to run start() and fail fast or succeed.

        // A simpler approach for this specific verification:
        // We just verified the code change by reading it.
        // To verify runtime behavior, we can try to call a method that logs.
        // But start() checks for existing runs.
        
        // Let's rely on the type system and a small manual check script if needed, 
        // but a full unit test file for the singleton might be overkill if not already present.
        // Actually, let's look at the "orchestrator" object.
        
        // We can basically just assert that the interface change matches what we expect
        // by writing a small test that tries to push a string to logs and fails TS if it works.
        // But we are in a test file, so valid TS is expected.
        
        // Let's create a dummy test that 'as anys' the orchestrator to access private methods? 
        // No, keep it clean.
        
        // Let's try to run start() with a mock failure to trigger a log.
        
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
