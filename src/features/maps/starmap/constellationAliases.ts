import type { ConstellationShape } from './types';
import { CONSTELLATION_DB } from './constellationData';

// ─────────────────────────────────────────────
//  Normalise a name from Admin → DB key
//  Handles Portuguese, English, accented
// ─────────────────────────────────────────────
export function normaliseConstellationName(name: string): string {
  return name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^A-Z0-9 ]/g, '')
    .trim();
}

// Portuguese → DB key aliases
export const PT_ALIASES: Record<string, string> = {
  'ORIAO': 'ORION',
  'ORION': 'ORION',
  'TOURO': 'TAURUS',
  'TAURUS': 'TAURUS',
  'GEMEOS': 'GEMINI',
  'GEMINI': 'GEMINI',
  'CAO MAIOR': 'CAO MAIOR',
  'CANIS MAJOR': 'CAO MAIOR',
  'CAO MENOR': 'CAO MENOR',
  'CANIS MINOR': 'CAO MENOR',
  'LEAO': 'LEO',
  'LEO': 'LEO',
  'VIRGEM': 'VIRGO',
  'VIRGO': 'VIRGO',
  'ESCORPIAO': 'ESCORPIAO',
  'SCORPIUS': 'ESCORPIAO',
  'ESCORPIO': 'ESCORPIAO',
  'CANCER': 'CANCER',
  'AQUARIO': 'AQUARIUS',
  'AQUARIUS': 'AQUARIUS',
  'PEIXES': 'PISCES',
  'PISCES': 'PISCES',
  'ARIES': 'ARIES',
  'CARNEIRO': 'ARIES',
  'SAGITARIO': 'SAGITTARIUS',
  'SAGITTARIUS': 'SAGITTARIUS',
  'CAPRICORNIO': 'CAPRICORNUS',
  'CAPRICORNUS': 'CAPRICORNUS',
  'CASSIOPEIA': 'CASSIOPEIA',
  'URSA MAIOR': 'URSA MAIOR',
  'URSA MAJOR': 'URSA MAIOR',
  'URSA MENOR': 'URSA MENOR',
  'URSA MINOR': 'URSA MENOR',
  'CRUX': 'CRUX',
  'CRUZEIRO DO SUL': 'CRUX',
  'SOUTHERN CROSS': 'CRUX',
  'HERCULES': 'HERCULES',
  'LIRA': 'LYRA',
  'LYRA': 'LYRA',
  'CISNE': 'CYGNUS',
  'CYGNUS': 'CYGNUS',
  'LEBRE': 'LEPUS',
  'ANDROMEDA': 'ANDROMEDA',
  'PERSEU': 'PERSEUS',
  'PERSEUS': 'PERSEUS',
  'AGUIA': 'AGUIA',
  'AQUILA': 'AGUIA',
};

export function lookupConstellation(name: string): ConstellationShape | null {
  const key = PT_ALIASES[normaliseConstellationName(name)];
  return key ? CONSTELLATION_DB[key] ?? null : null;
}
