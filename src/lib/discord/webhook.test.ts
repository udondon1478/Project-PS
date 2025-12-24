
import { sendDiscordNotification } from './webhook';
import { describe, it, expect, beforeEach, afterAll, vi, type Mock } from 'vitest';

// Mock fetch
global.fetch = vi.fn() as any;

describe('sendDiscordNotification', () => {
    const mockProduct = {
        id: '1',
        boothId: 123,
        title: 'Test Product',
        description: 'Test Desc',
        price: 1000,
        lowPrice: 1000,
        boothJpUrl: 'http://example.com',
        images: [],
        productTags: [],
        seller: { name: 'Seller' },
        uuid: 'uuid',
        isAdult: false,
        categoryId: 1,
        shopId: 'shop',
        startTime: new Date(),
        endTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        crawledAt: new Date(),
    };

    const originalWebhookUrl = process.env.DISCORD_WEBHOOK_URL;

    beforeEach(() => {
        (global.fetch as Mock).mockClear();
        process.env.DISCORD_WEBHOOK_URL = 'http://webhook';
    });
    
    afterAll(() => {
        process.env.DISCORD_WEBHOOK_URL = originalWebhookUrl;
    });

    it('should truncate a very long title correctly', async () => {
        const longTitle = 'a'.repeat(300);
        const product = { ...mockProduct, title: longTitle };
        
        await sendDiscordNotification(product as any);
        
        expect(global.fetch).toHaveBeenCalledTimes(1);
        const callArgs = (global.fetch as Mock).mock.calls[0];
        const payload = JSON.parse((callArgs as any)[1].body);
        
        const embed = payload.embeds[0];
        const title = embed.title;
        
        expect(title.length).toBeLessThanOrEqual(256);
        expect(title).toContain('New Product: ');
        expect(title.endsWith('...')).toBe(true);
        // "New Product: " is 13 chars. Title part should be 243 max.
        // It should be 13 + 240 + 3 = 256.
        expect(title.length).toBe(256);
    });

    it('should not truncate short title', async () => {
        const shortTitle = 'Short Title';
        const product = { ...mockProduct, title: shortTitle };
        
        await sendDiscordNotification(product as any);
        
        const payload = JSON.parse((global.fetch as Mock).mock.calls[0][1].body);
        expect(payload.embeds[0].title).toBe('New Product: Short Title');
    });

    it('should handle surrogate pairs safely', async () => {
        // Construct a string where the cutoff point splits a surrogate pair
        // 240 chars. Let's make the 240th char the high surrogate of a pair.
        // But cutoff is at 240. So if we have 239 chars + Pair (2 chars), total 241.
        // We truncate at 240. substring(0, 240) takes the first char of the pair (High).
        // Our logic should remove it.
        
        const prefix = 'a'.repeat(239);
        const pair = '𠮷'; // 2 chars (U+20BB7)
        const title = prefix + pair + 'suffix'; 
        // title length = 239 + 2 + 6 = 247.
        // Truncate to 240.
        // substring(0, 240) => 239 'a's + high surrogate of '𠮷'.
        // Logic should detect high surrogate at end and remove it.
        // Result: 239 'a's.
        
        const product = { ...mockProduct, title };
        await sendDiscordNotification(product as any);
        
        const payload = JSON.parse((global.fetch as Mock).mock.calls[0][1].body);
        const actualTitle = payload.embeds[0].title;
        // "New Product: " + 239 'a's + "..."
        // Length: 13 + 239 + 3 = 255.
        
        expect(actualTitle).toBe('New Product: ' + 'a'.repeat(239) + '...');
        expect(actualTitle.length).toBe(255);
    });
});
