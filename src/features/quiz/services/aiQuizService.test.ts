import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isValidRawQuestion,
  generateQuestionsFromGemini,
  type CoupleStoryData,
} from './aiQuizService';
import {
  validateStoryData,
  checkRateLimit,
  buildPrompt,
  MAX_FIELD_LENGTH,
  MAX_TOTAL_BODY_LENGTH,
  RATE_LIMIT_MINUTE_MAX,
  RATE_LIMIT_DAY_MAX,
} from '../../../../api/generate-quiz';
import { auth } from '../../../services/firebase/auth';

// ─────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────

vi.mock('../../../services/firebase/auth', () => ({
  auth: {
    currentUser: null,
  },
}));

describe('Validação de Perguntas de Quiz (isValidRawQuestion)', () => {
  it('deve retornar true para uma pergunta válida com 4 opções e correctOptionId correspondente', () => {
    const valid = {
      question: 'Onde nos conhecemos pela primeira vez?',
      options: [
        { id: 'opt-a', text: 'Na faculdade' },
        { id: 'opt-b', text: 'No parque' },
        { id: 'opt-c', text: 'Na cafeteria' },
        { id: 'opt-d', text: 'Pela internet' },
      ],
      correctOptionId: 'opt-c',
    };

    expect(isValidRawQuestion(valid)).toBe(true);
  });

  it('deve retornar true para uma pergunta com 2 opções válidas', () => {
    const valid = {
      question: 'Quem disse "eu te amo" primeiro?',
      options: [
        { id: 'opt-a', text: 'Kevin' },
        { id: 'opt-b', text: 'Iara' },
      ],
      correctOptionId: 'opt-a',
    };

    expect(isValidRawQuestion(valid)).toBe(true);
  });

  it('deve rejeitar se o texto da pergunta for vazio ou apenas espaços', () => {
    const invalid = {
      question: '   ',
      options: [
        { id: 'opt-a', text: 'A' },
        { id: 'opt-b', text: 'B' },
      ],
      correctOptionId: 'opt-a',
    };

    expect(isValidRawQuestion(invalid)).toBe(false);
  });

  it('deve rejeitar se o valor de entrada for nulo, indefinido ou primitivo', () => {
    expect(isValidRawQuestion(null)).toBe(false);
    expect(isValidRawQuestion(undefined)).toBe(false);
    expect(isValidRawQuestion('pergunta')).toBe(false);
    expect(isValidRawQuestion(123)).toBe(false);
  });

  it('deve rejeitar se tiver menos de 2 opções', () => {
    const invalid = {
      question: 'Qual a nossa cor favorita?',
      options: [{ id: 'opt-a', text: 'Azul' }],
      correctOptionId: 'opt-a',
    };

    expect(isValidRawQuestion(invalid)).toBe(false);
  });

  it('deve rejeitar se alguma opção não tiver id ou tiver texto vazio', () => {
    const invalidOptMissingText = {
      question: 'Onde fomos viajar?',
      options: [
        { id: 'opt-a', text: 'Praia' },
        { id: 'opt-b', text: '   ' },
      ],
      correctOptionId: 'opt-a',
    };
    expect(isValidRawQuestion(invalidOptMissingText)).toBe(false);

    const invalidOptMissingId = {
      question: 'Onde fomos viajar?',
      options: [
        { id: 'opt-a', text: 'Praia' },
        { id: '', text: 'Montanha' },
      ],
      correctOptionId: 'opt-a',
    };
    expect(isValidRawQuestion(invalidOptMissingId)).toBe(false);
  });

  it('deve rejeitar se correctOptionId não coincidir com nenhuma das opções', () => {
    const invalid = {
      question: 'Qual o ano do primeiro encontro?',
      options: [
        { id: 'opt-a', text: '2020' },
        { id: 'opt-b', text: '2021' },
      ],
      correctOptionId: 'opt-inexistente',
    };

    expect(isValidRawQuestion(invalid)).toBe(false);
  });
});

describe('Validação de Dados e Limites de Tamanho (validateStoryData)', () => {
  const baseValidData: CoupleStoryData = {
    names: 'Kevin & Iara',
    dates: '12 de Junho de 2021',
    places: 'Café Central, Parque Ibirapuera',
    phrases: 'Meu bem',
    media: 'Coldplay - Yellow',
    food: 'Pizza marguerita',
    memories: 'Viagem para a praia',
    other: 'Gostamos de cozinhar juntos aos domingos',
  };

  it('deve aceitar dados válidos com names e campos opcionais dentro do limite', () => {
    const result = validateStoryData(baseValidData);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.names).toBe('Kevin & Iara');
      expect(result.data.dates).toBe('12 de Junho de 2021');
    }
  });

  it('deve rejeitar se o corpo for nulo ou array', () => {
    expect(validateStoryData(null).valid).toBe(false);
    expect(validateStoryData([]).valid).toBe(false);
    expect(validateStoryData('dados').valid).toBe(false);
  });

  it('deve rejeitar se o campo obrigatório "names" estiver ausente ou vazio', () => {
    const resultMissing = validateStoryData({ ...baseValidData, names: '' });
    expect(resultMissing.valid).toBe(false);
    if (!resultMissing.valid) {
      expect(resultMissing.error).toContain('"names"');
    }

    const resultSpaces = validateStoryData({ ...baseValidData, names: '   ' });
    expect(resultSpaces.valid).toBe(false);
  });

  it('deve rejeitar se o campo "names" exceder o limite de 2000 caracteres', () => {
    const longNames = 'A'.repeat(MAX_FIELD_LENGTH + 1);
    const result = validateStoryData({ ...baseValidData, names: longNames });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('excede o limite de 2000 caracteres');
    }
  });

  it('deve rejeitar se qualquer campo opcional exceder o limite de 2000 caracteres', () => {
    const longPlaces = 'L'.repeat(MAX_FIELD_LENGTH + 1);
    const result = validateStoryData({ ...baseValidData, places: longPlaces });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('"places"');
      expect(result.error).toContain('2000 caracteres');
    }
  });

  it('deve rejeitar se algum campo não for string', () => {
    const invalidType = { ...baseValidData, food: 12345 };
    const result = validateStoryData(invalidType);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('"food" deve ser uma string');
    }
  });

  it('deve rejeitar se o tamanho total do corpo exceder o limite máximo (25KB)', () => {
    const hugePayload = {
      names: 'Casal',
      dates: 'D'.repeat(2000),
      places: 'P'.repeat(2000),
      phrases: 'F'.repeat(2000),
      media: 'M'.repeat(2000),
      food: 'C'.repeat(2000),
      memories: 'E'.repeat(2000),
      other: 'O'.repeat(2000),
      extraData: 'X'.repeat(MAX_TOTAL_BODY_LENGTH),
    };
    const result = validateStoryData(hugePayload);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('limite máximo permitido');
    }
  });
});

describe('Rate Limiting em Memória (checkRateLimit)', () => {
  it('deve permitir requisições dentro do limite por minuto e bloquear a 6ª', () => {
    const localStore = new Map();
    const uid = 'user-test-1';
    const now = 1000000;

    for (let i = 0; i < RATE_LIMIT_MINUTE_MAX; i++) {
      const check = checkRateLimit(uid, now, localStore);
      expect(check.allowed).toBe(true);
    }

    // 6ª requisição no mesmo minuto deve ser bloqueada
    const blocked = checkRateLimit(uid, now + 1000, localStore);
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toContain('Limite de requisições por minuto excedido');
  });

  it('deve permitir nova requisição após a janela de 1 minuto expirar', () => {
    const localStore = new Map();
    const uid = 'user-test-2';
    const start = 1000000;

    for (let i = 0; i < RATE_LIMIT_MINUTE_MAX; i++) {
      checkRateLimit(uid, start, localStore);
    }

    // Após 61 segundos, o contador de minuto reseta
    const afterOneMinute = start + 61 * 1000;
    const allowedAfterWindow = checkRateLimit(uid, afterOneMinute, localStore);
    expect(allowedAfterWindow.allowed).toBe(true);
  });

  it('deve bloquear quando atingir o limite diário de 30 requisições', () => {
    const localStore = new Map();
    const uid = 'user-test-3';
    let currentTime = 1000000;

    for (let i = 0; i < RATE_LIMIT_DAY_MAX; i++) {
      // Avança 70 segundos entre cada requisição para não estourar o limite por minuto
      currentTime += 70 * 1000;
      const res = checkRateLimit(uid, currentTime, localStore);
      expect(res.allowed).toBe(true);
    }

    // 31ª requisição no mesmo dia deve ser bloqueada
    currentTime += 70 * 1000;
    const blockedDaily = checkRateLimit(uid, currentTime, localStore);
    expect(blockedDaily.allowed).toBe(false);
    expect(blockedDaily.reason).toContain('Limite diário de requisições excedido');
  });

  it('deve isolar a contagem de taxa entre usuários diferentes', () => {
    const localStore = new Map();
    const userA = 'user-a';
    const userB = 'user-b';
    const now = 1000000;

    for (let i = 0; i < RATE_LIMIT_MINUTE_MAX; i++) {
      checkRateLimit(userA, now, localStore);
    }

    // User A está bloqueado
    expect(checkRateLimit(userA, now, localStore).allowed).toBe(false);

    // User B ainda está livre
    expect(checkRateLimit(userB, now, localStore).allowed).toBe(true);
  });
});

describe('Construção de Prompt (buildPrompt)', () => {
  it('deve incluir o nome dos dois e os tópicos preenchidos no texto final', () => {
    const data: CoupleStoryData = {
      names: 'Kevin & Iara',
      dates: '2021',
      places: 'Florianópolis',
      phrases: '',
      media: '',
      food: 'Sushi',
      memories: '',
      other: '',
    };

    const prompt = buildPrompt(data);
    expect(prompt).toContain('Kevin & Iara');
    expect(prompt).toContain('- Datas e momentos importantes: 2021');
    expect(prompt).toContain('- Lugares especiais: Florianópolis');
    expect(prompt).toContain('- Comidas e restaurantes preferidos: Sushi');
    expect(prompt).not.toContain('- Músicas, filmes');
  });
});

describe('Cliente de Geração de Quiz (generateQuestionsFromGemini)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve lançar erro se o usuário não estiver autenticado no Firebase Auth', async () => {
    (auth as { currentUser: unknown }).currentUser = null;

    const data: CoupleStoryData = {
      names: 'Kevin & Iara',
      dates: '',
      places: '',
      phrases: '',
      media: '',
      food: '',
      memories: '',
      other: '',
    };

    await expect(generateQuestionsFromGemini(data)).rejects.toThrow(
      'Sessão expirada ou não autenticada. Faça login novamente.'
    );
  });

  it('deve enviar token Bearer e retornar perguntas com sucesso na resposta 200', async () => {
    const mockGetIdToken = vi.fn().mockResolvedValue('fake-firebase-token');
    (auth as { currentUser: unknown }).currentUser = {
      getIdToken: mockGetIdToken,
    };

    const mockQuestions = [
      {
        question: 'Qual a comida favorita?',
        options: [
          { id: 'opt-a', text: 'Pizza' },
          { id: 'opt-b', text: 'Hambúrguer' },
        ],
        correctOptionId: 'opt-a',
      },
    ];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ questions: mockQuestions }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const data: CoupleStoryData = {
      names: 'Kevin & Iara',
      dates: '2021',
      places: 'SP',
      phrases: '',
      media: '',
      food: 'Pizza',
      memories: '',
      other: '',
    };

    const result = await generateQuestionsFromGemini(data);

    expect(mockGetIdToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/generate-quiz',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer fake-firebase-token',
        },
      })
    );
    expect(result).toEqual(mockQuestions);
  });

  it('deve tratar 401 com mensagem de sessão expirada', async () => {
    (auth as { currentUser: unknown }).currentUser = {
      getIdToken: vi.fn().mockResolvedValue('expired-token'),
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Não autorizado' }),
    }));

    await expect(
      generateQuestionsFromGemini({
        names: 'Kevin & Iara',
        dates: '',
        places: '',
        phrases: '',
        media: '',
        food: '',
        memories: '',
        other: '',
      })
    ).rejects.toThrow('Sessão expirada ou não autenticada. Faça login novamente.');
  });

  it('deve tratar 403 com mensagem de acesso restrito a administradores', async () => {
    (auth as { currentUser: unknown }).currentUser = {
      getIdToken: vi.fn().mockResolvedValue('user-token'),
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Acesso restrito' }),
    }));

    await expect(
      generateQuestionsFromGemini({
        names: 'Kevin & Iara',
        dates: '',
        places: '',
        phrases: '',
        media: '',
        food: '',
        memories: '',
        other: '',
      })
    ).rejects.toThrow('Acesso restrito a administradores.');
  });

  it('deve tratar 429 com mensagem de limite excedido', async () => {
    (auth as { currentUser: unknown }).currentUser = {
      getIdToken: vi.fn().mockResolvedValue('token'),
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: 'Limite de requisições excedido' }),
    }));

    await expect(
      generateQuestionsFromGemini({
        names: 'Kevin & Iara',
        dates: '',
        places: '',
        phrases: '',
        media: '',
        food: '',
        memories: '',
        other: '',
      })
    ).rejects.toThrow('Limite de requisições excedido. Aguarde alguns instantes antes de tentar novamente.');
  });

  it('deve propagar mensagens de erro personalizadas do servidor em 5xx ou 400', async () => {
    (auth as { currentUser: unknown }).currentUser = {
      getIdToken: vi.fn().mockResolvedValue('token'),
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ error: 'A IA retornou um formato JSON inválido. Tente novamente.' }),
    }));

    await expect(
      generateQuestionsFromGemini({
        names: 'Kevin & Iara',
        dates: '',
        places: '',
        phrases: '',
        media: '',
        food: '',
        memories: '',
        other: '',
      })
    ).rejects.toThrow('A IA retornou um formato JSON inválido. Tente novamente.');
  });
});
