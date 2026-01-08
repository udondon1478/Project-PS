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
      // Test fallback to default gray if category not found (or mocked behavior)
      const style = getCategoryCardStyle('non-existent-category');
      expect(style.backgroundColor).toBe('rgba(107, 114, 128, 0.1)');
      expect(style.borderColor).toBe('#6B7280');
    });

    it('should return correct style for known category', () => {
       const style = getCategoryCardStyle('rating');
       // 'rating' usually maps to a specific color (e.g. #3498db). 
       // If implementation details change, update this test.
       expect(style.borderColor).toMatch(/^#[0-9a-fA-F]{3,6}$/);
       expect(style.backgroundColor).toMatch(/^rgba\(\d+, \d+, \d+, 0.1\)$/);
    });
  });
});
