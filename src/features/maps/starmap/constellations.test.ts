import { describe, it, expect } from 'vitest';
import { normaliseConstellationName, lookupConstellation, PT_ALIASES } from './constellationAliases';

describe('constellationAliases', () => {
  describe('normaliseConstellationName', () => {
    it('normalizes accents and whitespace correctly', () => {
      expect(normaliseConstellationName('  Órion  ')).toBe('ORION');
      expect(normaliseConstellationName('Gêmeos')).toBe('GEMEOS');
      expect(normaliseConstellationName('Cão Maior')).toBe('CAO MAIOR');
      expect(normaliseConstellationName('Sagitário')).toBe('SAGITARIO');
    });

    it('removes punctuation and special characters', () => {
      expect(normaliseConstellationName('Crux!')).toBe('CRUX');
      expect(normaliseConstellationName('Ursa Maior#')).toBe('URSA MAIOR');
    });
  });

  describe('lookupConstellation', () => {
    it('finds constellation by Portuguese and English names', () => {
      const orionPt = lookupConstellation('Órion');
      const orionEn = lookupConstellation('Orion');
      expect(orionPt).toBeDefined();
      expect(orionPt).not.toBeNull();
      expect(orionPt).toEqual(orionEn);
      expect(orionPt?.stars.length).toBeGreaterThan(0);
      expect(orionPt?.lines.length).toBeGreaterThan(0);
    });

    it('finds Cruzeiro do Sul and aliases', () => {
      const crux = lookupConstellation('Cruzeiro do Sul');
      const cruxEn = lookupConstellation('Southern Cross');
      const cruxShort = lookupConstellation('Crux');
      expect(crux).toBeDefined();
      expect(crux).toEqual(cruxEn);
      expect(crux).toEqual(cruxShort);
    });

    it('returns null for unknown constellation names', () => {
      expect(lookupConstellation('ConstelacaoInexistente')).toBeNull();
      expect(lookupConstellation('')).toBeNull();
    });

    it('covers all PT_ALIASES keys pointing to valid database entries', () => {
      for (const [alias, dbKey] of Object.entries(PT_ALIASES)) {
        const shape = lookupConstellation(alias);
        expect(shape, `Alias ${alias} -> ${dbKey} should resolve to a valid shape`).not.toBeNull();
        expect(shape?.stars.length).toBeGreaterThan(0);
      }
    });
  });
});
