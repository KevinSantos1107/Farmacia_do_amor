import { describe, it, expect } from 'vitest';
import { parseSafeDate, formatSafeDate, getSafeTime } from './dateUtils';

describe('dateUtils', () => {
  it('deve parsear datas no formato YYYY-MM-DD com segurança', () => {
    const d = parseSafeDate('2024-05-10');
    expect(d).not.toBeNull();
    expect(d?.getFullYear()).toBe(2024);
    expect(d?.getMonth()).toBe(4); // 0-indexed maio
    expect(d?.getDate()).toBe(10);
  });

  it('deve parsear datas ISO com horário e sufixo Z', () => {
    const d = parseSafeDate('2024-05-10T14:30:00.000Z');
    expect(d).not.toBeNull();
    expect(isNaN(d!.getTime())).toBe(false);
  });

  it('deve parsear formato com espaço YYYY-MM-DD HH:mm:ss', () => {
    const d = parseSafeDate('2024-05-10 14:30:00');
    expect(d).not.toBeNull();
    expect(d?.getFullYear()).toBe(2024);
    expect(d?.getMonth()).toBe(4);
    expect(d?.getDate()).toBe(10);
  });

  it('retorna null para valores vazios, inválidos ou nulos', () => {
    expect(parseSafeDate(null)).toBeNull();
    expect(parseSafeDate(undefined)).toBeNull();
    expect(parseSafeDate('')).toBeNull();
    expect(parseSafeDate('data-invalida-xyz')).toBeNull();
  });

  it('formata datas em pt-BR sem lançar exceções', () => {
    const formatted = formatSafeDate('2024-05-10', 'pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    expect(formatted).toBe('10/05/2024');

    expect(formatSafeDate(null)).toBe('');
    expect(formatSafeDate('invalida')).toBe('');
  });

  it('extrai timestamp numérico com getSafeTime', () => {
    const time = getSafeTime('2024-05-10');
    expect(typeof time).toBe('number');
    expect(time).toBeGreaterThan(0);
    expect(getSafeTime(null)).toBeNull();
  });
});
