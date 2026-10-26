import { cloudinaryUrl } from '../../services/cloudinary/upload';

/**
 * Campos de uma foto de álbum que podem definir a sua URL.
 * Fotos novas (enviadas pelo painel) têm `publicId`; fotos legadas têm `src`/`srcLarge`/`url`.
 */
export interface PhotoUrlSource {
  publicId?: string;
  src?: string;
  srcLarge?: string;
  srcThumb?: string;
  srcWebP?: string;
  url?: string;
}

/**
 * Normaliza qualquer URL do Cloudinary para garantir formato WebP estável (evitando AVIF lento no iOS/Safari).
 */
export function normalizeCloudinaryUrl(url: string): string {
  if (!url) return '';
  // Se a URL do Cloudinary contém f_auto, força f_webp para evitar entrega de AVIF no Safari/iOS
  return url.replace(/([,/])f_auto([,/])/g, '$1f_webp$2');
}

/**
 * Largura única para TODOS os aparelhos (iPhone, Android e desktop).
 * Usar sempre a mesma URL é essencial: o Cloudinary gera cada combinação de
 * largura/formato uma única vez e depois serve do cache. Se mobile e desktop
 * pedissem URLs diferentes, o aparelho que nunca pediu aquela versão pagaria
 * a geração "a frio" (lenta) na primeira abertura.
 *
 * ATENÇÃO: o script scripts/warm-cloudinary.mjs usa exatamente esta mesma
 * transformação. Se mudar a largura/formato aqui, mude lá também (e rode o script).
 */
export const ALBUM_PHOTO_WIDTH = 1200;

/**
 * URL final da foto exibida no visualizador do álbum.
 * É a ÚNICA fonte de verdade: o modal e o pré-carregamento do carrossel usam esta função,
 * garantindo que a imagem pré-carregada é exatamente a que será exibida (cache hit).
 */
export function getPhotoUrl(photo: PhotoUrlSource): string {
  // Foto gerenciada pelo Cloudinary → URL otimizada com f_webp explícito
  if (photo.publicId && !photo.publicId.startsWith('http')) {
    return cloudinaryUrl(photo.publicId, { w: ALBUM_PHOTO_WIDTH, f: 'webp' });
  }
  // Fotos legadas do site antigo: substitui f_auto por f_webp caso presente
  const raw = photo.srcWebP || photo.src || photo.srcLarge || photo.url || photo.publicId || '';
  return normalizeCloudinaryUrl(raw);
}
