/**
 * aiDevotionalService.test.ts
 *
 * Testes unitários para o serviço de devocional e funções auxiliares da API.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateDevotional,
  getTodayDateString,
} from './aiDevotionalService';
import {
  validatePayload,
  checkRateLimit,
  buildSoloPrompt,
  buildSyncPrompt,
  RATE_LIMIT_MINUTE_MAX,
  RATE_LIMIT_DAY_MAX,
} from '../../../../api/generate-devotional';
import { auth } from '../../../services/firebase/auth';

vi.mock('../../../services/firebase/auth', () => ({
  auth: {
    currentUser: null,
  },
}));

describe('Validação de Payloads de Devocional (validatePayload)', () => {
  it('deve aceitar um payload solo válido', () => {
    const payload = {
      mode: 'solo',
      playerName: 'Kevin',
      playerId: 'p1',
      mood: 'grato',
      text: 'Hoje foi um dia abençoado',
      focus: 'o relacionamento',
      history: [
        {
          date: '2026-10-19',
          mood: 'ansioso',
          reference: 'Filipenses 4:6',
          book: 'Filipenses',
          meditationAngle: 'paz que excede',
          challengeTheme: 'gratidão',
        },
      ],
    };

    const res = validatePayload(payload);
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.data.mode).toBe('solo');
      expect((res.data as { playerName: string }).playerName).toBe('Kevin');
      expect((res.data as { mood: string }).mood).toBe('grato');
      expect(res.data.history).toHaveLength(1);
    }
  });

  it('deve rejeitar payload solo sem playerName', () => {
    const res = validatePayload({
      mode: 'solo',
      playerName: '',
      playerId: 'p1',
      mood: 'alegre',
    });
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.error).toContain('nome');
    }
  });

  it('deve rejeitar payload solo sem mood', () => {
    const res = validatePayload({
      mode: 'solo',
      playerName: 'Kevin',
      playerId: 'p1',
      mood: '',
    });
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.error).toContain('mood');
    }
  });

  it('deve aceitar um payload sincronizado (sync) válido', () => {
    const payload = {
      mode: 'sync',
      name1: 'Kevin',
      name2: 'Iara',
      mood1: 'grato',
      text1: 'Obrigado por estarmos juntos',
      mood2: 'ansioso',
      text2: 'Preocupada com a faculdade',
      history: [],
    };

    const res = validatePayload(payload);
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.data.mode).toBe('sync');
      expect((res.data as { name1: string }).name1).toBe('Kevin');
      expect((res.data as { name2: string }).name2).toBe('Iara');
    }
  });

  it('deve rejeitar payload sync faltando um dos nomes', () => {
    const res = validatePayload({
      mode: 'sync',
      name1: 'Kevin',
      name2: '',
      mood1: 'grato',
      mood2: 'alegre',
    });
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.error).toContain('nomes do casal');
    }
  });

  it('deve rejeitar payload com modo inválido', () => {
    const res = validatePayload({ mode: 'invalido' });
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.error).toContain('Modo inválido');
    }
  });

  it('deve truncar histórico em no máximo 7 itens', () => {
    const history8 = Array.from({ length: 10 }, (_, i) => ({
      date: `2026-10-${10 + i}`,
      mood: 'alegre',
      reference: `Salmos ${i + 1}:1`,
      book: 'Salmos',
      meditationAngle: 'alegria',
      challengeTheme: 'louvor',
    }));

    const res = validatePayload({
      mode: 'solo',
      playerName: 'Kevin',
      playerId: 'p1',
      mood: 'grato',
      history: history8,
    });

    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.data.history).toHaveLength(7);
    }
  });
});

describe('Rate Limiting de Devocionais (checkRateLimit)', () => {
  it('deve permitir até 5 requisições por minuto e bloquear a 6ª', () => {
    const localStore = new Map();
    const uid = 'devotional-user-1';
    const now = 1000000;

    for (let i = 0; i < RATE_LIMIT_MINUTE_MAX; i++) {
      expect(checkRateLimit(uid, now, localStore).allowed).toBe(true);
    }

    const blocked = checkRateLimit(uid, now + 500, localStore);
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toContain('Limite de requisições por minuto');
  });

  it('deve permitir novamente após 1 minuto', () => {
    const localStore = new Map();
    const uid = 'devotional-user-2';
    const now = 1000000;

    for (let i = 0; i < RATE_LIMIT_MINUTE_MAX; i++) {
      checkRateLimit(uid, now, localStore);
    }

    const afterMinute = checkRateLimit(uid, now + 65 * 1000, localStore);
    expect(afterMinute.allowed).toBe(true);
  });

  it('deve bloquear após o limite diário de 30 requisições', () => {
    const localStore = new Map();
    const uid = 'devotional-user-3';
    let time = 1000000;

    for (let i = 0; i < RATE_LIMIT_DAY_MAX; i++) {
      time += 70 * 1000;
      expect(checkRateLimit(uid, time, localStore).allowed).toBe(true);
    }

    time += 70 * 1000;
    const blockedDaily = checkRateLimit(uid, time, localStore);
    expect(blockedDaily.allowed).toBe(false);
    expect(blockedDaily.reason).toContain('Limite diário');
  });
});

describe('Construção de Prompts', () => {
  it('buildSoloPrompt deve incluir nome, humor, foco e regras de anti-repetição se houver histórico', () => {
    const prompt = buildSoloPrompt({
      mode: 'solo',
      playerName: 'Iara',
      playerId: 'p2',
      mood: 'ansioso',
      text: 'Pensando no TCC',
      focus: 'a fé',
      history: [
        {
          date: '2026-10-19',
          mood: 'ansioso',
          reference: 'Filipenses 4:6',
          book: 'Filipenses',
          meditationAngle: 'paz',
          challengeTheme: 'oração',
        },
      ],
    });

    expect(prompt).toContain('Iara');
    expect(prompt).toContain('ansioso');
    expect(prompt).toContain('a fé');
    expect(prompt).toContain('HISTÓRICO RECENTE');
    expect(prompt).toContain('Filipenses 4:6');
    expect(prompt).toContain('Regras obrigatórias');
  });

  it('buildSyncPrompt deve incluir ambos os nomes, humores e falar com o casal', () => {
    const prompt = buildSyncPrompt({
      mode: 'sync',
      name1: 'Kevin',
      name2: 'Iara',
      mood1: 'grato',
      text1: 'Obrigado por mais um dia',
      mood2: 'cansado',
      text2: 'Dia puxado',
      history: [],
    });

    expect(prompt).toContain('Kevin');
    expect(prompt).toContain('Iara');
    expect(prompt).toContain('grato');
    expect(prompt).toContain('cansado');
    expect(prompt).toContain('COM O CASAL como unidade');
  });
});

describe('Cliente Frontend (generateDevotional)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve lançar erro se o usuário não estiver autenticado', async () => {
    (auth as { currentUser: unknown }).currentUser = null;

    await expect(
      generateDevotional({
        mode: 'solo',
        playerName: 'Kevin',
        playerId: 'p1',
        mood: 'grato',
        text: '',
        focus: 'relacionamento',
        history: [],
      })
    ).rejects.toThrow('Sessão não autenticada');
  });

  it('deve enviar requisição POST com Bearer token e retornar dados em 200', async () => {
    const mockToken = vi.fn().mockResolvedValue('token-123');
    (auth as { currentUser: unknown }).currentUser = {
      getIdToken: mockToken,
    };

    const mockDevotional = {
      verse: 'O Senhor é o meu pastor; de nada terei falta.',
      reference: 'Salmos 23:1',
      meditation: 'Uma meditação calorosa.',
      reflectionQuestion: 'Como você confia hoje?',
      practicalChallenge: 'Ore agora.',
      journalPrompts: ['P1', 'P2'],
      _meta: {
        book: 'Salmos',
        meditationAngle: 'provisão divina',
        challengeTheme: 'confiança',
      },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockDevotional,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateDevotional({
      mode: 'solo',
      playerName: 'Kevin',
      playerId: 'p1',
      mood: 'grato',
      text: '',
      focus: 'relacionamento',
      history: [],
    });

    expect(mockToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/generate-devotional',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123',
        },
      })
    );
    expect(result).toEqual(mockDevotional);
  });

  it('deve formatar a data de hoje no formato YYYY-MM-DD', () => {
    const date = getTodayDateString();
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
