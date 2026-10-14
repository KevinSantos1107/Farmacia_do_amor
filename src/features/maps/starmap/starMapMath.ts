/**
 * Funções matemáticas e de formatação do mapa estelar.
 */

export function bezier3(t: number, p0: number, p1: number, p2: number): number {
  return (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
}

export function rectIntersect(
  r1x: number,
  r1y: number,
  r1w: number,
  r1h: number,
  r2x: number,
  r2y: number,
  r2w: number,
  r2h: number,
): boolean {
  return !(r2x > r1x + r1w || r2x + r2w < r1x || r2y > r1y + r1h || r2y + r2h < r1y);
}

export function formatStarMapDate(dateStr?: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('-')) {
    const [y, m, d] = dateStr.split('-');
    return `${d} · ${m} · ${y}`;
  }
  return dateStr;
}

export function formatCoordinates(lat?: number, lng?: number): string {
  if (!lat || !lng) return '';
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}  ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;
}
