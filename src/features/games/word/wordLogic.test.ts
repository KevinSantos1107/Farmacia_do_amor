import { describe, it, expect } from 'vitest';
import {
  normalizeWord,
  evaluateGuess,
  getKeyboardStates,
  buildGridRows,
} from './wordLogic';
import type { LetterCell } from './types';

describe('normalizeWord — protege a normalização de palavras e remoção de acentos', () => {
  it('converte para maiúsculas e remove acentos comuns em português', () => {
    expect(normalizeWord('coração')).toBe('CORACAO');
    expect(normalizeWord('café')).toBe('CAFE');
    expect(normalizeWord('órgão')).toBe('ORGAO');
    expect(normalizeWord('música')).toBe('MUSICA');
    expect(normalizeWord('ânimo')).toBe('ANIMO');
    expect(normalizeWord('saúde')).toBe('SAUDE');
  });

  it('remove espaços, números e caracteres não alfabéticos', () => {
    expect(normalizeWord('  amor! ')).toBe('AMOR');
    expect(normalizeWord('pão-de-ló')).toBe('PAODELO');
    expect(normalizeWord('olhos123')).toBe('OLHOS');
  });
});

describe('evaluateGuess — protege a regra de avaliação de tentativas (Wordle/Termo)', () => {
  it('identifica todas as letras certas no lugar exato (todas correct)', () => {
    const result = evaluateGuess('TERMO', 'TERMO');
    expect(result).toEqual(['correct', 'correct', 'correct', 'correct', 'correct']);
  });

  it('identifica todas as letras existentes em posições diferentes (todas present)', () => {
    // Anagrama direto sem nenhuma letra na mesma posição
    const result = evaluateGuess('MOTER', 'TERMO');
    expect(result).toEqual(['present', 'present', 'present', 'present', 'present']);
  });

  it('identifica letras ausentes (todas absent)', () => {
    const result = evaluateGuess('ZEBRA', 'PINTO');
    expect(result).toEqual(['absent', 'absent', 'absent', 'absent', 'absent']);
  });

  it('gerencia corretamente letras repetidas quando o palpite tem mais ocorrências que a resposta', () => {
    // Resposta tem 1 'A': BARCO
    // Palpite tem 2 'A': AMARA
    // Na 1ª passagem, 'A' em índice 4 não bate com 'O' ('absent' preliminar)
    // Na 2ª passagem, apenas o primeiro 'A' livre consome o único 'A' da resposta
    const result = evaluateGuess('AEREO', 'BARCO');
    // B A R C O:
    // A: presente (índice 0 consome o único A de BARCO)
    // E: ausente
    // R: presente (R está na pos 2 de BARCO, palpite está na pos 2... espere!)
    // Palpite AEREO pos 2 é 'R', BARCO pos 2 é 'R' -> 'correct'
    // E: ausente
    // O: correct (pos 4)
    expect(result).toEqual(['present', 'absent', 'correct', 'absent', 'correct']);
  });

  it('gerencia caso clássico de repetição com letras certas e extras (ARARA vs AMORA)', () => {
    // Resposta: A M O R A
    // Palpite:  A R A R A
    // Índices:
    // 0: A == A -> correct (consome A em 0)
    // 4: A == A -> correct (consome A em 4)
    // 1: R != M, mas R existe em AMORA (índice 3) -> present (consome R em 3)
    // 2: A != O, nenhum A sobrou em AMORA -> absent
    // 3: R != R (em AMORA é R, mas palpite pos 3 é R? Não, em AMORA pos 3 é R, palpite pos 3 é R:
    //    Espera: A(0) R(1) A(2) R(3) A(4)
    //    A(0) == A(0) -> correct
    //    R(3) == R(3) -> correct
    //    A(4) == A(4) -> correct
    //    R(1): sobra algum R em AMORA? Não (já consumido pelo correct em 3) -> absent!
    //    A(2): sobra algum A em AMORA? Não (já consumidos pelos corrects em 0 e 4) -> absent!
    const result = evaluateGuess('ARARA', 'AMORA');
    expect(result).toEqual(['correct', 'absent', 'absent', 'correct', 'correct']);
  });

  it('gerencia repetição quando a resposta tem mais ocorrências que o palpite', () => {
    // Resposta: ARARA (três 'A', dois 'R')
    // Palpite:  BARCO (um 'A', um 'R')
    // B -> absent
    // A -> pos 1 != pos 1 (R). Sobra 'A' na resposta -> present
    // R -> pos 2 != pos 2 (A). Sobra 'R' na resposta -> present
    // C -> absent
    // O -> absent
    const result = evaluateGuess('BARCO', 'ARARA');
    expect(result).toEqual(['absent', 'present', 'present', 'absent', 'absent']);
  });
});

describe('getKeyboardStates — protege o mapeamento de cores do teclado virtual', () => {
  it('mantém status "correct" mesmo se a mesma letra aparecer como "present" depois', () => {
    const guesses: LetterCell[][] = [
      [
        { letter: 'A', state: 'correct' },
        { letter: 'M', state: 'absent' },
        { letter: 'O', state: 'absent' },
        { letter: 'R', state: 'absent' },
        { letter: 'T', state: 'absent' },
      ],
      [
        { letter: 'C', state: 'absent' },
        { letter: 'A', state: 'present' },
        { letter: 'S', state: 'absent' },
        { letter: 'A', state: 'absent' },
        { letter: 'S', state: 'absent' },
      ],
    ];

    const states = getKeyboardStates(guesses, -1, -1);
    expect(states['A']).toBe('correct');
    expect(states['M']).toBe('absent');
  });

  it('não revela estado de letras que ainda não terminaram animação de flip', () => {
    const guesses: LetterCell[][] = [
      [
        { letter: 'F', state: 'correct' },
        { letter: 'E', state: 'present' },
        { letter: 'L', state: 'correct' },
        { letter: 'I', state: 'absent' },
        { letter: 'Z', state: 'absent' },
      ],
    ];

    // Animando linha 0, progresso na letra de índice 2
    const states = getKeyboardStates(guesses, 0, 2);
    expect(states['F']).toBe('correct');
    expect(states['E']).toBe('present');
    // L (índice 2) e posteriores não foram reveladas ainda
    expect(states['L']).toBeUndefined();
    expect(states['I']).toBeUndefined();
    expect(states['Z']).toBeUndefined();
  });
});

describe('buildGridRows — protege a construção das 6 linhas do tabuleiro', () => {
  it('constrói exatamente 6 linhas preenchidas e vazias', () => {
    const guesses: LetterCell[][] = [
      [
        { letter: 'T', state: 'correct' },
        { letter: 'E', state: 'correct' },
        { letter: 'R', state: 'correct' },
        { letter: 'M', state: 'correct' },
        { letter: 'O', state: 'correct' },
      ],
    ];

    const rows = buildGridRows(guesses, '', 0, 5, false);
    expect(rows).toHaveLength(6);
    expect(rows[0].isActive).toBe(false);
    expect(rows[0].cells[0].letter).toBe('T');
    expect(rows[1].isActive).toBe(true);
    expect(rows[2].isActive).toBe(false);
  });
});
