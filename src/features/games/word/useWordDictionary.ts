import { useState, useEffect, useCallback } from 'react';

let cachedValidWords: Set<string> | null = null;

export function useWordDictionary() {
  const [_dictLoaded, setDictLoaded] = useState(cachedValidWords !== null);

  useEffect(() => {
    if (cachedValidWords) {
      setDictLoaded(true);
      return;
    }
    // Carrega o dicionário via fetch do /public (fora do bundle principal)
    // Assim os 149 KB não entram no chunk do jogo de palavras
    fetch('/pt-5-letters.json')
      .then((r) => r.json())
      .then((data: string[]) => {
        cachedValidWords = new Set(data);
        setDictLoaded(true);
      })
      .catch(() => {
        setDictLoaded(true);
      });
  }, []);

  const isValidWord = useCallback((guess: string) => {
    if (!cachedValidWords || cachedValidWords.size === 0) return true;
    return cachedValidWords.has(guess);
  }, []);

  return { isValidWord };
}
