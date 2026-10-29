import { describe, it, expect } from 'vitest';
import {
  DIFFICULTIES,
  getComboMultiplier,
  getTimeMultiplier,
  calcPairScore,
  formatTime,
  getDealAnimationTiming,
  canTriggerGameWin,
} from './MemoryGame';
import { selectPhotosForGame } from './selectPhotosForGame';
import type { AlbumForGame } from './selectPhotosForGame';

describe('canTriggerGameWin — Proteção contra vitória fantasma e pontuação máxima sem jogar', () => {
  it('impede vitória se o jogador não tiver feito a quantidade mínima de jogadas (moves < pairs * 2)', () => {
    // 6 pares = 12 cartas = mínimo 12 cliques
    expect(canTriggerGameWin(0, 6, 'playing')).toBe(false);
    expect(canTriggerGameWin(5, 6, 'playing')).toBe(false);
    expect(canTriggerGameWin(11, 6, 'playing')).toBe(false);
    expect(canTriggerGameWin(12, 6, 'playing')).toBe(true);
    expect(canTriggerGameWin(18, 6, 'playing')).toBe(true);
  });

  it('impede vitória em fases de transição mesmo se moves for alto (preview, gather, deal)', () => {
    expect(canTriggerGameWin(24, 6, 'preview')).toBe(false);
    expect(canTriggerGameWin(24, 6, 'gather')).toBe(false);
    expect(canTriggerGameWin(24, 6, 'deal')).toBe(false);
    expect(canTriggerGameWin(24, 6, 'playing')).toBe(true);
  });

  it('retorna false para configurações inválidas (pairs <= 0)', () => {
    expect(canTriggerGameWin(10, 0, 'playing')).toBe(false);
    expect(canTriggerGameWin(10, -2, 'playing')).toBe(false);
  });
});

describe('getDealAnimationTiming — Garante etapas fluidas e tempo completo de distribuição', () => {
  it('garante que a duração total calculada é superior ao término da última carta', () => {
    DIFFICULTIES.forEach((diff) => {
      const totalCards = diff.pairs * 2;
      const timing = getDealAnimationTiming(diff.pairs, totalCards);
      
      const lastCardStartTime = (totalCards - 1) * timing.staggerMs;
      const lastCardEndTime = lastCardStartTime + timing.animDurationMs;

      expect(timing.totalDealDuration).toBeGreaterThan(lastCardEndTime);
      // Deve ter pelo menos um buffer de segurança para transição imperceptível
      expect(timing.totalDealDuration - lastCardEndTime).toBeGreaterThanOrEqual(50);
    });
  });

  it('retorna tempos consistentes por nível de dificuldade', () => {
    const easy = getDealAnimationTiming(6, 12);
    const medium = getDealAnimationTiming(8, 16);
    const hard = getDealAnimationTiming(12, 24);

    expect(easy.staggerMs).toBe(32);
    expect(medium.staggerMs).toBe(26);
    expect(hard.staggerMs).toBe(22);

    expect(easy.totalDealDuration).toBeGreaterThan(600);
    expect(medium.totalDealDuration).toBeGreaterThan(700);
    expect(hard.totalDealDuration).toBeGreaterThan(800);
  });
});

describe('getComboMultiplier & calcPairScore — Cálculo de pontuação e combos', () => {
  it('retorna os multiplicadores de combo corretos', () => {
    expect(getComboMultiplier(0)).toBe(1.0);
    expect(getComboMultiplier(1)).toBe(1.0);
    expect(getComboMultiplier(2)).toBe(1.2);
    expect(getComboMultiplier(3)).toBe(1.5);
    expect(getComboMultiplier(4)).toBe(2.0);
    expect(getComboMultiplier(10)).toBe(2.0);
  });

  it('calcula pontuação proporcional da rodada com base na dificuldade', () => {
    const easy = DIFFICULTIES[0]; // base 100
    expect(calcPairScore(easy, 0)).toBe(100);
    expect(calcPairScore(easy, 2)).toBe(120); // 100 * 1.2
    expect(calcPairScore(easy, 3)).toBe(150); // 100 * 1.5
    expect(calcPairScore(easy, 4)).toBe(200); // 100 * 2.0
  });
});

describe('getTimeMultiplier & formatTime', () => {
  it('calcula bônus de tempo conforme os thresholds da dificuldade', () => {
    const medium = DIFFICULTIES[1]; // [[40, 2.0], [60, 1.6], [Infinity, 1.2]]
    expect(getTimeMultiplier(30, medium)).toBe(2.0);
    expect(getTimeMultiplier(40, medium)).toBe(2.0);
    expect(getTimeMultiplier(45, medium)).toBe(1.6);
    expect(getTimeMultiplier(60, medium)).toBe(1.6);
    expect(getTimeMultiplier(120, medium)).toBe(1.2);
  });

  it('formata o tempo em mm:ss de forma legível', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(9)).toBe('0:09');
    expect(formatTime(59)).toBe('0:59');
    expect(formatTime(60)).toBe('1:00');
    expect(formatTime(75)).toBe('1:15');
    expect(formatTime(360)).toBe('6:00');
  });
});

describe('selectPhotosForGame — Seleção e integridade de fotos', () => {
  const mockAlbums: AlbumForGame[] = [
    {
      id: 'album-1',
      photos: [
        { src: 'https://res.cloudinary.com/demo/image/upload/photo1.jpg', width: 800, height: 800 },
        { src: 'https://res.cloudinary.com/demo/image/upload/photo2.jpg', width: 900, height: 900 },
        { src: 'https://res.cloudinary.com/demo/image/upload/photo3.jpg', width: 1000, height: 1000 },
        { src: 'https://res.cloudinary.com/demo/image/upload/photo4.jpg', width: 800, height: 1000 },
      ],
    },
    {
      id: 'album-2',
      photos: [
        { src: 'https://res.cloudinary.com/demo/image/upload/photo5.jpg', width: 800, height: 800 },
        { src: 'https://res.cloudinary.com/demo/image/upload/photo6.jpg', width: 800, height: 800 },
      ],
    },
  ];

  it('retorna a quantidade solicitada de fotos', () => {
    const photos = selectPhotosForGame(mockAlbums, 4);
    expect(photos).toHaveLength(4);
  });

  it('evita duplicatas quando há fotos únicas suficientes', () => {
    const photos = selectPhotosForGame(mockAlbums, 6);
    const uniqueSrcs = new Set(photos.map((p) => p.src));
    expect(uniqueSrcs.size).toBe(6);
  });

  it('repete fotos caso o álbum tenha menos fotos que os pares solicitados', () => {
    const limitedAlbum: AlbumForGame[] = [
      {
        id: 'small',
        photos: [
          { src: 'img-1.jpg' },
          { src: 'img-2.jpg' },
        ],
      },
    ];
    const photos = selectPhotosForGame(limitedAlbum, 6);
    expect(photos).toHaveLength(6);
  });

  it('retorna array vazio quando nenhum álbum possui fotos válidas', () => {
    expect(selectPhotosForGame([], 6)).toEqual([]);
    expect(selectPhotosForGame([{ id: 'empty', photos: [] }], 6)).toEqual([]);
  });
});
