import type { SiteConfig } from '../../config/siteConfig.schema';
import { parseSafeDate } from '../../shared/utils/dateUtils';

// ─── Utilities ────────────────────────────────────────────────────────────────

function parseDateStr(dateStr: string): Date | null {
  return parseSafeDate(dateStr);
}

function getMonthsTogether(startDateStr: string, now: Date): number {
  const start = parseDateStr(startDateStr);
  if (!start) return 0;
  
  let months = (now.getFullYear() - start.getFullYear()) * 12;
  months -= start.getMonth();
  months += now.getMonth();
  
  if (now.getDate() < start.getDate()) {
    months--;
  }
  return Math.max(0, months);
}

function getYearsTogether(startDateStr: string, now: Date): number {
  const start = parseDateStr(startDateStr);
  if (!start) return 0;
  
  let years = now.getFullYear() - start.getFullYear();
  if (
    now.getMonth() < start.getMonth() ||
    (now.getMonth() === start.getMonth() && now.getDate() < start.getDate())
  ) {
    years--;
  }
  return Math.max(0, years);
}

// ─── Daily Messages ───────────────────────────────────────────────────────────

function getRandomMsg(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getDailyMessage(name: string, isCreator: boolean, gender: 'M' | 'F' | string, now: Date): string {
  const hour = now.getHours();
  let msgs: string[] = [];
  
  if (isCreator) {
    // Mensagens para o criador do site (mais diretas/parceria)
    if (hour >= 5 && hour < 12) {
      msgs = [
        "Bom dia, {name}! ☀️",
        "Pronto para mais um dia, {name}? ☕",
        "Que seu dia seja produtivo, {name}! ✨",
        "Bom dia! Tudo funcionando perfeitamente, {name}. 🚀"
      ];
    } else if (hour >= 12 && hour < 18) {
      msgs = [
        "Boa tarde, {name}! 😎",
        "Como está indo o dia, {name}? 💼",
        "Pausa para um café, {name}? ☕",
        "Boa tarde! ☀️"
      ];
    } else {
      msgs = [
        "Boa noite, {name}! 🌙",
        "Hora de descansar, {name}... 🛌",
        "Bom descanso, {name}! 💤",
        "Boa noite! 🌌"
      ];
    }
  } else {
    // Mensagens românticas para quem recebe o site, baseadas em gênero
    const isFemale = gender === 'F';
    if (hour >= 5 && hour < 12) {
      msgs = [
        "Bom dia, {name}! ☀️",
        "Bom dia, meu amor! ☕🥰",
        "Que seu dia seja lindo, {name}! ✨",
        isFemale ? "Acordou maravilhosa hoje, {name}! 🌷" : "Acordou lindo hoje, {name}! 🦸‍♂️"
      ];
    } else if (hour >= 12 && hour < 18) {
      msgs = [
        isFemale ? "Boa tarde, {name}! 🌻" : "Boa tarde, {name}! 😎",
        "Pensando em você, {name}... 💭",
        isFemale ? "Boa tarde, minha linda! 💖" : "Boa tarde, meu lindo! 💖",
        isFemale ? "Espero que seu dia esteja sendo ótimo, maravilhosa! 🍃" : "Espero que seu dia esteja sendo ótimo, gatão! 😎"
      ];
    } else {
      msgs = [
        "Boa noite, {name}! 🌙",
        "Boa noite, meu amor! 💫",
        "Sonhe comigo, {name}! 🥰",
        isFemale ? "Durma bem, minha princesa... 🛌💤" : "Durma bem, meu príncipe... 🛌💤"
      ];
    }
  }
  
  const template = getRandomMsg(msgs);
  return template.replace(/{name}/g, name);
}

// ─── Main Logic ───────────────────────────────────────────────────────────────

export function getWelcomeMessage(
  playerId: string,
  config: SiteConfig | null
): string {
  if (!config) return `Olá, ${playerId}!`;

  let name = playerId;
  let isPartner1 = false;
  let birthDate = '';
  let gender = 'F';

  // Identify player
  if (playerId === config.couple.partner1.playerId) {
    name = config.couple.partner1.name;
    isPartner1 = true;
    birthDate = config.couple.partner1.birthDate || '';
    gender = config.couple.partner1.gender || 'M';
  } else if (playerId === config.couple.partner2.playerId) {
    name = config.couple.partner2.name;
    birthDate = config.couple.partner2.birthDate || '';
    gender = config.couple.partner2.gender || 'F';
  } else {
    // Visitor or legacy fallback
    const p1IdLegacy = config.couple.partner1.name.toLowerCase();
    const p2IdLegacy = config.couple.partner2.name.toLowerCase();
    
    if (playerId === p1IdLegacy || playerId === 'kevin') {
      name = config.couple.partner1.name;
      isPartner1 = true;
      birthDate = config.couple.partner1.birthDate || '';
      gender = config.couple.partner1.gender || 'M';
    } else if (playerId === p2IdLegacy || playerId === 'iara') {
      name = config.couple.partner2.name;
      birthDate = config.couple.partner2.birthDate || '';
      gender = config.couple.partner2.gender || 'F';
    }
  }

  const startDateStr = config.relationship.startDate;
  const now = new Date();
  
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const todayMMDD = `${mm}-${dd}`;

  // 1. Birthday
  if (birthDate) {
    const bDate = parseDateStr(birthDate);
    if (bDate && bDate.getMonth() === now.getMonth() && bDate.getDate() === now.getDate()) {
      return `Feliz Aniversário, ${name}! 🎉🎂`;
    }
  }

  // 2. Relationship Anniversary (Yearly)
  const start = parseDateStr(startDateStr);
  if (start && start.getMonth() === now.getMonth() && start.getDate() === now.getDate()) {
    const years = getYearsTogether(startDateStr, now);
    if (years > 0) {
      return `Feliz ${years}º Ano de Namoro, ${name}! 🥂❤️`;
    }
  }

  // 3. Mesversário (Monthly Anniversary)
  if (start && start.getDate() === now.getDate()) {
    const months = getMonthsTogether(startDateStr, now);
    if (months > 0) {
      return `Feliz ${months}º mês juntos, ${name}! 🎉💖`;
    }
  }

  // 4. Fixed Holidays
  if (todayMMDD === '12-25') {
    return `Feliz Natal, ${name}! 🎄🎅`;
  }
  if (todayMMDD === '01-01') {
    return `Feliz Ano Novo, ${name}! 🎆✨`;
  }
  if (todayMMDD === '06-12') {
    return `Feliz Dia dos Namorados, meu amor! 💘🥰`;
  }
  if (todayMMDD === '02-14') {
    return `Happy Valentine's Day, ${name}! 💝`;
  }
  if (todayMMDD === '03-08' && gender === 'F') {
    return `Feliz Dia das Mulheres, minha linda! 🌹👩`;
  }

  // 5. Fallback Daily Greeting
  return getDailyMessage(name, isPartner1, gender, now);
}


