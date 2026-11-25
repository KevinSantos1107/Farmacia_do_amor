import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  differenceInYears,
  addDays,
  addMonths,
  addYears,
} from 'date-fns';

export interface NextMilestone {
  title: string;
  category: 'days' | 'anniversaries' | 'years' | 'bodas';
  targetDate: Date;
  daysRemaining: number;
  progressPercent: number;
  totalTargetDays: number;
  description: string;
}

export interface AnniversaryInfo {
  period: string;
  name: string;
  meaning: string;
  isReached: boolean;
  targetDate: Date;
  daysRemaining: number;
  type: 'monthly' | 'yearly';
}

export type BodaInfo = AnniversaryInfo;

export interface DayMilestone {
  targetDays: number;
  title: string;
  targetDate: Date;
  isReached: boolean;
  daysRemaining: number;
}

export interface MoonPhaseInfo {
  phaseName: string;
  illumination: number; // 0 a 100%
  emoji: string;
  description: string;
}

export interface UniverseData {
  totalDays: number;
  totalHours: number;
  totalMinutes: number;
  totalSeconds: number;

  // Próximo marco iminente
  nextMilestone: NextMilestone;

  // Mensversários, Aniversários e Marcos de Namoro
  anniversaries: AnniversaryInfo[];
  reachedAnniversariesCount: number;
  nextAnniversary: AnniversaryInfo | null;
  dayMilestones: DayMilestone[];

  // Compatibilidade retroativa
  bodas: AnniversaryInfo[];
  reachedBodasCount: number;
  nextBoda: AnniversaryInfo | null;

  // Cosmos
  fullMoons: number;
  newMoons: number;
  startMoonPhase: MoonPhaseInfo;
  solarOrbits: number;
  orbitalKmMillions: number;
  solsticesAndEquinoxes: number;

  // Natureza e Calendário
  springs: number;
  summers: number;
  autumns: number;
  winters: number;
  weekends: number;
  christmases: number;
  newYears: number;
  monthlyAnniversaries: number;
  leapDays: number;

  // Curiosidades
  estimatedHeartbeatsMillions: number;
  estimatedSleepHours: number;
  lifePercentages?: {
    partner1Name: string;
    partner1Percent: number;
    partner2Name: string;
    partner2Percent: number;
  };
}

// ─── Dicionário de Mensversários de Namoro (1 a 11 meses) ───────────────────
export const MONTHLY_ANNIVERSARIES = [
  { months: 1, name: '1º Mês de Namoro', meaning: 'O doce início da nossa jornada e a certeza de estarmos no caminho certo' },
  { months: 2, name: '2º Mês de Namoro', meaning: 'O frescor, o encanto e a alegria dos nossos primeiros momentos juntos' },
  { months: 3, name: '3º Mês de Namoro', meaning: 'A leveza, a conexão e o aconchego que crescem a cada dia' },
  { months: 4, name: '4º Mês de Namoro', meaning: 'A cumplicidade leve e as risadas compartilhadas que só nós dois entendemos' },
  { months: 5, name: '5º Mês de Namoro', meaning: 'O carinho sincero e a parceria que se fortalecem a cada conversa' },
  { months: 6, name: '6º Mês de Namoro (1º Semestre)', meaning: 'Meio ano construindo planos, memórias e voando lado a lado' },
  { months: 7, name: '7º Mês de Namoro', meaning: 'A paz e o brilho que você trouxe para a minha rotina e o meu coração' },
  { months: 8, name: '8º Mês de Namoro', meaning: 'A harmonia suave e a certeza de que seu abraço virou meu lugar favorito' },
  { months: 9, name: '9º Mês de Namoro', meaning: 'Colorindo a vida com muito companheirismo, respeito e afeto mútuo' },
  { months: 10, name: '10º Mês de Namoro', meaning: 'O cuidado mútuo e a admiração sincera que se aprofundam com o tempo' },
  { months: 11, name: '11º Mês de Namoro', meaning: 'Inseparáveis e na expectativa doce de completar nosso primeiro grande ano' },
];

// ─── Dicionário de Aniversários de Namoro (Anos) ─────────────────────────────
export const YEARLY_ANNIVERSARIES = [
  { years: 1, name: '1º Ano de Namoro', meaning: '365 dias compartilhando a vida, os sonhos e construindo um amor verdadeiro' },
  { years: 2, name: '2º Ano de Namoro', meaning: 'Dois anos fortalecendo raízes, cumplicidade e maturidade a dois' },
  { years: 3, name: '3º Ano de Namoro', meaning: 'Três anos de parceria sólida, apoio mútuo e certezas compartilhadas' },
  { years: 4, name: '4º Ano de Namoro', meaning: 'O amadurecimento bonito do nosso sentimento e a doçura da nossa rotina' },
  { years: 5, name: '5º Ano de Namoro', meaning: 'Meia década de amor inabalável, respeito e lealdade construídos dia a dia' },
  { years: 6, name: '6º Ano de Namoro', meaning: 'A beleza serena e a doçura que permanecem vivas em cada detalhe nosso' },
  { years: 7, name: '7º Ano de Namoro', meaning: 'Sete anos vencendo desafios juntos e celebrando cada conquista a dois' },
  { years: 8, name: '8º Ano de Namoro', meaning: 'Um amor esculpido com paciência, admiração e carinho profundo' },
  { years: 9, name: '9º Ano de Namoro', meaning: 'Quase uma década de companheirismo, confidência e sintonia perfeita' },
  { years: 10, name: '10º Ano de Namoro', meaning: 'Uma década inteira de história, paixão e cumplicidade inabalável' },
  { years: 15, name: '15 Anos de Namoro', meaning: 'A transparência límpida e a nobreza de uma união radiante e duradoura' },
  { years: 20, name: '20 Anos de Namoro', meaning: 'Vinte anos de vidas entrelaçadas em perfeita harmonia e companheirismo' },
  { years: 25, name: '25 Anos de Namoro', meaning: 'Um quarto de século de parceria eterna iluminando o mundo' },
  { years: 30, name: '30 Anos de Namoro', meaning: 'Três décadas cultivando o amor mais raro e especial' },
  { years: 40, name: '40 Anos de Namoro', meaning: 'Quatro décadas de uma história exemplar de lealdade e afeto' },
  { years: 50, name: '50 Anos de Namoro', meaning: 'Meio século de amor: uma vida inteira compartilhada sob o mesmo teto e coração' },
];

// Compatibilidade retroativa
export const MONTHLY_BODAS = MONTHLY_ANNIVERSARIES;
export const YEARLY_BODAS = YEARLY_ANNIVERSARIES;

export const KEY_DAY_INTERVALS = [
  30, 50, 100, 200, 300, 365, 500, 730, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 10000,
];

// ─── Algoritmo Lunar Determinístico (Conway / Meeus Synodic) ──────────────────
export function calculateMoonPhase(date: Date): MoonPhaseInfo {
  // Marco de referência astronômico de Lua Nova: 6 de janeiro de 2000, 18:14 UTC
  const refNewMoon = new Date('2000-01-06T18:14:00Z').getTime();
  const synodicMonthMs = 29.53058867 * 24 * 60 * 60 * 1000;
  const diffMs = date.getTime() - refNewMoon;
  
  let phaseFraction = (diffMs % synodicMonthMs) / synodicMonthMs;
  if (phaseFraction < 0) phaseFraction += 1;

  // Iluminação percentual de 0 a 100%
  const illumination = Math.round(((1 - Math.cos(phaseFraction * 2 * Math.PI)) / 2) * 100);

  if (phaseFraction < 0.03 || phaseFraction >= 0.97) {
    return {
      phaseName: 'Lua Nova',
      illumination,
      emoji: '🌑',
      description: 'O início de um novo ciclo no céu, assim como o amor que começava ali.',
    };
  } else if (phaseFraction < 0.22) {
    return {
      phaseName: 'Lua Crescente',
      illumination,
      emoji: '🌒',
      description: 'Uma fina lâmina de luz crescendo no horizonte celestial.',
    };
  } else if (phaseFraction < 0.28) {
    return {
      phaseName: 'Quarto Crescente',
      illumination,
      emoji: '🌓',
      description: 'Metade iluminada, apontando com firmeza para o brilho pleno.',
    };
  } else if (phaseFraction < 0.47) {
    return {
      phaseName: 'Gibosa Crescente',
      illumination,
      emoji: '🌔',
      description: 'Quase completa, transbordando luminosidade sobre o mundo.',
    };
  } else if (phaseFraction < 0.53) {
    return {
      phaseName: 'Lua Cheia',
      illumination,
      emoji: '🌕',
      description: 'Plenamente iluminada, radiante e abençoando a noite.',
    };
  } else if (phaseFraction < 0.72) {
    return {
      phaseName: 'Gibosa Minguante',
      illumination,
      emoji: '🌖',
      description: 'Luz intensa e madura, guardando as memórias da noite inteira.',
    };
  } else if (phaseFraction < 0.78) {
    return {
      phaseName: 'Quarto Minguante',
      illumination,
      emoji: '🌗',
      description: 'Equilíbrio sereno de luz e mistério nas primeiras horas.',
    };
  } else {
    return {
      phaseName: 'Lua Minguante',
      illumination,
      emoji: '🌘',
      description: 'Um arco sutil de prata, preparando o céu para renovar seu ciclo.',
    };
  }
}

// ─── Motor Principal de Universo de Marcos ───────────────────────────────────
export function getUniverseData(
  startDateInput: Date | string | number,
  partner1?: { name: string; birthDate?: string },
  partner2?: { name: string; birthDate?: string },
  now: Date = new Date()
): UniverseData {
  const startDate = new Date(startDateInput);

  if (isNaN(startDate.getTime()) || startDate > now) {
    const emptyDate = new Date();
    return {
      totalDays: 0,
      totalHours: 0,
      totalMinutes: 0,
      totalSeconds: 0,
      nextMilestone: {
        title: 'Primeiro Dia Juntos',
        category: 'days',
        targetDate: emptyDate,
        daysRemaining: 0,
        progressPercent: 0,
        totalTargetDays: 1,
        description: 'O início de tudo',
      },
      anniversaries: [],
      reachedAnniversariesCount: 0,
      nextAnniversary: null,
      bodas: [],
      reachedBodasCount: 0,
      nextBoda: null,
      dayMilestones: [],
      fullMoons: 0,
      newMoons: 0,
      startMoonPhase: calculateMoonPhase(now),
      solarOrbits: 0,
      orbitalKmMillions: 0,
      solsticesAndEquinoxes: 0,
      springs: 0,
      summers: 0,
      autumns: 0,
      winters: 0,
      weekends: 0,
      christmases: 0,
      newYears: 0,
      monthlyAnniversaries: 0,
      leapDays: 0,
      estimatedHeartbeatsMillions: 0,
      estimatedSleepHours: 0,
    };
  }

  const totalDays = differenceInDays(now, startDate);
  const totalHours = differenceInHours(now, startDate);
  const totalMinutes = differenceInMinutes(now, startDate);
  const totalSeconds = differenceInSeconds(now, startDate);

  // 1. Mensversários e Aniversários de Namoro
  const anniversaries: AnniversaryInfo[] = [];

  // Mensversários (1 a 11 meses)
  for (const item of MONTHLY_ANNIVERSARIES) {
    const targetDate = addMonths(startDate, item.months);
    const daysRemaining = differenceInDays(targetDate, now);
    anniversaries.push({
      period: `${item.months} ${item.months === 1 ? 'mês' : 'meses'}`,
      name: item.name,
      meaning: item.meaning,
      isReached: targetDate <= now,
      targetDate,
      daysRemaining,
      type: 'monthly',
    });
  }

  // Anos de Namoro
  for (const item of YEARLY_ANNIVERSARIES) {
    const targetDate = addYears(startDate, item.years);
    const daysRemaining = differenceInDays(targetDate, now);
    anniversaries.push({
      period: `${item.years} ${item.years === 1 ? 'ano' : 'anos'}`,
      name: item.name,
      meaning: item.meaning,
      isReached: targetDate <= now,
      targetDate,
      daysRemaining,
      type: 'yearly',
    });
  }

  const reachedAnniversariesCount = anniversaries.filter((a) => a.isReached).length;
  const nextAnniversary = anniversaries.find((a) => !a.isReached) || null;

  // 2. Marcos de Dias (Mile-Days)
  const dayMilestones: DayMilestone[] = KEY_DAY_INTERVALS.map((targetDays) => {
    const targetDate = addDays(startDate, targetDays);
    const daysRemaining = differenceInDays(targetDate, now);
    return {
      targetDays,
      title: `${targetDays.toLocaleString('pt-BR')} Dias Juntos`,
      targetDate,
      isReached: targetDate <= now,
      daysRemaining,
    };
  });

  // 3. Próximo Marco Iminente (Seleção mais próxima no futuro)
  const futureDayMilestone = dayMilestones.find((m) => !m.isReached);
  let nextMilestoneCandidate: NextMilestone;

  if (nextAnniversary && futureDayMilestone) {
    if (nextAnniversary.daysRemaining <= futureDayMilestone.daysRemaining) {
      // Aniversário/Mensversário está mais próximo: progresso é dias totais juntos / dias totais até o marco
      const totalSpan = Math.max(1, differenceInDays(nextAnniversary.targetDate, startDate));
      const progressPercent = Math.min(100, Math.max(0, Math.round((totalDays / totalSpan) * 100)));

      nextMilestoneCandidate = {
        title: nextAnniversary.name,
        category: 'anniversaries',
        targetDate: nextAnniversary.targetDate,
        daysRemaining: Math.max(0, nextAnniversary.daysRemaining),
        progressPercent,
        totalTargetDays: totalSpan,
        description: `Comemoração de ${nextAnniversary.period} de namoro juntos.`,
      };
    } else {
      // Marco de dia está mais próximo: progresso é dias totais juntos / meta em dias (ex: 388 de 500 = 78%)
      const targetDays = futureDayMilestone.targetDays;
      const progressPercent = Math.min(100, Math.max(0, Math.round((totalDays / targetDays) * 100)));

      nextMilestoneCandidate = {
        title: futureDayMilestone.title,
        category: 'days',
        targetDate: futureDayMilestone.targetDate,
        daysRemaining: Math.max(0, futureDayMilestone.daysRemaining),
        progressPercent,
        totalTargetDays: targetDays,
        description: `Alcançando o marco especial de ${futureDayMilestone.targetDays.toLocaleString('pt-BR')} dias.`,
      };
    }
  } else if (futureDayMilestone) {
    const targetDays = futureDayMilestone.targetDays;
    const progressPercent = Math.min(100, Math.max(0, Math.round((totalDays / targetDays) * 100)));

    nextMilestoneCandidate = {
      title: futureDayMilestone.title,
      category: 'days',
      targetDate: futureDayMilestone.targetDate,
      daysRemaining: Math.max(0, futureDayMilestone.daysRemaining),
      progressPercent,
      totalTargetDays: targetDays,
      description: `Alcançando ${futureDayMilestone.targetDays.toLocaleString('pt-BR')} dias.`,
    };
  } else {
    // Casal veterano além de 10.000 dias! Próximo aniversário
    const yearsTogether = differenceInYears(now, startDate);
    const nextAnniversary = addYears(startDate, yearsTogether + 1);
    const daysRemaining = Math.max(0, differenceInDays(nextAnniversary, now));
    const totalSpan = Math.max(1, differenceInDays(nextAnniversary, startDate));
    const progressPercent = Math.min(100, Math.max(0, Math.round((totalDays / totalSpan) * 100)));

    nextMilestoneCandidate = {
      title: `${yearsTogether + 1} Anos de Amor`,
      category: 'years',
      targetDate: nextAnniversary,
      daysRemaining,
      progressPercent,
      totalTargetDays: totalSpan,
      description: 'Mais um ano escrevendo essa linda história.',
    };
  }

  // 4. Cosmos
  const synodicMonthDays = 29.53058867;
  const fullMoons = Math.floor(totalDays / synodicMonthDays);
  const newMoons = Math.floor(totalDays / synodicMonthDays);
  const startMoonPhase = calculateMoonPhase(startDate);
  const solarOrbits = differenceInYears(now, startDate);
  // Velocidade orbital da Terra ~107.226 km/h -> ~2.573.424 km/dia
  const orbitalKmMillions = Number(((totalDays * 2573424) / 1000000).toFixed(1));
  const solsticesAndEquinoxes = Math.floor((totalDays / 365.2422) * 4);

  // 5. Natureza & Calendário (Hemisfério Sul)
  // No Hemisfério Sul:
  // Verão: Dezembro a Março | Outono: Março a Junho | Inverno: Junho a Setembro | Primavera: Setembro a Dezembro
  let winters = 0;
  let springs = 0;
  let summers = 0;
  let autumns = 0;
  let weekends = 0;
  let christmases = 0;
  let newYears = 0;
  let monthlyAnniversaries = 0;
  let leapDays = 0;

  const startDayOfMonth = startDate.getDate();

  // Itera por cada dia do relacionamento para contar com 100% de precisão de calendário
  const cur = new Date(startDate);
  // Normaliza horas para evitar desvio de fuso
  cur.setHours(12, 0, 0, 0);
  const endNormalized = new Date(now);
  endNormalized.setHours(12, 0, 0, 0);

  // Para contagem de estações por virada de solstício/equinócio aproximado
  while (cur <= endNormalized) {
    const month = cur.getMonth(); // 0 a 11
    const day = cur.getDate();
    const dayOfWeek = cur.getDay(); // 0 (Domingo) a 6 (Sábado)

    // Finais de semana (apenas sábados como marco de fim de semana completo)
    if (dayOfWeek === 6) weekends++;

    // Mensversários / Dia especial do casal no mês (exceto o próprio dia inicial)
    if (day === startDayOfMonth && cur.getTime() > startDate.getTime()) {
      monthlyAnniversaries++;
    }

    // Natal
    if (month === 11 && day === 25) christmases++;

    // Réveillon / Ano Novo
    if (month === 0 && day === 1) newYears++;

    // Ano bissexto
    if (month === 1 && day === 29) leapDays++;

    // Mudança de estação no Hemisfério Sul (aproximadamente dia 21)
    if (day === 21) {
      if (month === 2) autumns++;   // 21 de Março: início do Outono
      if (month === 5) winters++;   // 21 de Junho: início do Inverno
      if (month === 8) springs++;   // 21 de Setembro: início da Primavera
      if (month === 11) summers++;  // 21 de Dezembro: início do Verão
    }

    cur.setDate(cur.getDate() + 1);
  }

  // 6. Curiosidades e Estatísticas Poéticas
  // Batimentos cardíacos: média 72 bpm -> ~103.680 por dia
  const estimatedHeartbeatsMillions = Number(((totalDays * 103680) / 1000000).toFixed(1));
  // Noites de sono/sonho: média 8 horas por dia
  const estimatedSleepHours = totalDays * 8;

  // 7. Porcentagem da Vida Entrelaçada (Lifeline Overlap)
  let lifePercentages: UniverseData['lifePercentages'] = undefined;
  if (partner1?.birthDate && partner2?.birthDate) {
    const b1 = new Date(partner1.birthDate);
    const b2 = new Date(partner2.birthDate);
    if (!isNaN(b1.getTime()) && !isNaN(b2.getTime())) {
      const p1LifeMs = now.getTime() - b1.getTime();
      const p2LifeMs = now.getTime() - b2.getTime();
      const relMs = now.getTime() - startDate.getTime();

      if (p1LifeMs > 0 && p2LifeMs > 0) {
        const p1Pct = Math.min(100, Math.max(0, (relMs / p1LifeMs) * 100));
        const p2Pct = Math.min(100, Math.max(0, (relMs / p2LifeMs) * 100));
        lifePercentages = {
          partner1Name: partner1.name,
          partner1Percent: Number(p1Pct.toFixed(1)),
          partner2Name: partner2.name,
          partner2Percent: Number(p2Pct.toFixed(1)),
        };
      }
    }
  }

  return {
    totalDays,
    totalHours,
    totalMinutes,
    totalSeconds,
    nextMilestone: nextMilestoneCandidate,
    anniversaries,
    reachedAnniversariesCount,
    nextAnniversary,
    bodas: anniversaries,
    reachedBodasCount: reachedAnniversariesCount,
    nextBoda: nextAnniversary,
    dayMilestones,
    fullMoons,
    newMoons,
    startMoonPhase,
    solarOrbits,
    orbitalKmMillions,
    solsticesAndEquinoxes,
    springs,
    summers,
    autumns,
    winters,
    weekends,
    christmases,
    newYears,
    monthlyAnniversaries,
    leapDays,
    estimatedHeartbeatsMillions,
    estimatedSleepHours,
    lifePercentages,
  };
}
