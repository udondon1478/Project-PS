import { describe, it, expect } from 'vitest';
import { hexToRgb, getCategoryCardStyle } from '../categoryColors';

describe('categoryColors', () => {
  describe('hexToRgb', () => {
    it('should convert 6-digit hex codes correctly', () => {
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should convert 3-digit hex codes correctly', () => {
      expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should handle hex codes without hash', () => {
      expect(hexToRgb('ffffff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('fff')).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('should return null for invalid hex codes', () => {
      expect(hexToRgb('invalid')).toBeNull();
      expect(hexToRgb('#ffff')).toBeNull(); // 4 digits
      expect(hexToRgb('#ff')).toBeNull();   // 2 digits
    });
  });

  describe('getCategoryCardStyle', () => {
    it('should return correct style for valid color', () => {
      // Assuming 'character' category exists and has a valid color.
      // If it depends on external data that might change, we should mock getCategoryColor.
      // But for this unit test, let's test the fallback path by mocking the color return or using an invalid category if that returns a default.
      
      // We can test the fallback directly by mocking hexToRgb or passing a category that results in invalid color if possible.
      // However, getCategoryColor returns a default '#6B7280' if not found.
      // So let's test that fallback behavior is consistent if hexToRgb fails (e.g. if default color was somehow invalid, which it isn't).
      
      // Indirectly testing via hexToRgb is hard because getCategoryColor defaults to a valid gray.
      // But we can check if it returns the expected rgba for the default gray.
      // #6B7280 -> r:107, g:114, b:128
      const style = getCategoryCardStyle('non-existent-category');
      expect(style.backgroundColor).toBe('rgba(107, 114, 128, 0.1)');
      expect(style.borderColor).toBe('#6B7280');
    });

    // To test the "invalid RGB" path, we'd need to mock getCategoryColor to return an invalid string.
    // Since we import getCategoryColor from same module, mocking might be tricky without jest.mock / vi.mock.
    // Let's stick to testing the main paths.
  });
});
