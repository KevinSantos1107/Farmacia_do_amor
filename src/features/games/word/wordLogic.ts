import type { LetterCell, LetterState, ActiveGameState } from './types';

export function normalizeWord(w: string): string {
  return w
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '');
}

export function evaluateGuess(guess: string, answer: string): LetterState[] {
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

export function getKeyboardStates(
  guesses: LetterCell[][],
  revealingRow: number,
  revealProgress: number
): Record<string, string> {
  const keyStates: Record<string, string> = {};
  guesses.forEach((row, ri) =>
    row.forEach((cell, ci) => {
      // Não exibe estado no teclado até a letra ser visualmente revelada
      if (ri === revealingRow && ci >= revealProgress) return;

      const prev = keyStates[cell.letter];
      if (prev === 'correct') return;
      if (cell.state === 'correct' || prev !== 'correct') {
        keyStates[cell.letter] = cell.state;
      }
    })
  );
  return keyStates;
}

export function buildGridRows(
  guesses: LetterCell[][],
  currentInput: string,
  cursorPos: number,
  wordLength: number,
  gameOver: boolean,
  maxAttempts: number = 6
): { cells: LetterCell[]; isActive: boolean }[] {
  const rows: { cells: LetterCell[]; isActive: boolean }[] = [];
  for (let i = 0; i < maxAttempts; i++) {
    if (i < guesses.length) {
      rows.push({ cells: guesses[i], isActive: false });
    } else if (i === guesses.length && !gameOver) {
      const isAnimating = currentInput === 'ANIMATING';
      const cells: LetterCell[] = Array(wordLength)
        .fill(null)
        .map((_, j) => {
          if (isAnimating) return { letter: '', state: 'empty' as LetterState };
          let st: LetterState = 'empty';
          if (j === cursorPos) st = 'active';
          else if (currentInput[j] && currentInput[j] !== ' ') st = 'typed';

          return {
            letter: currentInput[j] === ' ' ? '' : (currentInput[j] || ''),
            state: st,
          };
        });
      rows.push({ cells, isActive: !isAnimating });
    } else {
      rows.push({
        cells: Array(wordLength).fill({ letter: '', state: 'empty' as LetterState }),
        isActive: false,
      });
    }
  }
  return rows;
}

// ─── LocalStorage helpers ─────────────────────────────────────────────────────

export function getDeviceId(): string {
  let id = localStorage.getItem('wg_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('wg_device_id', id);
  }
  return id;
}

export function loadUsedWords(): string[] {
  const deviceId = getDeviceId();
  try {
    const data = JSON.parse(localStorage.getItem('wg_history') || 'null');
    if (data && data.deviceId === deviceId && Array.isArray(data.usedWords)) {
      return data.usedWords;
    }
    // Fallback/Migração do modelo antigo
    const old = JSON.parse(localStorage.getItem('wg_used_words') || '[]');
    if (Array.isArray(old)) return old;
  } catch {}
  return [];
}

export function saveUsedWords(u: string[]) {
  const deviceId = getDeviceId();
  localStorage.setItem('wg_history', JSON.stringify({ deviceId, usedWords: u }));
  localStorage.removeItem('wg_used_words'); // Limpa a chave antiga para evitar conflitos
}

export function loadActiveGame(): ActiveGameState | null {
  const deviceId = getDeviceId();
  try {
    const data = JSON.parse(localStorage.getItem('wg_active_game') || 'null');
    if (data && data.deviceId === deviceId && data.gameState && data.gameState.word) {
      return data.gameState;
    }
  } catch {}
  return null;
}

export function saveActiveGame(state: ActiveGameState) {
  const deviceId = getDeviceId();
  localStorage.setItem('wg_active_game', JSON.stringify({ deviceId, gameState: state }));
}

export function clearActiveGame() {
  localStorage.removeItem('wg_active_game');
}
