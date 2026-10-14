import type { LetterState, Question } from './types';

export const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

export const MAX_ATTEMPTS = 6;

// Classes estáticas apenas (sem var() em shadows — isso é injetado inline no style prop)
export const CELL_BG: Record<LetterState, string> = {
  correct:
    'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_20px_rgba(52,211,153,0.6)] [text-shadow:0_0_8px_rgba(255,255,255,0.8)]',
  present:
    'bg-yellow-500 border-yellow-400 text-white shadow-[0_0_20px_rgba(234,179,8,0.6)] [text-shadow:0_0_8px_rgba(255,255,255,0.8)]',
  absent:
    'bg-slate-400/5 border-slate-600 text-slate-400 shadow-[0_0_10px_rgba(148,163,184,0.1)]',
  empty:
    'bg-[rgba(var(--theme-primary-rgb),0.05)] border-[rgba(var(--theme-primary-rgb),0.3)] text-[var(--theme-primary)]',
  // active usa border-primary (brilhante), bg mais intenso — glow via style prop inline
  active:
    'border-[var(--theme-primary)] text-white',
  typed:
    'bg-[rgba(var(--theme-primary-rgb),0.12)] border-[var(--theme-primary)] text-white',
};

export const KEY_BG: Record<string, string> = {
  correct:
    'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)] [text-shadow:0_0_8px_rgba(255,255,255,0.7)]',
  present:
    'bg-yellow-500 text-white border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.5)] [text-shadow:0_0_8px_rgba(255,255,255,0.7)]',
  absent:
    'bg-slate-800/80 text-slate-500 border-slate-700/50',
  default:
    'bg-[rgba(var(--theme-primary-rgb),0.05)] text-white/80 border-[rgba(var(--theme-primary-rgb),0.2)] hover:bg-[rgba(var(--theme-primary-rgb),0.15)] hover:border-[var(--theme-primary)] hover:text-white active:scale-[0.92] transition-all',
};

export const DEFAULT_QUESTIONS: Question[] = [
  {
    id: 'q1',
    pergunta: 'O que mais gosto em você?',
    palavras: [
      { palavra: 'SORRISO', mensagem: '✨ É isso que eu mais amo em você!' },
      { palavra: 'OLHOS', mensagem: '👀 Seus olhos me encantam!' },
    ],
  },
  {
    id: 'q2',
    pergunta: 'O que sinto quando estou com você?',
    palavras: [
      { palavra: 'FELIZ', mensagem: '😊 Você me faz tão feliz!' },
      { palavra: 'COMPLETO', mensagem: '🧩 Você me completa!' },
    ],
  },
  {
    id: 'q3',
    pergunta: 'O que você é para mim?',
    palavras: [
      { palavra: 'TUDO', mensagem: '❤️ Você é tudo que eu sempre quis!' },
      { palavra: 'AMOR', mensagem: '💖 Você é meu grande amor!' },
    ],
  },
  {
    id: 'q4',
    pergunta: 'O que quero construir com você?',
    palavras: [
      { palavra: 'FUTURO', mensagem: '🏡 Quero todos os meus dias ao seu lado!' },
      { palavra: 'SONHOS', mensagem: '💭 Nossos sonhos juntos!' },
    ],
  },
];
