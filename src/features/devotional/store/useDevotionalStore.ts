/**
 * useDevotionalStore.ts
 *
 * Store Zustand para gerenciar o estado da feature Devocional do Casal.
 */

import { create } from 'zustand';
import type {
  MoodId,
  FocusId,
  SoloDevotionalResult,
  SyncDevotionalResult,
  DevotionalSession,
  DevotionalFavorite,
  DevotionalHistoryEntry,
  DevotionalHistoryEntry as HistoryEntry,
} from '../schema';
import {
  generateDevotional,
  fetchDevotionalHistory,
  saveDevotionalMeta,
  saveFavorite,
  removeFavorite,
  fetchFavorites,
  submitSyncEntry,
  triggerSyncGeneration,
  resetSyncSession,
  resetMySyncSubmission,
  getTodayDateString,
} from '../services/aiDevotionalService';

export type DevotionalMode = 'solo' | 'sync';
export type DevotionalStep =
  | 'mode-select'
  | 'mood-select'
  | 'text-input'
  | 'focus-select'
  | 'generating'
  | 'result'
  | 'sync-waiting'
  | 'sync-reveal'
  | 'history';

interface DevotionalState {
  // Modo e Navegação de Passos
  mode: DevotionalMode | null;
  step: DevotionalStep;

  // Entradas do Usuário
  selectedMood: MoodId | null;
  freeText: string;
  selectedFocus: FocusId | null;

  // Resultados
  soloResult: SoloDevotionalResult | null;
  syncResult: SyncDevotionalResult | null;

  // Sessão Sincronizada
  session: DevotionalSession | null;

  // Histórico e Favoritos
  favorites: DevotionalFavorite[];
  history: DevotionalHistoryEntry[];

  // Estados de Carregamento e Erro
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;

  // Toast Notificações
  toast: { id: string; text: string; type?: 'success' | 'love' | 'info' | 'error' } | null;
  showToast: (text: string, type?: 'success' | 'love' | 'info' | 'error') => void;
  clearToast: () => void;

  // Modificadores de Estado
  setMode: (mode: DevotionalMode) => void;
  setStep: (step: DevotionalStep) => void;
  setMood: (mood: MoodId) => void;
  setFreeText: (text: string) => void;
  setFocus: (focus: FocusId) => void;
  setSession: (session: DevotionalSession | null) => void;
  clearError: () => void;

  // Ações de Negócio
  generateSoloDevotional: (
    siteId: string,
    playerName: string,
    playerId: string
  ) => Promise<void>;
  submitSyncMood: (
    siteId: string,
    playerSlot: 'p1' | 'p2',
    partnerNames: { name1: string; name2: string }
  ) => Promise<void>;
  triggerSyncGeneration: (
    siteId: string,
    partnerNames: { name1: string; name2: string }
  ) => Promise<void>;
  resetSyncSession: (siteId: string) => Promise<void>;
  resetMySyncSubmission: (siteId: string, playerSlot: 'p1' | 'p2') => Promise<void>;

  loadHistory: (siteId: string, playerId: string) => Promise<void>;
  loadFavorites: (siteId: string, playerId: string) => Promise<void>;
  toggleFavorite: (siteId: string, playerId: string) => Promise<void>;
  removeFavoriteItem: (siteId: string, favoriteId: string) => Promise<void>;

  checkMidnightExpiration: () => boolean;
  handleModalOpen: () => void;
  handleModalClose: () => void;

  reset: () => void;
}

export const useDevotionalStore = create<DevotionalState>((set, get) => ({
  mode: null,
  step: 'mode-select',

  selectedMood: null,
  freeText: '',
  selectedFocus: null,

  soloResult: null,
  syncResult: null,

  session: null,

  favorites: [],
  history: [],

  isLoading: false,
  isGenerating: false,
  error: null,
  toast: null,

  showToast: (text, type = 'info') => {
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    set({ toast: { id, text, type } });
    setTimeout(() => {
      if (get().toast?.id === id) {
        set({ toast: null });
      }
    }, 3500);
  },
  clearToast: () => set({ toast: null }),

  setMode: (mode) => set({ mode, step: 'mood-select', error: null }),
  setStep: (step) => set({ step, error: null }),
  setMood: (mood) => set({ selectedMood: mood }),
  setFreeText: (text) => set({ freeText: text }),
  setFocus: (focus) => set({ selectedFocus: focus }),
  setSession: (session) => {
    set({ session });
    const today = getTodayDateString();
    if (session?.status === 'revealed' && session.result) {
      set({
        syncResult: { ...session.result, date: session.date || today },
        step: 'sync-reveal',
      });
    }
  },
  clearError: () => set({ error: null }),

  checkMidnightExpiration: () => {
    const today = getTodayDateString();
    const { soloResult, syncResult, session } = get();

    const isSoloExpired = Boolean(soloResult && soloResult.date && soloResult.date !== today);
    const isSyncExpired = Boolean(
      (syncResult && syncResult.date && syncResult.date !== today) ||
      (session && session.date && session.date !== today)
    );

    if (isSoloExpired || isSyncExpired) {
      set({
        soloResult: null,
        syncResult: null,
        session: null,
        selectedMood: null,
        freeText: '',
        selectedFocus: null,
        mode: null,
        step: 'mode-select',
      });
      return true;
    }
    return false;
  },

  handleModalOpen: () => {
    const today = getTodayDateString();
    const { soloResult, syncResult, session, checkMidnightExpiration } = get();

    // 1. Verifica se o dia virou (expira devocional do dia anterior)
    if (checkMidnightExpiration()) {
      return;
    }

    // 2. Verifica se existe um devocional de hoje concluído/aberto
    const hasTodaySolo = Boolean(
      soloResult && (!soloResult.date || soloResult.date === today)
    );
    const hasTodaySync = Boolean(
      (session && (!session.date || session.date === today) && session.status === 'revealed') ||
      (syncResult && (!syncResult.date || syncResult.date === today))
    );

    if (hasTodaySolo) {
      set({ mode: 'solo', step: 'result', error: null });
    } else if (hasTodaySync) {
      set({ mode: 'sync', step: 'sync-reveal', error: null });
    } else {
      // Se não tem devocional concluído hoje, volta sempre na tela inicial
      set({
        mode: null,
        step: 'mode-select',
        selectedMood: null,
        freeText: '',
        selectedFocus: null,
        error: null,
      });
    }
  },

  handleModalClose: () => {
    const today = getTodayDateString();
    const { soloResult, syncResult, session, checkMidnightExpiration } = get();

    if (checkMidnightExpiration()) {
      return;
    }

    const hasTodaySolo = Boolean(
      soloResult && (!soloResult.date || soloResult.date === today)
    );
    const hasTodaySync = Boolean(
      (session && (!session.date || session.date === today) && session.status === 'revealed') ||
      (syncResult && (!syncResult.date || syncResult.date === today))
    );

    if (hasTodaySolo) {
      set({ mode: 'solo', step: 'result', error: null });
    } else if (hasTodaySync) {
      set({ mode: 'sync', step: 'sync-reveal', error: null });
    } else {
      set({
        mode: null,
        step: 'mode-select',
        selectedMood: null,
        freeText: '',
        selectedFocus: null,
        error: null,
      });
    }
  },

  generateSoloDevotional: async (siteId, playerName, playerId) => {
    const { selectedMood, freeText, selectedFocus, history } = get();

    if (!selectedMood) {
      set({ error: 'Por favor, selecione como você está se sentindo.' });
      return;
    }

    set({ isGenerating: true, error: null, step: 'generating' });

    // Modo Mock Offline para testes locais
    if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
      setTimeout(() => {
        set({
          soloResult: {
            verse: 'O Senhor é o meu pastor; de nada terei falta. Em verdes pastagens me faz repousar e me conduz a águas tranquilas.',
            reference: 'Salmos 23:1-2',
            meditation: `Em momentos em que o coração se sente ${selectedMood}, Deus nos convida a descansar em Seu cuidado. Ele conhece cada pensamento e anseio seu, guiando seus passos com mansidão e renovando as forças dia após dia.`,
            reflectionQuestion: 'Onde você precisa permitir que a paz de Deus reine em sua vida hoje?',
            practicalChallenge: 'Tire 3 minutos agora para respirar fundo, orar em silêncio e agradecer por uma bênção recente na sua história.',
            prayer: 'Senhor meu Deus, coloco este dia diante de Ti. Acalma meus pensamentos, renova minhas forças e me lembra de que nunca estou sozinho(a). Que a Tua graça me guie em cada passo. Amém.',
            _meta: {
              book: 'Salmos',
              meditationAngle: 'descanso e provisão',
              challengeTheme: 'gratidão e oração',
            },
            date: getTodayDateString(),
          },
          step: 'result',
          isGenerating: false,
        });
      }, 1000);
      return;
    }

    try {
      const result = (await generateDevotional({
        mode: 'solo',
        playerName,
        playerId,
        mood: selectedMood,
        text: freeText,
        focus: selectedFocus || 'relacionamento',
        history,
      })) as SoloDevotionalResult;

      const today = getTodayDateString();

      // Salva no histórico anti-repetição
      if (result._meta) {
        const entry: HistoryEntry = {
          date: today,
          mood: selectedMood,
          reference: result.reference,
          book: result._meta.book,
          meditationAngle: result._meta.meditationAngle,
          challengeTheme: result._meta.challengeTheme,
        };
        await saveDevotionalMeta(siteId, playerId, entry);
        set((s) => ({ history: [entry, ...s.history].slice(0, 7) }));
      }

      set({
        soloResult: { ...result, date: today },
        step: 'result',
        isGenerating: false,
      });
    } catch (err: unknown) {
      console.error('Erro ao gerar devocional solo:', err);
      const msg = err instanceof Error ? err.message : String(err);
      set({
        error: msg || 'Ocorreu um erro ao preparar seu devocional.',
        isGenerating: false,
        step: 'focus-select',
      });
    }
  },

  submitSyncMood: async (siteId, playerSlot, partnerNames) => {
    const { selectedMood, freeText, history } = get();

    if (!selectedMood) {
      set({ error: 'Selecione como você está se sentindo antes de enviar.' });
      return;
    }

    set({ isLoading: true, error: null });

    // Modo Mock Offline para testes locais
    if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
      setTimeout(() => {
        set({
          syncResult: {
            verse: 'Acima de tudo, porém, revistam-se do amor, que é o elo perfeito.',
            reference: 'Colossenses 3:14',
            meditation: `Deus contempla o coração de ${partnerNames.name1} e ${partnerNames.name2} neste dia. Mesmo diante dos sentimentos e desafios cotidianos, o amor que une vocês é sustentado pela graça divina, trazendo cumplicidade e paz duradoura.`,
            reflectionQuestion: 'Como podemos nos apoiar e orar um pelo outro nas decisões desta semana?',
            practicalChallenge: 'Deem as mãos agora ou enviem uma mensagem dizendo o quanto são gratos pela vida um do outro.',
            couplePrompt: 'Sou grato(a) a Deus por ter você ao meu lado e caminharmos juntos.',
            prayer: `Pai celestial, abençoa a união de ${partnerNames.name1} e ${partnerNames.name2}. Fortalece o amor, a cumplicidade e o carinho mútuo. Que os laços que os unem sejam blindados pela Tua paz e sabedoria em todos os momentos. Amém.`,
            _meta: {
              book: 'Colossenses',
              meditationAngle: 'amor perfeito e união',
              challengeTheme: 'cumplicidade e afeto',
            },
          },
          step: 'sync-reveal',
          isLoading: false,
        });
      }, 1000);
      return;
    }

    try {
      await submitSyncEntry(
        siteId,
        playerSlot,
        selectedMood,
        freeText,
        partnerNames,
        history
      );
      set({ isLoading: false, step: 'sync-waiting' });
    } catch (err: unknown) {
      console.error('Erro ao enviar sentimento sincronizado:', err);
      const msg = err instanceof Error ? err.message : String(err);
      set({
        error: msg || 'Não foi possível enviar seu momento.',
        isLoading: false,
      });
    }
  },

  triggerSyncGeneration: async (siteId, partnerNames) => {
    const { history } = get();
    set({ isLoading: true, error: null });
    try {
      const result = await triggerSyncGeneration(siteId, partnerNames, history);
      const today = getTodayDateString();
      set({ syncResult: { ...result, date: today }, isLoading: false, step: 'sync-reveal' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({
        error: msg || 'Erro ao gerar devocional conjunto.',
        isLoading: false,
      });
    }
  },

  resetSyncSession: async (siteId) => {
    set({ isLoading: true, error: null });
    try {
      await resetSyncSession(siteId);
      set({
        session: null,
        syncResult: null,
        selectedMood: null,
        freeText: '',
        step: 'mode-select',
        isLoading: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({
        error: msg || 'Erro ao reiniciar o devocional de hoje.',
        isLoading: false,
      });
    }
  },

  resetMySyncSubmission: async (siteId, playerSlot) => {
    set({ isLoading: true, error: null });
    try {
      await resetMySyncSubmission(siteId, playerSlot);
      set({
        selectedMood: null,
        freeText: '',
        isLoading: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({
        error: msg || 'Erro ao resetar seu envio.',
        isLoading: false,
      });
    }
  },

  loadHistory: async (siteId, playerId) => {
    try {
      const history = await fetchDevotionalHistory(siteId, playerId);
      set({ history });
    } catch (err) {
      console.warn('Erro ao carregar histórico:', err);
    }
  },

  loadFavorites: async (siteId, playerId) => {
    try {
      const favorites = await fetchFavorites(siteId, playerId);
      set({ favorites });
    } catch (err) {
      console.warn('Erro ao carregar favoritos:', err);
    }
  },

  toggleFavorite: async (siteId, playerId) => {
    const { soloResult, syncResult, mode, selectedMood, favorites } = get();
    const currentResult = mode === 'solo' ? soloResult : syncResult;

    if (!currentResult) return;

    const today = getTodayDateString();
    const existing = favorites.find(
      (f) => f.reference === currentResult.reference
    );

    if (existing && existing.id) {
      // Remove dos favoritos
      try {
        await removeFavorite(siteId, existing.id);
        set((s) => ({
          favorites: s.favorites.filter((f) => f.id !== existing.id),
        }));
        get().showToast('Devocional removido dos favoritos.', 'info');
      } catch (err) {
        console.error('Erro ao remover favorito:', err);
        get().showToast('Erro ao remover favorito.', 'error');
      }
    } else {
      // Adiciona aos favoritos
      try {
        const newFav: Omit<DevotionalFavorite, 'id' | 'savedAt'> = {
          playerId,
          date: today,
          mood: selectedMood || 'grato',
          verse: currentResult.verse,
          reference: currentResult.reference,
          meditation: currentResult.meditation,
          reflectionQuestion: currentResult.reflectionQuestion,
          practicalChallenge: currentResult.practicalChallenge,
          prayer: currentResult.prayer,
          ...('couplePrompt' in currentResult && currentResult.couplePrompt
            ? { couplePrompt: currentResult.couplePrompt }
            : {}),
        };
        const id = await saveFavorite(siteId, newFav);
        set((s) => ({
          favorites: [{ ...newFav, id, savedAt: Date.now() }, ...s.favorites],
        }));
        get().showToast('Palavra guardada nos favoritos! ❤️', 'love');
      } catch (err) {
        console.error('Erro ao salvar favorito:', err);
        get().showToast('Não foi possível salvar nos favoritos.', 'error');
      }
    }
  },

  removeFavoriteItem: async (siteId, favoriteId) => {
    try {
      await removeFavorite(siteId, favoriteId);
      set((s) => ({
        favorites: s.favorites.filter((f) => f.id !== favoriteId),
      }));
    } catch (err) {
      console.error('Erro ao remover favorito:', err);
    }
  },

  reset: () =>
    set({
      mode: null,
      step: 'mode-select',
      selectedMood: null,
      freeText: '',
      selectedFocus: null,
      soloResult: null,
      syncResult: null,
      isGenerating: false,
      isLoading: false,
      error: null,
    }),
}));
