/**
 * Utilitários de data à prova de falhas para WebKit / iOS Safari.
 * No Safari móvel, formatos como "YYYY-MM-DD 12:00:00", timestamps concatenados
 * incorretamente ou formatos com sufixos inesperados retornam "Invalid Date" ou lançam
 * RangeError ao chamar toLocaleDateString().
 */

export function parseSafeDate(value: string | number | Date | null | undefined): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // Se for string puramente numérica (timestamp serializado)
    if (/^\d+$/.test(trimmed)) {
      const num = Number(trimmed);
      const d = new Date(num);
      if (!isNaN(d.getTime())) return d;
    }

    // Se começar com YYYY-MM-DD ou YYYY/MM/DD
    const match = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      const hour = match[4] ? parseInt(match[4], 10) : 0;
      const minute = match[5] ? parseInt(match[5], 10) : 0;
      const second = match[6] ? parseInt(match[6], 10) : 0;
      const d = new Date(year, month, day, hour, minute, second);
      if (!isNaN(d.getTime())) return d;
    }

    // Tenta parsing nativo com substituição de espaços por 'T' se necessário
    const standardStr = trimmed.includes(' ') && !trimmed.includes('T') ? trimmed.replace(' ', 'T') : trimmed;
    const parsed = new Date(standardStr);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

export function formatSafeDate(
  value: string | number | Date | null | undefined,
  locale = 'pt-BR',
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }
): string {
  const d = parseSafeDate(value);
  if (!d) return '';
  try {
    return d.toLocaleDateString(locale, options);
  } catch {
    return '';
  }
}

export function getSafeTime(value: string | number | Date | null | undefined): number | null {
  const d = parseSafeDate(value);
  return d ? d.getTime() : null;
}
