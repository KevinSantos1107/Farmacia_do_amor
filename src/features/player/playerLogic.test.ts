import { describe, it, expect } from 'vitest';
import { shouldReloadTrack, isSameAudioUrl, describeMediaError } from './playerLogic';

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

describe('playerLogic: isSameAudioUrl', () => {
  it('strings idênticas → true', () => {
    expect(isSameAudioUrl('https://x.com/a.mp3', 'https://x.com/a.mp3')).toBe(true);
  });

  it('URL crua com espaço/acento vs. versão codificada pelo navegador → true', () => {
    const raw = 'https://res.cloudinary.com/demo/video/upload/Minha Música.mp3';
    const encoded = new URL(raw).href; // é o que audio.src devolve
    expect(encoded).not.toBe(raw);
    expect(isSameAudioUrl(encoded, raw)).toBe(true);
  });

  it('URLs diferentes → false', () => {
    expect(isSameAudioUrl('https://x.com/a.mp3', 'https://x.com/b.mp3')).toBe(false);
  });

  it('vazio/indefinido → false', () => {
    expect(isSameAudioUrl('', 'https://x.com/a.mp3')).toBe(false);
    expect(isSameAudioUrl(undefined, 'https://x.com/a.mp3')).toBe(false);
    expect(isSameAudioUrl('https://x.com/a.mp3', null)).toBe(false);
  });
});

describe('playerLogic: describeMediaError', () => {
  it('mapeia códigos conhecidos e usa fallback', () => {
    expect(describeMediaError(2)).toMatch(/rede/i);
    expect(describeMediaError(4)).toMatch(/formato|indispon/i);
    expect(describeMediaError(undefined)).toMatch(/erro/i);
  });
});
