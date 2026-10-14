import { useState, useEffect, useCallback } from 'react';

let cachedValidWords: Set<string> | null = null;

export function useWordDictionary() {
  const [_dictLoaded, setDictLoaded] = useState(cachedValidWords !== null);

  useEffect(() => {
    if (cachedValidWords) {
      setDictLoaded(true);
      return;
    }
    import('../pt-5-letters.json')
      .then((m) => {
        cachedValidWords = new Set(m.default);
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
