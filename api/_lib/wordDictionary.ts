/**
 * api/_lib/wordDictionary.ts
 *
 * Módulo server-side para validação de palavras de 5 letras.
 * Carrega public/pt-5-letters.json UMA VEZ via fs e mantém o Set em memória.
 */

import fs from 'fs';
import path from 'path';

let cachedWords: Set<string> | null = null;

function loadDictionary(): Set<string> {
  if (cachedWords) {
    return cachedWords;
  }

  // Tenta encontrar o arquivo a partir de diferentes resoluções comuns em Node / Vercel Serverless
  const potentialPaths = [
    path.join(process.cwd(), 'public', 'pt-5-letters.json'),
    path.join(__dirname, '..', '..', 'public', 'pt-5-letters.json'),
    path.join(__dirname, '..', 'public', 'pt-5-letters.json'),
    path.join(__dirname, 'public', 'pt-5-letters.json'),
  ];

  let rawData = '';
  for (const p of potentialPaths) {
    if (fs.existsSync(p)) {
      rawData = fs.readFileSync(p, 'utf-8');
      break;
    }
  }

  if (!rawData) {
    throw new Error('Arquivo de dicionário pt-5-letters.json não encontrado no servidor.');
  }

  const list: string[] = JSON.parse(rawData);
  cachedWords = new Set(list.map((w) => w.toUpperCase().trim()));
  return cachedWords;
}

/**
 * Normaliza a palavra para maiúsculas sem acento e somente caracteres A-Z.
 */
export function normalizeWordServer(w: string): string {
  if (!w || typeof w !== 'string') return '';
  return w
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '');
}

/**
 * Retorna true se a palavra existir no dicionário de 5 letras.
 */
export function isValidWord(word: string): boolean {
  const norm = normalizeWordServer(word);
  if (norm.length !== 5) return false;
  const dict = loadDictionary();
  return dict.has(norm);
}

/**
 * Avalia o palpite contra a resposta alvo.
 * Retorna array de 'correct' | 'present' | 'absent'.
 */
export type LetterState = 'correct' | 'present' | 'absent';

export function evaluateGuessServer(guess: string, answer: string): LetterState[] {
  const result: LetterState[] = Array(answer.length).fill('absent');
  const answerArr = answer.split('');
  const guessArr = guess.split('');

  // 1ª passagem: letras exatas (verdes)
  guessArr.forEach((l, i) => {
    if (l === answerArr[i]) {
      result[i] = 'correct';
      answerArr[i] = '*';
    }
  });

  // 2ª passagem: letras existentes em outra posição (amarelas)
  guessArr.forEach((l, i) => {
    if (result[i] === 'correct') return;
    const idx = answerArr.indexOf(l);
    if (idx !== -1) {
      result[i] = 'present';
      answerArr[idx] = '*';
    }
  });

  return result;
}
