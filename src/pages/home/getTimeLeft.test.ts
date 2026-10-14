import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getTimeLeft } from './getTimeLeft';

describe('getTimeLeft', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Caso 1: Intervalo menor que 1 minuto (45 segundos)
  it('calcula corretamente intervalo de menos de 1 minuto', () => {
    const startDate = new Date(2023, 5, 10, 14, 30, 0);
    // 45 segundos depois no mesmo dia
    const systemNow = new Date(2023, 5, 10, 14, 30, 45);
    vi.setSystemTime(systemNow);

    const result = getTimeLeft(startDate);

    // Esperado: 0 anos, 0 meses, 0 dias, 0 horas, 0 min, 45 seg, totalDays: 0
    expect(result).toEqual({
      years: 0,
      months: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 45,
      totalDays: 0,
    });
  });

  // Caso 2: Exatamente 1 dia completo (24 horas)
  it('calcula corretamente intervalo de exatamente 1 dia', () => {
    const startDate = new Date(2023, 5, 10, 14, 30, 0);
    // 24 horas depois no dia seguinte
    const systemNow = new Date(2023, 5, 11, 14, 30, 0);
    vi.setSystemTime(systemNow);

    const result = getTimeLeft(startDate);

    // Esperado: 0 anos, 0 meses, 1 dia, 0 horas, 0 min, 0 seg, totalDays: 1
    expect(result).toEqual({
      years: 0,
      months: 0,
      days: 1,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalDays: 1,
    });
  });

  // Caso 3: Vários anos, meses, dias, horas, minutos e segundos (3 anos, 3 meses, 5 dias, 5h 42m 18s)
  it('calcula corretamente intervalo longo de vários anos, meses e dias', () => {
    const startDate = new Date(2020, 0, 15, 10, 0, 0);
    // 15/01/2020 -> 20/04/2023 15:42:18
    const systemNow = new Date(2023, 3, 20, 15, 42, 18);
    vi.setSystemTime(systemNow);

    const result = getTimeLeft(startDate);

    // 2020 a 2023 = 3 anos
    // Jan 15 a Abr 15 = 3 meses
    // Abr 15 a Abr 20 = 5 dias
    // 10:00 a 15:42:18 = 5h 42m 18s
    // totalDays = 1191 (366 em 2020 + 365 em 2021 + 365 em 2022 + 31 Jan + 28 Fev + 31 Mar + 5 Abr = 1191)
    expect(result).toEqual({
      years: 3,
      months: 3,
      days: 5,
      hours: 5,
      minutes: 42,
      seconds: 18,
      totalDays: 1191,
    });
  });

  // Caso 4: Ano bissexto atravessando 29 de fevereiro
  it('considera corretamente o dia 29 de fevereiro em ano bissexto', () => {
    // 28 de fevereiro de 2024 às 12:00:00 (2024 é ano bissexto)
    const startDate = new Date(2024, 1, 28, 12, 0, 0);
    // 01 de março de 2024 às 12:00:00
    const systemNow = new Date(2024, 2, 1, 12, 0, 0);
    vi.setSystemTime(systemNow);

    const result = getTimeLeft(startDate);

    // Passou pelo dia 29/02/2024 -> 2 dias completos decorridos
    expect(result).toEqual({
      years: 0,
      months: 0,
      days: 2,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalDays: 2,
    });
  });

  // Caso 5: Data no futuro (now < startDate)
  it('lida com data de início no futuro sem lançar exceção', () => {
    const startDate = new Date(2025, 5, 1, 12, 0, 0);
    const systemNow = new Date(2024, 5, 1, 12, 0, 0);
    vi.setSystemTime(systemNow);

    const result = getTimeLeft(startDate);

    // date-fns calcula valores negativos para datas futuras
    expect(result.years).toBe(-1);
    expect(result.totalDays).toBeLessThan(0);
  });
});
