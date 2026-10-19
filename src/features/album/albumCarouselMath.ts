// ─── Circular math ────────────────────────────────────────────────────────────

/** Normaliza qualquer índice para o intervalo [0, total). */
export function circularIndex(index: number, total: number): number {
  return ((index % total) + total) % total;
}

/**
 * Distância circular com sinal de `from` até `to`.
 * Retorna um número no intervalo [-(total/2), total/2].
 * Negativo = `to` está à esquerda de `from`.
 * Positivo = `to` está à direita de `from`.
 */
export function circularDistance(from: number, to: number, total: number): number {
  const raw = circularIndex(to - from, total);
  return raw > total / 2 ? raw - total : raw;
}

// ─── Card transform ───────────────────────────────────────────────────────────

/** Parâmetros visuais por slot de distância. */
export function getCardStyle(distance: number, cardWidth: number, gap: number) {
  const absD = Math.abs(distance);
  const sign = distance < 0 ? -1 : distance > 0 ? 1 : 0;

  // Quantos slots estão visíveis de cada lado
  const MAX_VISIBLE = 3;
  const hidden = absD > MAX_VISIBLE;

  const translateX = sign * absD * (cardWidth + gap);
  const translateZ = hidden ? -1200 : -absD * 120;
  const rotateY    = hidden ? 0     : sign * absD * 20;
  const scale      = hidden ? 0     : 1 - absD * 0.08;
  const opacity    = hidden ? 0     : 1 - absD * 0.25;
  const zIndex     = hidden ? 0     : 10 - absD;

  return { translateX, translateZ, rotateY, scale, opacity, zIndex, hidden };
}
