import { describe, it, expect } from 'vitest';
import { shouldReloadTrack, isSameAudioUrl, describeMediaError } from './playerLogic';
import { extractVideoId, isYouTubeTrack } from './youtubePlayer';

describe('youtubePlayer: extractVideoId', () => {
  it('extrai ID de links padrão do YouTube', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('retorna o próprio ID se já for um ID de 11 caracteres', () => {
    expect(extractVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('retorna null para valores vazios ou inválidos', () => {
    expect(extractVideoId(undefined)).toBeNull();
    expect(extractVideoId('')).toBeNull();
    expect(extractVideoId('https://example.com/audio.mp3')).toBeNull();
  });
});

describe('youtubePlayer: isYouTubeTrack', () => {
  it('identifica faixa do YouTube por source, videoId ou url', () => {
    expect(isYouTubeTrack({ source: 'youtube', url: 'https://any.com' })).toBe(true);
    expect(isYouTubeTrack({ videoId: 'dQw4w9WgXcQ', url: '' })).toBe(true);
    expect(isYouTubeTrack({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })).toBe(true);
    expect(isYouTubeTrack({ url: 'https://youtu.be/dQw4w9WgXcQ' })).toBe(true);
  });

  it('retorna false para faixas MP3 normais ou nulas', () => {
    expect(isYouTubeTrack(null)).toBe(false);
    expect(isYouTubeTrack(undefined)).toBe(false);
    expect(isYouTubeTrack({ url: 'https://res.cloudinary.com/demo/video/song.mp3' })).toBe(false);
    expect(isYouTubeTrack({ source: 'upload', url: 'https://domain.com/song.mp3' })).toBe(false);
  });
});

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
