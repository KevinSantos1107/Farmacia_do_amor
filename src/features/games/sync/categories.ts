import { shuffle } from '../../../shared/utils/shuffle';

export type CategoryType = 'light' | 'abstract' | 'couple';

export interface Category {
  id: string;
  text: string;
  type: CategoryType;
}

// ── Categorias curtas e abrangentes ─────────────────────────────────────────
// Cada categoria é um TEMA (1–3 palavras), não uma pergunta aberta.
// O casal deve pensar em UMA palavra que represente o tema.

export const CATEGORIES: Category[] = [
  // ── Light (20): coisas do dia a dia, concretas ────────────────────────────
  { id: 'l1',  text: 'Uma fruta',            type: 'light' },
  { id: 'l2',  text: 'Um animal de estimação', type: 'light' },
  { id: 'l3',  text: 'Uma cor de roupa',     type: 'light' },
  { id: 'l4',  text: 'Um país para viajar',  type: 'light' },
  { id: 'l5',  text: 'Um esporte',           type: 'light' },
  { id: 'l6',  text: 'Uma comida',           type: 'light' },
  { id: 'l7',  text: 'Uma bebida',           type: 'light' },
  { id: 'l8',  text: 'Um doce',              type: 'light' },
  { id: 'l9',  text: 'Uma profissão',        type: 'light' },
  { id: 'l10', text: 'Uma cidade para morar', type: 'light' },
  { id: 'l11', text: 'Um instrumento',       type: 'light' },
  { id: 'l12', text: 'Uma peça de roupa',    type: 'light' },
  { id: 'l13', text: 'Um super-herói',       type: 'light' },
  { id: 'l14', text: 'Um veículo',           type: 'light' },
  { id: 'l15', text: 'Uma flor',             type: 'light' },
  { id: 'l16', text: 'Um sabor de pizza',    type: 'light' },
  { id: 'l17', text: 'Um jogo de tabuleiro', type: 'light' },
  { id: 'l18', text: 'Uma marca famosa',     type: 'light' },
  { id: 'l19', text: 'Um personagem de desenho', type: 'light' },
  { id: 'l20', text: 'Uma estação do ano',   type: 'light' },

  // ── Abstract (20): conceitos, sensações, imaginação ───────────────────────
  { id: 'a1',  text: 'Um sentimento',        type: 'abstract' },
  { id: 'a2',  text: 'Uma palavra bonita',   type: 'abstract' },
  { id: 'a3',  text: 'Um medo',              type: 'abstract' },
  { id: 'a4',  text: 'Um sonho',             type: 'abstract' },
  { id: 'a5',  text: 'Um superpoder',        type: 'abstract' },
  { id: 'a6',  text: 'Um som',               type: 'abstract' },
  { id: 'a7',  text: 'Um cheiro',            type: 'abstract' },
  { id: 'a8',  text: 'Um dia da semana',     type: 'abstract' },
  { id: 'a9',  text: 'Uma textura',          type: 'abstract' },
  { id: 'a10', text: 'Um lugar imaginário',  type: 'abstract' },
  { id: 'a11', text: 'Uma época da vida',    type: 'abstract' },
  { id: 'a12', text: 'Um elemento',          type: 'abstract' },
  { id: 'a13', text: 'Uma virtude',          type: 'abstract' },
  { id: 'a14', text: 'Um defeito',           type: 'abstract' },
  { id: 'a15', text: 'Algo invisível',       type: 'abstract' },
  { id: 'a16', text: 'Uma palavra forte',    type: 'abstract' },
  { id: 'a17', text: 'Um sabor',             type: 'abstract' },
  { id: 'a18', text: 'Uma emoção',           type: 'abstract' },
  { id: 'a19', text: 'Uma temperatura',      type: 'abstract' },
  { id: 'a20', text: 'Um clima',             type: 'abstract' },

  // ── Couple (20): sobre o casal, memórias, preferências ────────────────────
  { id: 'c1',  text: 'Um lugar nosso',       type: 'couple' },
  { id: 'c2',  text: 'Uma música nossa',     type: 'couple' },
  { id: 'c3',  text: 'Um filme nosso',       type: 'couple' },
  { id: 'c4',  text: 'Uma comida nossa',     type: 'couple' },
  { id: 'c5',  text: 'Um apelido',           type: 'couple' },
  { id: 'c6',  text: 'Um programa a dois',   type: 'couple' },
  { id: 'c7',  text: 'Uma viagem dos sonhos',type: 'couple' },
  { id: 'c8',  text: 'Um hobby juntos',      type: 'couple' },
  { id: 'c9',  text: 'Uma série nossa',      type: 'couple' },
  { id: 'c10', text: 'Uma data especial',    type: 'couple' },
  { id: 'c11', text: 'Um restaurante nosso', type: 'couple' },
  { id: 'c12', text: 'Uma piada interna',    type: 'couple' },
  { id: 'c13', text: 'Um presente marcante', type: 'couple' },
  { id: 'c14', text: 'Um sonho a dois',      type: 'couple' },
  { id: 'c15', text: 'Uma mania sua',        type: 'couple' },
  { id: 'c16', text: 'Nosso tipo de rolê',   type: 'couple' },
  { id: 'c17', text: 'Nosso lanche favorito',type: 'couple' },
  { id: 'c18', text: 'Algo que irrita a gente', type: 'couple' },
  { id: 'c19', text: 'Um momento marcante',  type: 'couple' },
  { id: 'c20', text: 'Uma palavra nossa',    type: 'couple' },
];


export function generateSessionPlan(): CategoryType[] {
  // Plan: 2 light, 2 couple, 1 abstract — shuffled
  const plan: CategoryType[] = ['light', 'light', 'couple', 'couple', 'abstract'];
  return shuffle(plan);
}

export function getCardsForType(type: CategoryType, excludeTexts: string[], count: number = 3): string[] {
  const available = CATEGORIES.filter((c) => c.type === type && !excludeTexts.includes(c.text));
  return shuffle(available).slice(0, count).map((c) => c.text);
}
