import { useState, useEffect, useCallback } from 'react';
import { normalizeWord } from './wordLogic';

let cachedValidWords: Set<string> | null = null;

export function useWordDictionary() {
  const [_dictLoaded, setDictLoaded] = useState(cachedValidWords !== null);

  useEffect(() => {
    if (cachedValidWords) {
      setDictLoaded(true);
      return;
    }
    // Carrega o dicionário via fetch do /public (fora do bundle principal)
    fetch('/pt-5-letters.json')
      .then((r) => r.json())
      .then((data: string[]) => {
        cachedValidWords = new Set(
          data.map((w) => normalizeWord(String(w))).filter((w) => w.length === 5)
        );
        setDictLoaded(true);
      })
      .catch(() => {
        setDictLoaded(true);
      });
  }, []);

  const isValidWord = useCallback((guess: string) => {
    const norm = normalizeWord(guess);
    if (norm.length !== 5) return false;
    if (!cachedValidWords || cachedValidWords.size === 0) return true;
    return cachedValidWords.has(norm);
  }, []);

  return { isValidWord };
}
