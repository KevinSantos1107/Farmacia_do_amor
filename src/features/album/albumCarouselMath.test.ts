import { describe, it, expect } from 'vitest';
import { circularIndex, circularDistance, getCardStyle } from './albumCarouselMath';

describe('AlbumCarousel - circularIndex', () => {
  it('normaliza índices dentro dos limites [0, total)', () => {
    expect(circularIndex(0, 3)).toBe(0);
    expect(circularIndex(1, 3)).toBe(1);
    expect(circularIndex(2, 3)).toBe(2);
  });

  it('normaliza índices positivos que ultrapassam o total', () => {
    expect(circularIndex(3, 3)).toBe(0);
    expect(circularIndex(4, 3)).toBe(1);
    expect(circularIndex(7, 3)).toBe(1);
  });

  it('normaliza índices negativos corretamente', () => {
    expect(circularIndex(-1, 3)).toBe(2);
    expect(circularIndex(-2, 3)).toBe(1);
    expect(circularIndex(-3, 3)).toBe(0);
    expect(circularIndex(-4, 3)).toBe(2);
  });
});

describe('AlbumCarousel - circularDistance', () => {
  it('retorna 0 apenas quando from === to (card central ativo)', () => {
    expect(circularDistance(0, 0, 3)).toBe(0);
    expect(circularDistance(1, 1, 3)).toBe(0);
    expect(circularDistance(2, 2, 3)).toBe(0);
  });

  it('calcula corretamente o próximo álbum à direita (+1)', () => {
    expect(circularDistance(0, 1, 3)).toBe(1);
    expect(circularDistance(1, 2, 3)).toBe(1);
    expect(circularDistance(2, 0, 3)).toBe(1);
  });

  it('calcula corretamente o álbum anterior à esquerda (-1)', () => {
    expect(circularDistance(0, 2, 3)).toBe(-1);
    expect(circularDistance(1, 0, 3)).toBe(-1);
    expect(circularDistance(2, 1, 3)).toBe(-1);
  });

  it('com 5 álbuns calcula distâncias simétricas [-2, -1, 0, 1, 2]', () => {
    expect(circularDistance(0, 0, 5)).toBe(0);
    expect(circularDistance(0, 1, 5)).toBe(1);
    expect(circularDistance(0, 2, 5)).toBe(2);
    expect(circularDistance(0, 3, 5)).toBe(-2);
    expect(circularDistance(0, 4, 5)).toBe(-1);
  });
});

describe('AlbumCarousel - getCardStyle', () => {
  const CARD_W = 240;
  const GAP = 24;

  it('estilo do card ativo (dist = 0) fica em evidência e centralizado', () => {
    const style = getCardStyle(0, CARD_W, GAP);
    expect(style.translateX).toBe(0);
    expect(style.zIndex).toBe(10);
    expect(style.scale).toBe(1);
    expect(style.opacity).toBe(1);
    expect(style.hidden).toBe(false);
  });

  it('estilo do card à direita (dist = 1) tem deslocamento positivo e zIndex menor', () => {
    const style = getCardStyle(1, CARD_W, GAP);
    expect(style.translateX).toBe(264);
    expect(style.zIndex).toBe(9);
    expect(style.scale).toBeLessThan(1);
    expect(style.opacity).toBeLessThan(1);
    expect(style.hidden).toBe(false);
  });

  it('estilo do card à esquerda (dist = -1) tem deslocamento negativo', () => {
    const style = getCardStyle(-1, CARD_W, GAP);
    expect(style.translateX).toBe(-264);
    expect(style.zIndex).toBe(9);
    expect(style.scale).toBeLessThan(1);
    expect(style.opacity).toBeLessThan(1);
    expect(style.hidden).toBe(false);
  });

  it('cards além de MAX_VISIBLE (3) ficam ocultos', () => {
    const style = getCardStyle(4, CARD_W, GAP);
    expect(style.hidden).toBe(true);
    expect(style.scale).toBe(0);
    expect(style.opacity).toBe(0);
  });
});
