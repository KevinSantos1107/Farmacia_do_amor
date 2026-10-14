import { describe, it, expect } from 'vitest';
import { bezier3, rectIntersect, formatStarMapDate, formatCoordinates } from './starMapMath';

describe('starMapMath', () => {
  describe('bezier3', () => {
    it('returns p0 when t = 0', () => {
      expect(bezier3(0, 10, 50, 100)).toBe(10);
    });

    it('returns p2 when t = 1', () => {
      expect(bezier3(1, 10, 50, 100)).toBe(100);
    });

    it('calculates quadratic bezier midpoint correctly', () => {
      // For p0=0, p1=100, p2=0 at t=0.5:
      // (1 - 0.5)^2 * 0 + 2 * (0.5) * (0.5) * 100 + 0.5^2 * 0 = 0.5 * 100 = 50
      expect(bezier3(0.5, 0, 100, 0)).toBe(50);
    });
  });

  describe('rectIntersect', () => {
    it('detects overlapping rectangles', () => {
      // r1: (0, 0, 100, 100)
      // r2: (50, 50, 100, 100) -> overlaps
      expect(rectIntersect(0, 0, 100, 100, 50, 50, 100, 100)).toBe(true);
    });

    it('detects non-overlapping rectangles horizontally and vertically', () => {
      // r1: (0, 0, 50, 50), r2 far right: (100, 0, 50, 50)
      expect(rectIntersect(0, 0, 50, 50, 100, 0, 50, 50)).toBe(false);
      // r2 far below: (0, 100, 50, 50)
      expect(rectIntersect(0, 0, 50, 50, 0, 100, 50, 50)).toBe(false);
    });

    it('considers touching edges as overlapping', () => {
      // r1 ends at x=50, r2 starts at x=50
      expect(rectIntersect(0, 0, 50, 50, 50, 0, 50, 50)).toBe(true);
    });
  });

  describe('formatStarMapDate', () => {
    it('formats YYYY-MM-DD into DD · MM · YYYY', () => {
      expect(formatStarMapDate('2025-10-27')).toBe('27 · 10 · 2025');
    });

    it('returns empty string if input is empty or undefined', () => {
      expect(formatStarMapDate('')).toBe('');
      expect(formatStarMapDate(undefined)).toBe('');
    });

    it('returns raw string if not containing dashes', () => {
      expect(formatStarMapDate('27/10/2025')).toBe('27/10/2025');
    });
  });

  describe('formatCoordinates', () => {
    it('formats southern and western coordinates', () => {
      const formatted = formatCoordinates(-23.5505, -46.6333);
      expect(formatted).toBe('23.5505° S  46.6333° W');
    });

    it('formats northern and eastern coordinates', () => {
      const formatted = formatCoordinates(40.7128, 74.006);
      expect(formatted).toBe('40.7128° N  74.0060° E');
    });

    it('returns empty string when lat or lng is missing/zero', () => {
      expect(formatCoordinates(undefined, undefined)).toBe('');
      expect(formatCoordinates(0, 0)).toBe('');
      expect(formatCoordinates(0, -46.6333)).toBe('');
    });
  });
});
