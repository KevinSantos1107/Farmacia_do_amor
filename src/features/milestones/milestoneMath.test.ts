import { describe, it, expect } from 'vitest';
import { getUniverseData, calculateMoonPhase, MONTHLY_BODAS, YEARLY_BODAS } from './milestoneMath';

describe('milestoneMath', () => {
  it('calcula a fase da lua determinística com base na data de referência', () => {
    // 6 de janeiro de 2000 foi Lua Nova de referência
    const newMoonDate = new Date('2000-01-06T18:14:00Z');
    const phase = calculateMoonPhase(newMoonDate);
    expect(phase.phaseName).toBe('Lua Nova');
    expect(phase.emoji).toBe('🌑');
    expect(phase.illumination).toBeLessThanOrEqual(5);
  });

  it('calcula marcos e bodas para um relacionamento de 1 ano e 3 meses', () => {
    const startDate = new Date('2023-01-01T12:00:00Z');
    const now = new Date('2024-04-01T12:00:00Z'); // ~456 dias

    const data = getUniverseData(
      startDate,
      { name: 'Kevin', birthDate: '1998-05-10' },
      { name: 'Iara', birthDate: '2000-08-20' },
      now
    );

    expect(data.totalDays).toBeGreaterThan(450);
    expect(data.reachedBodasCount).toBeGreaterThanOrEqual(12); // Todas as 11 mensais + 1 ano de papel
    expect(data.solarOrbits).toBe(1);
    expect(data.fullMoons).toBeGreaterThanOrEqual(15);
    expect(data.orbitalKmMillions).toBeGreaterThan(1000);

    // Próximo marco detectado
    expect(data.nextMilestone).toBeDefined();
    expect(data.nextMilestone.daysRemaining).toBeGreaterThanOrEqual(0);

    // Porcentagem de vida entrelaçada
    expect(data.lifePercentages).toBeDefined();
    expect(data.lifePercentages?.partner1Percent).toBeGreaterThan(0);
    expect(data.lifePercentages?.partner2Percent).toBeGreaterThan(0);
  });

  it('lida com data de relacionamento vazia ou futura sem quebrar', () => {
    const futureDate = new Date('2099-01-01');
    const data = getUniverseData(futureDate);
    expect(data.totalDays).toBe(0);
    expect(data.bodas).toEqual([]);
    expect(data.nextMilestone.title).toBe('Primeiro Dia Juntos');
  });

  it('calcula o progresso acumulado até o próximo marco (ex: 388 de 500 dias)', () => {
    // Simulando 388 dias de relacionamento
    const startDate = new Date('2023-01-01T12:00:00Z');
    const now = new Date('2024-01-24T12:00:00Z'); // exatamente 388 dias

    const data = getUniverseData(startDate, undefined, undefined, now);
    expect(data.totalDays).toBe(388);
    expect(data.nextMilestone.title).toBe('500 Dias Juntos');
    expect(data.nextMilestone.totalTargetDays).toBe(500);
    // 388 / 500 = 77.6% -> arredondado para 78%
    expect(data.nextMilestone.progressPercent).toBe(78);
    expect(data.nextMilestone.daysRemaining).toBe(112);
  });
});
