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
  // Foto gerenciada pelo Cloudinary → URL otimizada. f_webp (e não f_auto) evita que o
  // Cloudinary gere AVIF sob demanda, que é bem mais lento na primeira requisição.
  if (photo.publicId && !photo.publicId.startsWith('http')) {
    return cloudinaryUrl(photo.publicId, { w: ALBUM_PHOTO_WIDTH, f: 'webp' });
  }
  // Fotos legadas do site antigo: usa a versão WebP se existir, senão a menor disponível.
  return photo.srcWebP || photo.src || photo.srcLarge || photo.url || photo.publicId || '';
}
