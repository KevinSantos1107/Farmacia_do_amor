/**
 * aiDevotionalService.ts
 *
 * Responsável por:
 *  1. Chamar a API Serverless /api/generate-devotional para geração com o Gemini.
 *  2. Gerenciar histórico anti-repetição no Firestore (sites/{siteId}/devotional_meta/{playerId}).
 *  3. Gerenciar favoritos no Firestore (sites/{siteId}/devotional_favorites).
 *  4. Gerenciar sessões do modo sincronizado (sites/{siteId}/devotional_sessions/{YYYY-MM-DD}).
 */

import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  deleteField,
} from 'firebase/firestore';
import { db } from '../../../services/firebase/config';
import { auth } from '../../../services/firebase/auth';
import type {
  DevotionalPayload,
  SoloDevotionalResult,
  SyncDevotionalResult,
  DevotionalHistoryEntry,
  DevotionalMetaDoc,
  DevotionalFavorite,
  DevotionalSession,
  MoodId,
  ReactionEmoji,
} from '../schema';

// ─────────────────────────────────────────────
// Helpers de Data
// ─────────────────────────────────────────────

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ─────────────────────────────────────────────
// Geração via Serverless API (/api/generate-devotional)
// ─────────────────────────────────────────────

export async function generateDevotional(
  payload: DevotionalPayload
): Promise<SoloDevotionalResult | SyncDevotionalResult> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Sessão não autenticada. Aguarde a conexão com o servidor.');
  }

  const token = await currentUser.getIdToken();

  const response = await fetch('/api/generate-devotional', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Sessão expirada ou não autorizada. Atualize a página.');
    }
    if (response.status === 429) {
      throw new Error('Limite de devocionais diários atingido. Tente novamente mais tarde.');
    }

    let serverMessage = '';
    try {
      const errJson = await response.json();
      if (errJson && typeof errJson === 'object' && typeof errJson.error === 'string') {
        serverMessage = errJson.error;
      }
    } catch {
      // Ignora erro de JSON
    }

    throw new Error(
      serverMessage || 'Não foi possível gerar o devocional no momento. Tente novamente.'
    );
  }

  return response.json();
}

// ─────────────────────────────────────────────
// Sistema Anti-Repetição (devotional_meta)
// ─────────────────────────────────────────────

/**
 * Busca o histórico recente (até 7 entradas) de um jogador para evitar repetições.
 */
export async function fetchDevotionalHistory(
  siteId: string,
  playerId: string
): Promise<DevotionalHistoryEntry[]> {
  try {
    const metaRef = doc(db, 'sites', siteId, 'devotional_meta', playerId);
    const snap = await getDoc(metaRef);
    if (!snap.exists()) return [];

    const data = snap.data() as DevotionalMetaDoc;
    return Array.isArray(data.history) ? data.history.slice(0, 7) : [];
  } catch (err) {
    console.warn('Erro ao carregar histórico devocional:', err);
    return [];
  }
}

/**
 * Salva a entrada mais recente no histórico do jogador, mantendo no máximo 7 entradas.
 */
export async function saveDevotionalMeta(
  siteId: string,
  playerId: string,
  entry: DevotionalHistoryEntry
): Promise<void> {
  try {
    const existing = await fetchDevotionalHistory(siteId, playerId);
    // Remove duplicatas por data/referência e adiciona no início
    const filtered = existing.filter(
      (h) => h.reference !== entry.reference && h.date !== entry.date
    );
    const updated = [entry, ...filtered].slice(0, 7);

    const metaRef = doc(db, 'sites', siteId, 'devotional_meta', playerId);
    await setDoc(metaRef, { history: updated }, { merge: true });
  } catch (err) {
    console.warn('Erro ao salvar meta devocional:', err);
  }
}

// ─────────────────────────────────────────────
// Favoritos (devotional_favorites)
// ─────────────────────────────────────────────

/**
 * Salva um devocional completo nos favoritos.
 */
export async function saveFavorite(
  siteId: string,
  favorite: Omit<DevotionalFavorite, 'id' | 'savedAt'>
): Promise<string> {
  const collRef = collection(db, 'sites', siteId, 'devotional_favorites');

  // Remove qualquer propriedade undefined para evitar erro "Unsupported field value: undefined" do Firestore
  const cleanData: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(favorite)) {
    if (val !== undefined) {
      cleanData[key] = val;
    }
  }

  const docRef = await addDoc(collRef, {
    ...cleanData,
    savedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Remove um favorito pelo ID do documento.
 */
export async function removeFavorite(siteId: string, favoriteId: string): Promise<void> {
  const docRef = doc(db, 'sites', siteId, 'devotional_favorites', favoriteId);
  await deleteDoc(docRef);
}

/**
 * Lista todos os favoritos de um jogador.
 */
export async function fetchFavorites(
  siteId: string,
  playerId: string
): Promise<DevotionalFavorite[]> {
  try {
    const collRef = collection(db, 'sites', siteId, 'devotional_favorites');
    const q = query(collRef, where('playerId', '==', playerId));
    const snap = await getDocs(q);

    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        playerId: data.playerId,
        date: data.date,
        mood: data.mood,
        verse: data.verse,
        reference: data.reference,
        meditation: data.meditation,
        reflectionQuestion: data.reflectionQuestion,
        practicalChallenge: data.practicalChallenge,
        couplePrompt: data.couplePrompt,
        savedAt: data.savedAt,
      } as DevotionalFavorite;
    });
  } catch (err) {
    console.warn('Erro ao buscar favoritos:', err);
    return [];
  }
}

// ─────────────────────────────────────────────
// Modo Sincronizado (devotional_sessions)
// ─────────────────────────────────────────────

/**
 * Busca a sessão de hoje (se existir).
 */
export async function getTodaySession(
  siteId: string,
  date = getTodayDateString()
): Promise<DevotionalSession | null> {
  try {
    const sessionRef = doc(db, 'sites', siteId, 'devotional_sessions', date);
    const snap = await getDoc(sessionRef);
    if (!snap.exists()) return null;
    return snap.data() as DevotionalSession;
  } catch (err) {
    console.warn('Erro ao buscar sessão de hoje:', err);
    return null;
  }
}

/**
 * Escuta atualizações em tempo real da sessão do dia.
 */
export function subscribeToSession(
  siteId: string,
  date: string,
  callback: (session: DevotionalSession | null) => void
): () => void {
  const sessionRef = doc(db, 'sites', siteId, 'devotional_sessions', date);
  return onSnapshot(
    sessionRef,
    (snap) => {
      if (!snap.exists()) {
        callback(null);
      } else {
        callback(snap.data() as DevotionalSession);
      }
    },
    (err) => {
      console.warn('Erro no listener da sessão sincronizada:', err);
    }
  );
}

/**
 * Envia o sentimento do jogador para a sessão sincronizada de hoje.
 * Se o outro parceiro já enviou, o segundo que envia dispara a IA e fecha como 'revealed'.
 */
export async function submitSyncEntry(
  siteId: string,
  playerSlot: 'p1' | 'p2',
  mood: MoodId,
  text: string,
  partnerNames: { name1: string; name2: string },
  coupleHistory: DevotionalHistoryEntry[] = []
): Promise<void> {
  const date = getTodayDateString();
  const sessionRef = doc(db, 'sites', siteId, 'devotional_sessions', date);
  const snap = await getDoc(sessionRef);

  const submission = {
    mood,
    text,
    submittedAt: serverTimestamp(),
  };

  if (!snap.exists()) {
    // Primeiro jogador enviando: cria o documento aguardando o outro
    const initialSession: DevotionalSession = {
      date,
      [playerSlot]: submission,
      status: playerSlot === 'p1' ? 'waiting_p2' : 'waiting_p1',
    };
    await setDoc(sessionRef, initialSession);
    return;
  }

  const existing = snap.data() as DevotionalSession;
  const otherSlot: 'p1' | 'p2' = playerSlot === 'p1' ? 'p2' : 'p1';
  const otherData = existing[otherSlot];

  if (!otherData) {
    // O outro ainda não enviou: atualiza o envio deste jogador
    await updateDoc(sessionRef, {
      [playerSlot]: submission,
      status: playerSlot === 'p1' ? 'waiting_p2' : 'waiting_p1',
    });
    return;
  }

  // Ambos enviaram! Este é o segundo jogador.
  // 1. Marca como "generating" para avisar o parceiro na tela de espera
  await updateDoc(sessionRef, {
    [playerSlot]: submission,
    status: 'generating',
  });

  // 2. Chama a IA para gerar o devocional conjunto
  try {
    const p1Data = playerSlot === 'p1' ? submission : otherData;
    const p2Data = playerSlot === 'p2' ? submission : otherData;

    const result = (await generateDevotional({
      mode: 'sync',
      name1: partnerNames.name1,
      name2: partnerNames.name2,
      mood1: p1Data.mood,
      text1: p1Data.text,
      mood2: p2Data.mood,
      text2: p2Data.text,
      history: coupleHistory,
    })) as SyncDevotionalResult;

    // 3. Atualiza a sessão com o resultado e status 'revealed'
    await updateDoc(sessionRef, {
      status: 'revealed',
      result,
      generatedAt: serverTimestamp(),
    });

    // 4. Salva no meta anti-repetição para ambos
    if (result._meta) {
      const historyEntry: DevotionalHistoryEntry = {
        date,
        mood: `${p1Data.mood} + ${p2Data.mood}`,
        reference: result.reference,
        book: result._meta.book,
        meditationAngle: result._meta.meditationAngle,
        challengeTheme: result._meta.challengeTheme,
      };
      await Promise.all([
        saveDevotionalMeta(siteId, 'p1', historyEntry),
        saveDevotionalMeta(siteId, 'p2', historyEntry),
      ]);
    }
  } catch (err) {
    console.error('Falha ao gerar devocional conjunto:', err);
    // Como ambos já submeteram seus dados, mantemos o status como "ready" para que qualquer um possa clicar em "Revelar"
    await updateDoc(sessionRef, {
      status: 'ready',
    });
    throw err;
  }
}

/**
 * Dispara ou tenta novamente a geração do devocional conjunto
 * quando ambos os parceiros já enviaram seus momentos.
 */
export async function triggerSyncGeneration(
  siteId: string,
  partnerNames: { name1: string; name2: string },
  coupleHistory: DevotionalHistoryEntry[] = []
): Promise<SyncDevotionalResult> {
  const date = getTodayDateString();
  const sessionRef = doc(db, 'sites', siteId, 'devotional_sessions', date);
  const snap = await getDoc(sessionRef);

  if (!snap.exists()) {
    throw new Error('Nenhuma sessão encontrada para a data de hoje.');
  }

  const session = snap.data() as DevotionalSession;
  if (!session.p1 || !session.p2) {
    throw new Error('Ambos os parceiros precisam preencher seus sentimentos primeiro.');
  }

  // Se já tiver sido revelado, retorna o resultado existente
  if (session.status === 'revealed' && session.result) {
    return session.result;
  }

  // 1. Marca como generating para notificar os dois clientes
  await updateDoc(sessionRef, { status: 'generating' });

  try {
    const result = (await generateDevotional({
      mode: 'sync',
      name1: partnerNames.name1,
      name2: partnerNames.name2,
      mood1: session.p1.mood,
      text1: session.p1.text,
      mood2: session.p2.mood,
      text2: session.p2.text,
      history: coupleHistory,
    })) as SyncDevotionalResult;

    // 2. Salva o resultado e marca como revealed
    await updateDoc(sessionRef, {
      status: 'revealed',
      result,
      generatedAt: serverTimestamp(),
    });

    // 3. Salva no histórico anti-repetição de ambos
    if (result._meta) {
      const historyEntry: DevotionalHistoryEntry = {
        date,
        mood: `${session.p1.mood} + ${session.p2.mood}`,
        reference: result.reference,
        book: result._meta.book,
        meditationAngle: result._meta.meditationAngle,
        challengeTheme: result._meta.challengeTheme,
      };
      await Promise.all([
        saveDevotionalMeta(siteId, 'p1', historyEntry),
        saveDevotionalMeta(siteId, 'p2', historyEntry),
      ]);
    }

    return result;
  } catch (err) {
    console.error('Falha ao gerar devocional conjunto no trigger:', err);
    await updateDoc(sessionRef, { status: 'ready' });
    throw err;
  }
}

/**
 * Reinicia completamente a sessão sincronizada de hoje.
 */
export async function resetSyncSession(siteId: string): Promise<void> {
  const date = getTodayDateString();
  const sessionRef = doc(db, 'sites', siteId, 'devotional_sessions', date);
  await deleteDoc(sessionRef);
}

/**
 * Permite ao jogador limpar sua submissão para editar seu sentimento.
 */
export async function resetMySyncSubmission(
  siteId: string,
  playerSlot: 'p1' | 'p2'
): Promise<void> {
  const date = getTodayDateString();
  const sessionRef = doc(db, 'sites', siteId, 'devotional_sessions', date);
  const snap = await getDoc(sessionRef);
  if (!snap.exists()) return;

  const data = snap.data() as DevotionalSession;
  const otherSlot: 'p1' | 'p2' = playerSlot === 'p1' ? 'p2' : 'p1';

  if (!data[otherSlot]) {
    await deleteDoc(sessionRef);
  } else {
    await updateDoc(sessionRef, {
      [playerSlot]: deleteField(),
      status: otherSlot === 'p1' ? 'waiting_p2' : 'waiting_p1',
    });
  }
}

/**
 * Salva a reação do jogador após o reveal no modo sincronizado.
 */
export async function saveReaction(
  siteId: string,
  date: string,
  playerSlot: 'p1' | 'p2',
  reaction: ReactionEmoji
): Promise<void> {
  const sessionRef = doc(db, 'sites', siteId, 'devotional_sessions', date);
  await updateDoc(sessionRef, {
    [`${playerSlot}.reaction`]: reaction,
  });
}
