import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rateLimit } from './rate-limit';

describe('rateLimit', () => {
    beforeEach(() => {
        // テストごとに異なるユーザーIDを使用してキャッシュの衝突を回避
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should allow requests under the limit', async () => {
        const userId = 'user1';
        for (let i = 0; i < 5; i++) {
            const isLimited = await rateLimit(userId, 5, 60000);
            expect(isLimited).toBe(false);
        }
    });

    it('should block requests over the limit', async () => {
        const userId = 'user2';
        for (let i = 0; i < 5; i++) {
            await rateLimit(userId, 5, 60000);
        }
        const isLimited = await rateLimit(userId, 5, 60000);
        expect(isLimited).toBe(true);
    });

    it('should reset after the window passes', async () => {
        const userId = 'user3';
        for (let i = 0; i < 5; i++) {
            await rateLimit(userId, 5, 60000);
        }
        expect(await rateLimit(userId, 5, 60000)).toBe(true);

        // Advance time by 61 seconds
        vi.advanceTimersByTime(61000);

        expect(await rateLimit(userId, 5, 60000)).toBe(false);
    });
});
