import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks do Firebase ────────────────────────────────────────────────────────

const { mockAuth, mockDb, mockDoc, mockGetDoc, mockSetDoc, mockServerTimestamp } = vi.hoisted(() => {
  return {
    mockAuth: {
      currentUser: null as { uid: string } | null,
      onAuthStateChanged: vi.fn(),
    },
    mockDb: { _id: 'mock-db' },
    mockDoc: vi.fn((_db: unknown, collection: string, id: string) => ({
      collection,
      id,
      path: `${collection}/${id}`,
    })),
    mockGetDoc: vi.fn(),
    mockSetDoc: vi.fn(),
    mockServerTimestamp: vi.fn(() => ({ _type: 'serverTimestamp' })),
  };
});

vi.mock('../firebase/config', () => ({
  auth: mockAuth,
  db: mockDb,
}));

vi.mock('firebase/firestore', () => ({
  doc: mockDoc,
  getDoc: mockGetDoc,
  setDoc: mockSetDoc,
  serverTimestamp: mockServerTimestamp,
}));

// Importações dos módulos testados
import { recordDocId, waitForAuth } from './common';
import { getRecord, saveRecordIfBetter } from './simple';
import { getWordRecord, saveWordGameResult } from './word';
import { getQuizRecord, saveQuizRecordIfBetter } from './quiz';
import { getMemoryRecord, saveMemoryRecordIfBetter } from './memory';
import { getSyncRecord, saveSyncRecordIfBetter } from './sync';

describe('recordDocId — protege contra alteração no formato de chaves de documentos do Firestore', () => {
  it('gera id no formato exato "jogo_jogador"', () => {
    expect(recordDocId('snake', 'kevin')).toBe('snake_kevin');
    expect(recordDocId('word', 'iara')).toBe('word_iara');
    expect(recordDocId('quiz', 'snake_kevin')).toBe('quiz_snake_kevin');
    expect(recordDocId('sync', 'jogador1')).toBe('sync_jogador1');
  });
});

describe('waitForAuth — protege a sincronização com o estado de inicialização do Firebase Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.currentUser = null;
  });

  it('resolve imediatamente quando auth.currentUser já existe', async () => {
    mockAuth.currentUser = { uid: 'user-123' };
    let resolved = false;

    await waitForAuth().then(() => {
      resolved = true;
    });

    expect(resolved).toBe(true);
    expect(mockAuth.onAuthStateChanged).not.toHaveBeenCalled();
  });

  it('resolve via onAuthStateChanged quando o listener detecta login do usuário', async () => {
    let authCallback: ((user: { uid: string } | null) => void) | undefined;
    const unsubMock = vi.fn();

    mockAuth.onAuthStateChanged.mockImplementation((cb: (user: { uid: string } | null) => void) => {
      authCallback = cb;
      return unsubMock;
    });

    const promise = waitForAuth();

    // Simula disparo do callback do Firebase Auth
    expect(authCallback).toBeDefined();
    authCallback?.({ uid: 'logged-in-user' });

    await promise;
    expect(unsubMock).toHaveBeenCalled();
  });

  it('resolve após timeout de 5 segundos se o auth não inicializar a tempo', async () => {
    vi.useFakeTimers();
    mockAuth.onAuthStateChanged.mockReturnValue(vi.fn());

    let resolved = false;
    const promise = waitForAuth().then(() => {
      resolved = true;
    });

    expect(resolved).toBe(false);
    vi.advanceTimersByTime(5000);
    await promise;

    expect(resolved).toBe(true);
    vi.useRealTimers();
  });
});

describe('getRecord & saveRecordIfBetter — protege a leitura e gravação de jogos simples (snake/quiz)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.currentUser = { uid: 'test-user' };
  });

  it('getRecord retorna null para jogador vazio sem chamar o Firestore', async () => {
    const res = await getRecord('snake', '');
    expect(res).toBeNull();
    expect(mockGetDoc).not.toHaveBeenCalled();
    expect(mockDoc).not.toHaveBeenCalled();
  });

  it('getRecord retorna 0 quando o documento não existe no Firestore', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => undefined,
    });

    const res = await getRecord('snake', 'kevin');
    expect(res).toBe(0);
    expect(mockDoc).toHaveBeenCalledWith(mockDb, 'game_records', 'snake_kevin');
  });

  it('getRecord retorna o score quando o documento existe', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ score: 42 }),
    });

    const res = await getRecord('snake', 'kevin');
    expect(res).toBe(42);
  });

  it('getRecord captura erro, faz console.error e retorna null', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetDoc.mockRejectedValueOnce(new Error('Firestore network error'));

    const res = await getRecord('snake', 'kevin');
    expect(res).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith('Erro ao ler recorde:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('saveRecordIfBetter grava e retorna true se o novo score for maior que o atual', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ score: 30 }),
    });

    const updated = await saveRecordIfBetter('snake', 'kevin', 50);

    expect(updated).toBe(true);
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'snake_kevin' }),
      expect.objectContaining({
        game: 'snake',
        player: 'kevin',
        score: 50,
      }),
      { merge: true }
    );
  });

  it('saveRecordIfBetter não grava e retorna false se o score for menor ou igual', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ score: 50 }),
    });

    const updatedEqual = await saveRecordIfBetter('snake', 'kevin', 50);
    expect(updatedEqual).toBe(false);

    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ score: 50 }),
    });

    const updatedLower = await saveRecordIfBetter('snake', 'kevin', 40);
    expect(updatedLower).toBe(false);
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('saveRecordIfBetter grava pontuação se o registro não existia previamente', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => undefined,
    });

    const updated = await saveRecordIfBetter('snake', 'kevin', 10);
    expect(updated).toBe(true);
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'snake_kevin' }),
      expect.objectContaining({ score: 10 }),
      { merge: true }
    );
  });
});

describe('word — protege a persistência de estatísticas acumulativas do jogo de palavras', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.currentUser = { uid: 'test-user' };
  });

  it('utiliza o id de documento no formato "word_jogador"', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ score: 100, wins: 5 }),
    });

    await getWordRecord('iara');
    expect(mockDoc).toHaveBeenCalledWith(mockDb, 'game_records', 'word_iara');
  });

  it('saveWordGameResult acumula score, vitórias e streak em documento existente', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        score: 100,
        gamesPlayed: 10,
        wins: 6,
        bestStreak: 3,
      }),
    });

    await saveWordGameResult('iara', 20, true, 4, 4, [1, 2, 1, 1, 1, 0]);

    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'word_iara' }),
      expect.objectContaining({
        game: 'word',
        player: 'iara',
        score: 120,
        gamesPlayed: 11,
        wins: 7,
        streak: 4,
        bestStreak: 4,
      }),
      { merge: true }
    );
  });
});

describe('quiz — protege a gravação e ranking de score e combo do Quiz', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.currentUser = { uid: 'test-user' };
  });

  it('utiliza o id no formato "quiz_jogador"', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ score: 80, highestCombo: 4 }),
    });

    await getQuizRecord('kevin');
    expect(mockDoc).toHaveBeenCalledWith(mockDb, 'game_records', 'quiz_kevin');
  });

  it('grava quando o novo score for maior, mesmo que o combo não seja', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ score: 50, highestCombo: 5 }),
    });

    const updated = await saveQuizRecordIfBetter('kevin', 80, 3);
    expect(updated).toBe(true);
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'quiz_kevin' }),
      expect.objectContaining({ score: 80 }),
      { merge: true }
    );
  });

  it('grava quando o novo combo for maior, mesmo que o score não seja', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ score: 100, highestCombo: 5 }),
    });

    const updated = await saveQuizRecordIfBetter('kevin', 90, 8);
    expect(updated).toBe(true);
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'quiz_kevin' }),
      expect.objectContaining({ highestCombo: 8 }),
      { merge: true }
    );
  });

  it('não grava se nem score nem combo forem melhores', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ score: 100, highestCombo: 5 }),
    });

    const updated = await saveQuizRecordIfBetter('kevin', 90, 4);
    expect(updated).toBe(false);
    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});

describe('memory — protege a gravação de recordes do jogo da memória por dificuldade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.currentUser = { uid: 'test-user' };
  });

  it('utiliza o formato de documento "memory_jogador"', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ score: 500 }),
    });

    await getMemoryRecord('kevin');
    expect(mockDoc).toHaveBeenCalledWith(mockDb, 'game_records', 'memory_kevin');
  });

  it('grava quando o score for melhor que o recorde global', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ score: 300, bestTime: 45, gamesPlayed: 2 }),
    });

    const updated = await saveMemoryRecordIfBetter('kevin', 400, 40, 'medium', 5);
    expect(updated).toBe(true);
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'memory_kevin' }),
      expect.objectContaining({
        game: 'memory',
        player: 'kevin',
        score: 400,
        bestTime: 40,
        bestScoreLevel: 'medium',
      }),
      { merge: true }
    );
  });
});

describe('sync — protege o formato fixo "sync_couple" e os critérios de melhoria no Sincronia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.currentUser = { uid: 'test-user' };
  });

  it('utiliza o id fixo "sync_couple"', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ bestSession: 10, bestPart: 3, maxStreak: 4 }),
    });

    await getSyncRecord();
    expect(mockDoc).toHaveBeenCalledWith(mockDb, 'game_records', 'sync_couple');
  });

  it('grava quando qualquer métrica melhora (menor session, menor part ou maior streak)', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ bestSession: 10, bestPart: 3, maxStreak: 4 }),
    });

    // Melhora session (menor é melhor)
    const updated = await saveSyncRecordIfBetter(8, 4, 3);
    expect(updated).toBe(true);
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sync_couple' }),
      expect.objectContaining({ bestSession: 8 }),
      { merge: true }
    );
  });

  it('não grava quando nenhuma métrica melhora', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ bestSession: 5, bestPart: 2, maxStreak: 10 }),
    });

    const updated = await saveSyncRecordIfBetter(6, 3, 8);
    expect(updated).toBe(false);
    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});
