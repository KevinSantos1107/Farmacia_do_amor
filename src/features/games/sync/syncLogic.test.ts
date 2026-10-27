import { describe, it, expect } from 'vitest';
import { isSameWord, validateWord, getRoundTitle, getRoundPoints, calculateTotalScore } from './syncLogic';

describe('syncLogic', () => {
  describe('isSameWord (strict rules)', () => {
    it.each([
      // Acentos e maiúsculas
      ['mamão', 'mamao', true],
      ['Maçã', 'maca', true],
      // Espaços extras e pontuação
      [' casa ', 'casa', true],
      ['olá, mundo!', 'ola mundo', true],
      // Artigos iniciais
      ['o gato', 'gato', true],
      ['uma pizza', 'pizza', true],
      ['os cachorros', 'cachorro', true],
      // Plural simples (s)
      ['carro', 'carros', true],
      ['livro', 'livros', true],
      // Plural composto (es)
      ['animal', 'animais', false], // Not supported by simple rule, should be false
      ['cor', 'cores', true],
      ['luz', 'luzes', true],
      // Palavras curtas
      ['sol', 'sal', false], // Different words
      ['o', 'os', false], // Articles are stripped, empty strings aren't equal
      ['ol', 'ols', false], // "s" removal only if len > 3
      // Palavras diferentes que antes davam true com Levenshtein
      ['gato', 'pato', false],
      ['casa', 'cama', false],
      ['amor', 'amar', false],
      ['abacaxi', 'abacxi', false],
    ])('isSameWord("%s", "%s") -> %s', (w1, w2, expected) => {
      expect(isSameWord(w1, w2)).toBe(expected);
    });

    it('is always true for the same string', () => {
      const words = ['gato', 'cachorro', 'amor', 'amar', 'sol', 'sal', 'cor', 'cores', 'carro', 'carros', 'uma pizza', 'o gato'];
      for (const w of words) {
        expect(isSameWord(w, w)).toBe(true);
      }
    });

    it('is symmetric', () => {
      const words = ['gato', 'cachorro', 'amor', 'amar', 'sol', 'sal', 'cor', 'cores', 'carro', 'carros', 'uma pizza', 'o gato'];
      for (let i = 0; i < words.length; i++) {
        for (let j = 0; j < words.length; j++) {
          expect(isSameWord(words[i], words[j])).toBe(isSameWord(words[j], words[i]));
        }
      }
    });
  });

  describe('validateWord', () => {
    const history = [
      { round: 1, words: { p1: 'gato', p2: 'lua' } },
      { round: 2, words: { p1: 'estrela', p2: 'mar' } }
    ];

    it('rejects empty words', () => {
      expect(validateWord('   ', history).valid).toBe(false);
    });

    it('rejects more than 2 words', () => {
      expect(validateWord('um dois tres', history).valid).toBe(false);
    });

    it('rejects words over 30 chars', () => {
      const longWord = 'a'.repeat(31);
      expect(validateWord(longWord, history).valid).toBe(false);
    });

    it('rejects words already used exactly by rule', () => {
      expect(validateWord('gato', history).valid).toBe(false);
      expect(validateWord('Gatos', history).valid).toBe(false);
      expect(validateWord('o gato', history).valid).toBe(false);
      expect(validateWord('estrelas', history).valid).toBe(false);
    });

    it('accepts different words that are close', () => {
      expect(validateWord('pato', history).valid).toBe(true); // pato is allowed after gato
      expect(validateWord('lua nova', history).valid).toBe(true);
    });
  });

  describe('getRoundTitle', () => {
    it('returns correct titles for synced rounds', () => {
      expect(getRoundTitle(1, true)).toBe('🔮 Telepatia');
      expect(getRoundTitle(2, true)).toBe('💞 Almas gêmeas');
      expect(getRoundTitle(3, true)).toBe('🤝 Em sintonia');
      expect(getRoundTitle(4, true)).toBe('🤝 Em sintonia');
      expect(getRoundTitle(5, true)).toBe('😅 Quase lá');
      expect(getRoundTitle(6, true)).toBe('😅 Quase lá');
    });

    it('returns failure title for not synced rounds at any stage', () => {
      expect(getRoundTitle(6, false)).toBe('🌀 Cada um no seu mundo');
      expect(getRoundTitle(7, false)).toBe('🌀 Cada um no seu mundo');
      expect(getRoundTitle(1, false)).toBe('🌀 Cada um no seu mundo');
    });
  });

  describe('pontuação positiva', () => {
    it('atribui mais pontos para menos rodadas', () => {
      expect(getRoundPoints(1)).toBe(100);
      expect(getRoundPoints(2)).toBe(80);
      expect(getRoundPoints(3)).toBe(60);
      expect(getRoundPoints(4)).toBe(40);
      expect(getRoundPoints(5)).toBe(20);
      expect(getRoundPoints(6)).toBe(10);
      expect(getRoundPoints(7)).toBe(0);
    });

    it('calcula o score total somando os pontos', () => {
      const results = [
        { rounds: 1 }, // 100
        { rounds: 2 }, // 80
        { rounds: 7 }, // 0
      ];
      expect(calculateTotalScore(results)).toBe(180);
    });
  });
});
