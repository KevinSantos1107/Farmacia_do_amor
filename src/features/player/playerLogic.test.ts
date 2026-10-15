import { describe, it, expect } from 'vitest';
import { shouldReloadTrack } from './playerLogic';

describe('playerLogic: shouldReloadTrack', () => {
  it('mesma URL e hasSrc → não recarrega', () => {
    expect(shouldReloadTrack('https://example.com/song.mp3', 'https://example.com/song.mp3', true)).toBe(false);
  });

  it('URL diferente (mesmo índice, outra playlist) → recarrega', () => {
    expect(shouldReloadTrack('https://example.com/songA.mp3', 'https://example.com/songB.mp3', true)).toBe(true);
  });

  it('activeUrl === "" (falha anterior ou sem faixa) → recarrega', () => {
    expect(shouldReloadTrack('', 'https://example.com/song.mp3', true)).toBe(true);
    expect(shouldReloadTrack('', 'https://example.com/song.mp3', false)).toBe(true);
  });

  it('trackUrl indefinido → não recarrega', () => {
    expect(shouldReloadTrack('https://example.com/song.mp3', undefined, true)).toBe(false);
    expect(shouldReloadTrack('https://example.com/song.mp3', undefined, false)).toBe(false);
  });

  it('mesma URL mas hasSrc é falso → recarrega', () => {
    expect(shouldReloadTrack('https://example.com/song.mp3', 'https://example.com/song.mp3', false)).toBe(true);
  });
});
