import { describe, it, expect } from 'vitest';
import { parseFilename, stripUndefined, formatAudioTime, resolveMediaCoverUrl } from './playlistPureUtils';

describe('playlistUtils', () => {
  describe('parseFilename', () => {
    it('extrai artista e título quando há separador " - "', () => {
      const res = parseFilename('Ed Sheeran - Perfect.mp3');
      expect(res.parsedArtist).toBe('Ed Sheeran');
      expect(res.parsedTitle).toBe('Perfect');
    });

    it('mantém múltiplos hífens no título após o primeiro separador', () => {
      const res = parseFilename('Coldplay - Viva - La - Vida.mp3');
      expect(res.parsedArtist).toBe('Coldplay');
      expect(res.parsedTitle).toBe('Viva - La - Vida');
    });

    it('substitui hífens e underscores por espaços quando não há separador de artista', () => {
      const res = parseFilename('minha_musica-favorita.mp3');
      expect(res.parsedArtist).toBe('');
      expect(res.parsedTitle).toBe('minha musica favorita');
    });

    it('remove extensões variadas de arquivo de áudio', () => {
      expect(parseFilename('musica.wav').parsedTitle).toBe('musica');
      expect(parseFilename('musica.flac').parsedTitle).toBe('musica');
      expect(parseFilename('musica.m4a').parsedTitle).toBe('musica');
    });
  });

  describe('stripUndefined', () => {
    it('remove campos undefined mantendo null, 0, false e strings vazias', () => {
      const input = {
        title: 'Song',
        artist: undefined,
        count: 0,
        isActive: false,
        cover: null,
        desc: '',
      };
      const cleaned = stripUndefined(input);
      expect(cleaned).toEqual({
        title: 'Song',
        count: 0,
        isActive: false,
        cover: null,
        desc: '',
      });
      expect('artist' in cleaned).toBe(false);
    });
  });

  describe('formatAudioTime', () => {
    it('formata zero segundos como 0:00', () => {
      expect(formatAudioTime(0)).toBe('0:00');
    });

    it('formata segundos com zero à esquerda', () => {
      expect(formatAudioTime(5)).toBe('0:05');
      expect(formatAudioTime(65)).toBe('1:05');
    });

    it('formata minutos exatos e tempos longos', () => {
      expect(formatAudioTime(120)).toBe('2:00');
      expect(formatAudioTime(3600)).toBe('60:00');
    });
  });

  describe('resolveMediaCoverUrl', () => {
    it('retorna null quando o valor é nulo, indefinido ou vazio', () => {
      expect(resolveMediaCoverUrl(null)).toBeNull();
      expect(resolveMediaCoverUrl(undefined)).toBeNull();
      expect(resolveMediaCoverUrl('   ')).toBeNull();
    });

    it('retorna a URL original quando já é http ou https', () => {
      const url = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
      expect(resolveMediaCoverUrl(url)).toBe(url);
      const httpUrl = 'http://example.com/cover.png';
      expect(resolveMediaCoverUrl(httpUrl)).toBe(httpUrl);
    });

    it('retorna blob: ou data: inalterados', () => {
      const blob = 'blob:http://localhost:5173/uuid-1234';
      expect(resolveMediaCoverUrl(blob)).toBe(blob);
      const dataUri = 'data:image/jpeg;base64,...';
      expect(resolveMediaCoverUrl(dataUri)).toBe(dataUri);
    });

    it('transforma publicId avulso em URL segura do Cloudinary em vez de caminho relativo', () => {
      const res = resolveMediaCoverUrl('vox45ukrle194b7wyczaz', 'teste-cloud');
      expect(res).toBe('https://res.cloudinary.com/teste-cloud/image/upload/w_120,h_120,c_fill,q_auto,f_auto,fl_progressive/vox45ukrle194b7wyczaz');
    });
  });
});
