export function normalizeForCompare(word: string): string {
  let w = word.toLowerCase().trim();
  // Remove accents
  w = w.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Remove punctuation
  w = w.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '');
  // Collapse spaces
  w = w.replace(/\s+/g, ' ');
  // Remove initial articles
  w = w.replace(/^(o|a|os|as|um|uma|uns|umas)\s+/g, '');
  return w.trim();
}

export function singularize(word: string): string {
  if (word.length > 4 && word.endsWith('es')) {
    return word.slice(0, -2);
  }
  if (word.length > 3 && word.endsWith('s')) {
    return word.slice(0, -1);
  }
  return word;
}

export function isSameWord(w1: string, w2: string): boolean {
  const n1 = normalizeForCompare(w1);
  const n2 = normalizeForCompare(w2);
  if (n1 === n2) return true;

  const s1 = singularize(n1);
  const s2 = singularize(n2);
  if (s1 === s2) return true;

  return false;
}

export function validateWord(word: string, history: Array<{ round: number; words: Record<string, string> }>): { valid: boolean; error?: string } {
  const trimmed = word.trim();
  if (!trimmed) return { valid: false, error: 'A palavra não pode estar vazia.' };
  if (trimmed.length > 30) return { valid: false, error: 'Máximo de 30 caracteres.' };
  
  const wordsArray = trimmed.split(/\s+/);
  if (wordsArray.length > 2) return { valid: false, error: 'Máximo de 2 palavras.' };
  
  for (const h of history) {
    for (const pId in h.words) {
      if (h.words[pId] && isSameWord(h.words[pId], word)) {
        return { valid: false, error: 'Esta palavra já foi usada na partida.' };
      }
    }
  }

  return { valid: true };
}

export function getRoundPoints(rounds: number): number {
  if (rounds === 1) return 100;
  if (rounds === 2) return 80;
  if (rounds === 3) return 60;
  if (rounds === 4) return 40;
  if (rounds === 5) return 20;
  if (rounds === 6) return 10;
  return 0; // 7 ou não sincronizou
}

export function calculateTotalScore(results: Array<{ rounds: number }>): number {
  return results.reduce((sum, r) => sum + getRoundPoints(r.rounds), 0);
}

export function getRoundTitle(round: number, isSynced: boolean): string {
  if (!isSynced) return '🌀 Cada um no seu mundo';
  if (round === 1) return '🔮 Telepatia';
  if (round === 2) return '💞 Almas gêmeas';
  if (round === 3 || round === 4) return '🤝 Em sintonia';
  if (round === 5 || round === 6) return '😅 Quase lá';
  return '🌀 Cada um no seu mundo';
}
