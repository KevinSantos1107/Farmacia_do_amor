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

/**
 * Converte qualquer referência de capa (URL absoluta, publicId do Cloudinary, blob local ou data-URI)
 * para uma URL utilizável pelo navegador, evitando que publicIds virem URLs relativas locais (404).
 */
export function resolveMediaCoverUrl(raw?: string | null, cloudName?: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Se já for URL absoluta ou blob local
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }

  // Se for um publicId do Cloudinary
  const cName = cloudName || import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
  if (!cName) return null;
  return `https://res.cloudinary.com/${cName}/image/upload/w_120,h_120,c_fill,q_auto,f_auto,fl_progressive/${trimmed}`;
}

