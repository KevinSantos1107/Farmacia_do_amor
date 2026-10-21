/**
 * schema.ts
 *
 * Tipos e constantes para a feature "Devocional do Casal".
 */

// ─── Mood Options ────────────────────────────────────────────────────────────
export const MOOD_OPTIONS = [
  { id: 'alegre', emoji: '😊', label: 'Alegre' },
  { id: 'ansioso', emoji: '😰', label: 'Ansioso(a)' },
  { id: 'grato', emoji: '🙏', label: 'Grato(a)' },
  { id: 'saudoso', emoji: '💭', label: 'Saudoso(a)' },
  { id: 'estressado', emoji: '😤', label: 'Estressado(a)' },
  { id: 'com-medo', emoji: '😨', label: 'Com medo' },
  { id: 'apaixonado', emoji: '😍', label: 'Apaixonado(a)' },
  { id: 'cansado', emoji: '😴', label: 'Cansado(a)' },
] as const;

export type MoodId = typeof MOOD_OPTIONS[number]['id'];

// ─── Focus Options (Solo Mode) ───────────────────────────────────────────────
export const FOCUS_OPTIONS = [
  { id: 'relacionamento', label: 'O relacionamento', emoji: '💑', desc: 'Como podemos crescer juntos' },
  { id: 'futuro', label: 'O futuro', emoji: '🔮', desc: 'Nossos planos e propósitos' },
  { id: 'eu-mesmo', label: 'Eu mesmo(a)', emoji: '🌱', desc: 'Meu coração e sentimentos' },
  { id: 'fe', label: 'A fé', emoji: '✝️', desc: 'Minha conexão com Deus' },
] as const;

export type FocusId = typeof FOCUS_OPTIONS[number]['id'];

// ─── Reaction Emojis ─────────────────────────────────────────────────────────
export const REACTION_EMOJIS = ['❤️', '🙏', '😢', '💪', '🕊️', '✨'] as const;
export type ReactionEmoji = typeof REACTION_EMOJIS[number];

// ─── AI Response Types ───────────────────────────────────────────────────────
export interface DevotionalMeta {
  book: string;
  meditationAngle: string;
  challengeTheme: string;
}

export interface SoloDevotionalResult {
  verse: string;
  reference: string;
  meditation: string;
  reflectionQuestion: string;
  practicalChallenge: string;
  prayer: string;
  journalPrompts?: string[];
  _meta: DevotionalMeta;
}

export interface SyncDevotionalResult {
  verse: string;
  reference: string;
  meditation: string;
  reflectionQuestion: string;
  practicalChallenge: string;
  couplePrompt: string;
  prayer: string;
  _meta: DevotionalMeta;
}

// ─── History (Anti-repetition System) ─────────────────────────────────────────
export interface DevotionalHistoryEntry {
  date: string;
  mood: string;
  reference: string;
  book: string;
  meditationAngle: string;
  challengeTheme: string;
}

export interface DevotionalMetaDoc {
  history: DevotionalHistoryEntry[];
}

// ─── Favorites ───────────────────────────────────────────────────────────────
export interface DevotionalFavorite {
  id?: string;
  playerId: string;
  date: string;
  mood: string;
  verse: string;
  reference: string;
  meditation: string;
  reflectionQuestion: string;
  practicalChallenge: string;
  prayer?: string;
  couplePrompt?: string;
  savedAt?: { toMillis?: () => number } | number | null;
}

// ─── Sync Session ────────────────────────────────────────────────────────────
export type SessionStatus = 'waiting_p1' | 'waiting_p2' | 'generating' | 'revealed' | 'ready';

export interface PlayerSubmission {
  mood: MoodId;
  text: string;
  submittedAt?: unknown;
  reaction?: ReactionEmoji;
}

export interface DevotionalSession {
  date: string;
  p1?: PlayerSubmission;
  p2?: PlayerSubmission;
  status: SessionStatus;
  result?: SyncDevotionalResult;
  generatedAt?: unknown;
}

// ─── API Payloads ────────────────────────────────────────────────────────────
export interface SoloDevotionalPayload {
  mode: 'solo';
  playerName: string;
  playerId: string;
  mood: MoodId;
  text: string;
  focus: FocusId;
  history: DevotionalHistoryEntry[];
}

export interface SyncDevotionalPayload {
  mode: 'sync';
  name1: string;
  name2: string;
  mood1: MoodId;
  text1: string;
  mood2: MoodId;
  text2: string;
  history: DevotionalHistoryEntry[];
}

export type DevotionalPayload = SoloDevotionalPayload | SyncDevotionalPayload;
