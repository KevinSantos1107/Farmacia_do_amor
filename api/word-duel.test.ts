import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  isValidWord,
  normalizeWordServer,
  evaluateGuessServer,
} from './_lib/wordDictionary.ts';

describe('Server-side Word Dictionary & Logic', () => {
  it('normalizes words properly (strips accents, uppercase, letters only)', () => {
    expect(normalizeWordServer('Árvre')).toBe('ARVRE');
    expect(normalizeWordServer('coração')).toBe('CORACAO');
    expect(normalizeWordServer(' a-m*or ')).toBe('AMOR');
  });

  it('validates 5-letter words against public/pt-5-letters.json', () => {
    // Palavras comuns existentes no dicionário de 5 letras
    expect(isValidWord('AMADO')).toBe(true);
    expect(isValidWord('TERRA')).toBe(true);
    expect(isValidWord('PORTA')).toBe(true);
    expect(isValidWord('NOITE')).toBe(true);
    expect(isValidWord('plano')).toBe(true);

    // Topônimos e nomes dicionarizados no VERO/PT-BR (padrão Letreco/Termo)
    expect(isValidWord('VIENA')).toBe(true);
    expect(isValidWord('INDIA')).toBe(true);
    expect(isValidWord('EGITO')).toBe(true);
    expect(isValidWord('MILAO')).toBe(true);
    expect(isValidWord('BELEM')).toBe(true);
    expect(isValidWord('PEDRO')).toBe(true);

    // Palavras com tamanhos diferentes de 5
    expect(isValidWord('AMOR')).toBe(false);
    expect(isValidWord('CORACAO')).toBe(false);
    expect(isValidWord('')).toBe(false);

    // Siglas puras, algarismos romanos e sequências inexistentes
    expect(isValidWord('ABGLT')).toBe(false);
    expect(isValidWord('BNDES')).toBe(false);
    expect(isValidWord('CCCIX')).toBe(false);
    expect(isValidWord('ZZZZZ')).toBe(false);
    expect(isValidWord('XYZWQ')).toBe(false);
    expect(isValidWord('ABCDE')).toBe(false);
  });

  it('contains strictly unique 5-letter uppercase words in public/pt-5-letters.json', () => {
    const raw = fs.readFileSync(path.resolve(process.cwd(), 'public', 'pt-5-letters.json'), 'utf8');
    const words = JSON.parse(raw) as string[];
    expect(Array.isArray(words)).toBe(true);
    expect(words.length).toBeGreaterThan(19000);
    const unique = new Set(words);
    expect(unique.size).toBe(words.length);
    for (const w of words) {
      expect(w).toMatch(/^[A-Z]{5}$/);
    }
  });

  it('evaluates guesses correctly with evaluateGuessServer', () => {
    // Exato
    const res1 = evaluateGuessServer('TERRA', 'TERRA');
    expect(res1).toEqual(['correct', 'correct', 'correct', 'correct', 'correct']);

    // Letra presente, exata e ausente
    const res2 = evaluateGuessServer('PORTA', 'TERRA');
    // P: absent, O: absent, R: correct (3ª letra), T: present (está na 1ª pos de TERRA), A: correct
    expect(res2).toEqual(['absent', 'absent', 'correct', 'present', 'correct']);

    // Todas ausentes
    const res3 = evaluateGuessServer('MUNDO', 'TERRA');
    expect(res3).toEqual(['absent', 'absent', 'absent', 'absent', 'absent']);
  });
});
