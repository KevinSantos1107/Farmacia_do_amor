import { shuffle } from '../../../shared/utils/shuffle';

export interface GamePhoto {
  src: string;
  publicId?: string;
}

export interface AlbumForGame {
  id: string;
  name?: string;
  title?: string;
  photos: {
    src?: string;
    url?: string;
    publicId?: string;
    width?: number;
    height?: number;
  }[];
}

/**
 * Given all site albums, selects `pairsCount` unique photos for the memory game.
 *
 * Priority:
 * 1. Photos whose aspect ratio (w/h) falls in [minRatio, maxRatio] → "ideal"
 * 2. If not enough ideals, fall back to photos sorted by closeness to the ideal center
 *
 * @param albums      - All albums from the site
 * @param pairsCount  - How many distinct photo pairs the game should have
 * @param minRatio    - Minimum w/h ratio (default 0.75 = portrait 3:4)
 * @param maxRatio    - Maximum w/h ratio (default 1.33 = landscape 4:3)
 */
export function selectPhotosForGame(
  albums: AlbumForGame[],
  pairsCount: number,
  minRatio = 0.75,
  maxRatio = 1.33,
): GamePhoto[] {
  // 1. Collect all photos with a usable URL
  const allPhotos: { src: string; publicId?: string; ratio: number }[] = [];

  for (const album of albums) {
    for (const photo of album.photos) {
      const src = photo.src || photo.url || (photo.publicId ?? '');
      if (!src) continue;

      // Derive aspect ratio if dimensions are known; otherwise assume square (1.0)
      const ratio =
        photo.width && photo.height && photo.height > 0
          ? photo.width / photo.height
          : 1.0;

      allPhotos.push({ src, publicId: photo.publicId, ratio });
    }
  }

  if (allPhotos.length === 0) return [];

  // 2. Separate into ideal and fallback buckets
  const IDEAL_CENTER = (minRatio + maxRatio) / 2;
  const ideal: typeof allPhotos = [];
  const fallback: typeof allPhotos = [];

  for (const p of allPhotos) {
    if (p.ratio >= minRatio && p.ratio <= maxRatio) {
      ideal.push(p);
    } else {
      fallback.push(p);
    }
  }

  // Sort fallback by closeness to the ideal center (ascending distance)
  fallback.sort((a, b) => Math.abs(a.ratio - IDEAL_CENTER) - Math.abs(b.ratio - IDEAL_CENTER));

  // 3. Merge: ideals first, then sorted fallback; then shuffle the whole pool
  const pool = shuffle([...ideal, ...fallback]);

  // 4. Deduplicate by src (same photo in multiple albums)
  const seen = new Set<string>();
  const unique: GamePhoto[] = [];
  for (const p of pool) {
    if (!seen.has(p.src)) {
      seen.add(p.src);
      unique.push({ src: p.src, publicId: p.publicId });
    }
    if (unique.length >= pairsCount) break;
  }

  // If not enough distinct photos, repeat from the beginning (still shuffled)
  if (unique.length < pairsCount && unique.length > 0) {
    let i = 0;
    while (unique.length < pairsCount) {
      unique.push({ ...unique[i % unique.length] });
      i++;
    }
  }

  return unique.slice(0, pairsCount);
}
