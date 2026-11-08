import { describe, it, expect } from 'vitest';
import { calculateSnakeGrid, COLS, ROWS } from './useSnakeGame';

describe('calculateSnakeGrid — Proporção adaptativa para celular, tablet e desktop', () => {
  it('retorna grade clássica (17x15) quando dimensões são inválidas', () => {
    expect(calculateSnakeGrid(0, 0)).toEqual({ cols: COLS, rows: ROWS });
    expect(calculateSnakeGrid(-100, 500)).toEqual({ cols: COLS, rows: ROWS });
    expect(calculateSnakeGrid(500, -100)).toEqual({ cols: COLS, rows: ROWS });
  });

  it('retorna grade clássica (17x15) em desktop e telas paisagem (availW >= availH)', () => {
    // Desktop 1920x1080
    expect(calculateSnakeGrid(1200, 800)).toEqual({ cols: 17, rows: 15 });
    // Tablet em modo paisagem (ex: 1024x768)
    expect(calculateSnakeGrid(900, 600)).toEqual({ cols: 17, rows: 15 });
    // Tela quadrada (availW === availH)
    expect(calculateSnakeGrid(600, 600)).toEqual({ cols: 17, rows: 15 });
  });

  it('adapta a grade para celulares em modo retrato (telas verticais estreitas)', () => {
    // iPhone 14/15/16 portrait (~360 x 620 disponível para o canvas)
    const phoneGrid = calculateSnakeGrid(360, 620);
    expect(phoneGrid.cols).toBeLessThan(phoneGrid.rows);
    const cellCount = phoneGrid.cols * phoneGrid.rows;
    // Quantidade de células próxima ao ideal (~255)
    expect(cellCount).toBeGreaterThanOrEqual(230);
    expect(cellCount).toBeLessThanOrEqual(270);
    // Aspect ratio da grade é vertical (< 1)
    expect(phoneGrid.cols / phoneGrid.rows).toBeLessThan(0.7);
  });

  it('adapta proporcionalmente para tablets em modo retrato (ex: iPad 768x1024)', () => {
    // iPad Mini / 10.9" portrait (~750 x 850 disponível para o canvas)
    const tabletGrid = calculateSnakeGrid(750, 850);
    expect(tabletGrid.cols).toBeLessThanOrEqual(tabletGrid.rows);
    const cellCount = tabletGrid.cols * tabletGrid.rows;
    expect(cellCount).toBeGreaterThanOrEqual(240);
    expect(cellCount).toBeLessThanOrEqual(265);
    // Proporção de tablet retrato é mais larga que celular (ratio ~0.70 a 0.88)
    expect(tabletGrid.cols / tabletGrid.rows).toBeGreaterThanOrEqual(0.7);
  });

  it('garante que as células calculadas cabem 100% no espaço sem overflow', () => {
    const devices = [
      { name: 'iPhone SE', w: 340, h: 460 },
      { name: 'iPhone 15', w: 360, h: 620 },
      { name: 'iPhone 15 Pro Max', w: 400, h: 720 },
      { name: 'iPad Mini Portrait', w: 720, h: 840 },
      { name: 'iPad 10.9 Portrait', w: 780, h: 960 },
      { name: 'Galaxy Tab Portrait', w: 760, h: 1050 },
      { name: 'iPad Landscape', w: 900, h: 560 },
      { name: 'Desktop Full HD', w: 1200, h: 760 },
    ];

    for (const dev of devices) {
      const grid = calculateSnakeGrid(dev.w, dev.h);
      const cellSize = Math.min(Math.floor(dev.w / grid.cols), Math.floor(dev.h / grid.rows));
      const canvasW = grid.cols * cellSize;
      const canvasH = grid.rows * cellSize;

      expect(canvasW, `${dev.name} canvasW (${canvasW}) deve caber em w (${dev.w})`).toBeLessThanOrEqual(dev.w);
      expect(canvasH, `${dev.name} canvasH (${canvasH}) deve caber em h (${dev.h})`).toBeLessThanOrEqual(dev.h);
    }
  });
});
