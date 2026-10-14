/**
 * Funções utilitárias puras de playlist (formatação de tempo, nomes de arquivos, limpeza de objetos).
 * Módulo 100% puro, sem dependências do Firebase ou DOM.
 */

export function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

export function parseFilename(filename: string): { parsedArtist: string; parsedTitle: string } {
  const name = filename.replace(/\.[^.]+$/, '');
  if (name.includes(' - ')) {
    const parts = name.split(' - ');
    return { parsedArtist: parts[0].trim(), parsedTitle: parts.slice(1).join(' - ').trim() };
  }
  return { parsedArtist: '', parsedTitle: name.replace(/[-_]/g, ' ') };
}

export function formatAudioTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
