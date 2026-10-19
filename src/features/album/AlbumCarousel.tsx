import { useEffect, useState, useRef, useCallback } from 'react';
import { query, orderBy, getDocs, where } from 'firebase/firestore';
import { siteCollection } from '../../services/firestore/paths';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import { AlbumViewerModal } from './AlbumViewerModal';
import { Images } from 'lucide-react';
import { cloudinaryUrl, cloudinaryResponsiveSrcSet } from '../../services/cloudinary/upload';
import { AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Photo {
  src?: string;
  url?: string;
  description?: string;
  caption?: string;
  publicId?: string;
}

interface Album {
  id: string;
  title: string;
  description?: string;
  date?: string;
  cover?: string;
  coverThumb?: string;
  coverLarge?: string;
  coverPublicId?: string;
  photos: Photo[];
}

// ─── Circular math ────────────────────────────────────────────────────────────

/** Normaliza qualquer índice para o intervalo [0, total). */
function circularIndex(index: number, total: number): number {
  return ((index % total) + total) % total;
}

/**
 * Distância circular com sinal de `from` até `to`.
 * Retorna um número no intervalo  [-(total/2), total/2].
 * Negativo = `to` está à esquerda de `from`.
 * Positivo = `to` está à direita de `from`.
 */
function circularDistance(from: number, to: number, total: number): number {
  const raw = circularIndex(to - from, total);
  return raw > total / 2 ? raw - total : raw;
}

// ─── Card transform ───────────────────────────────────────────────────────────

/** Parâmetros visuais por slot de distância. */
function getCardStyle(distance: number, cardWidth: number, gap: number) {
  const absD = Math.abs(distance);
  const sign  = distance < 0 ? -1 : distance > 0 ? 1 : 0;

  // Quantos slots estão visíveis de cada lado
  const MAX_VISIBLE = 3;
  const hidden = absD > MAX_VISIBLE;

  const translateX = sign * absD * (cardWidth + gap);
  const translateZ = hidden ? -1200 : -absD * 120;
  const rotateY    = hidden ? 0    : sign * absD * 20;
  const scale      = hidden ? 0    : 1 - absD * 0.08;
  const opacity    = hidden ? 0    : 1 - absD * 0.25;
  const zIndex     = hidden ? 0    : 10 - absD;

  return { translateX, translateZ, rotateY, scale, opacity, zIndex, hidden };
}

// ─── Carousel component ───────────────────────────────────────────────────────

export function AlbumCarousel() {
  const { config } = useSiteConfigStore();

  // Dados
  const [albums, setAlbums]   = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Única fonte de verdade do carrossel ──
  const [activeIndex, setActiveIndex] = useState(0);

  // Modal
  const [selectedAlbumIndex, setSelectedAlbumIndex] = useState<number | null>(null);

  // Swipe
  const containerRef    = useRef<HTMLDivElement>(null);
  const dragStartX      = useRef<number | null>(null);
  const dragStartY      = useRef<number | null>(null);
  const isDragging      = useRef(false);
  const swipeHandled    = useRef(false);   // garante que 1 gesto = 1 slide
  const lastNavigatedAt = useRef(0);       // timestamp da última navegação lateral

  // ─── Navegação ─────────────────────────────────────────────────────────────

  const goToIndex = useCallback((index: number, total: number) => {
    setActiveIndex(circularIndex(index, total));
  }, []);

  // ─── Fetch de álbuns ───────────────────────────────────────────────────────

  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        const snapshot = await getDocs(
          query(siteCollection('albums'), orderBy('orderIndex', 'asc'))
        );
        const validDocs = snapshot.docs.filter((d) => !d.id.startsWith('_'));
        if (validDocs.length === 0) { setAlbums([]); setLoading(false); return; }

        const albumIds = validDocs.map((d) => d.id);
        const photoSnapshots = await Promise.all(
          albumIds.map((id) =>
            getDocs(query(
              siteCollection('album_photos'),
              where('albumId', '==', id)
            ))
          )
        );

        const loaded: Album[] = validDocs.map((doc, idx) => {
          const d = doc.data();
          const allPhotos: Photo[] = [];
          const sortedPages = photoSnapshots[idx].docs
            .filter((pDoc) => !pDoc.id.startsWith('_'))
            .sort((a, b) => (a.data().pageNumber ?? 0) - (b.data().pageNumber ?? 0));

          sortedPages.forEach((pageDoc) => {
            const pd = pageDoc.data();
            if (Array.isArray(pd.photos)) allPhotos.push(...pd.photos);
          });
          return {
            id: doc.id, title: d.title, description: d.description,
            date: d.date, cover: d.cover, coverThumb: d.coverThumb,
            coverLarge: d.coverLarge, coverPublicId: d.coverPublicId, photos: allPhotos,
          };
        });
        setAlbums(loaded);
      } catch (e) {
        console.error('Erro ao carregar álbuns:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAlbums();
  }, [config?.id]);

  // ─── Pointer events (swipe + clique) ──────────────────────────────────────
  // Usa Pointer Events unificados — funciona com mouse, touch e stylus.
  // Regra: movimento horizontal > 30px = swipe; caso contrário = clique.

  const SWIPE_THRESHOLD = 30; // px

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragStartX.current   = e.clientX;
    dragStartY.current   = e.clientY;
    isDragging.current   = false;
    swipeHandled.current = false;
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    if (Math.abs(dx) > SWIPE_THRESHOLD) isDragging.current = true;
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (dragStartX.current === null) return;

    const dx = e.clientX - dragStartX.current;
    const dy = e.clientY - (dragStartY.current ?? e.clientY);

    dragStartX.current = null;
    dragStartY.current = null;

    // ── SWIPE ────────────────────────────────────────────────────────────────
    if (isDragging.current || Math.abs(dx) > SWIPE_THRESHOLD) {
      // Confirma que é mais horizontal do que vertical
      if (Math.abs(dx) > Math.abs(dy)) {
        setActiveIndex((prev) =>
          circularIndex(dx < 0 ? prev + 1 : prev - 1, albums.length)
        );
      }
      isDragging.current   = false;
      swipeHandled.current = true;
      return;
    }

    // ── CLIQUE / TOQUE ────────────────────────────────────────────────────────
    // Se não foi swipe, trata como clique normal diretamente no PointerUp.
    // Isso evita o bug do iOS/Mobile Safari que engole o evento 'click' 
    // quando o elemento tem estilos de :hover (group-hover).
    isDragging.current   = false;
    swipeHandled.current = false;

    const target = e.target as HTMLElement;
    const card = target.closest('[data-album-index]');
    if (card) {
      const idxStr = card.getAttribute('data-album-index');
      if (idxStr !== null) {
        const clickedIdx = parseInt(idxStr, 10);
        const dist = circularDistance(activeIndex, clickedIdx, albums.length);
        const isActive = dist === 0;

        if (isActive) {
          setSelectedAlbumIndex(clickedIdx);
        } else {
          lastNavigatedAt.current = Date.now();
          goToIndex(clickedIdx, albums.length);
        }
      }
    }
  }, [albums.length, activeIndex, goToIndex]);

  const onPointerCancel = useCallback(() => {
    dragStartX.current   = null;
    dragStartY.current   = null;
    isDragging.current   = false;
    swipeHandled.current = false;
  }, []);

  // Teclado (acessibilidade)
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      setActiveIndex((prev) => circularIndex(prev + 1, albums.length));
    } else if (e.key === 'ArrowLeft') {
      setActiveIndex((prev) => circularIndex(prev - 1, albums.length));
    }
  }, [albums.length]);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-white/50 animate-pulse">
        Revelando memórias...
      </div>
    );
  }
  if (albums.length === 0) return null;

  const getCover = (album: Album): string | null => {
    if (album.cover || album.coverThumb || album.coverLarge)
      return album.cover || album.coverThumb || album.coverLarge || null;
    if (album.coverPublicId) return cloudinaryUrl(album.coverPublicId, { w: 300 });
    return null;
  };

  // Generates a srcset for carousel card images (card width = 240px)
  const getCoverSrcSet = (album: Album): string | null => {
    if (!album.coverPublicId) return null;
    return cloudinaryResponsiveSrcSet(album.coverPublicId, [300, 480, 600]);
  };

  const CARD_W = 240;
  const GAP    = 24;
  const CARD_H = 340;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Carrossel */}
      <div
        ref={containerRef}
        className="w-full relative py-10 select-none outline-none"
        style={{ height: CARD_H + 80, touchAction: 'pan-y' }}
        // Pointer events unificados (mouse + touch + stylus)
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onKeyDown={onKeyDown}
        tabIndex={0}
        aria-label="Carrossel de álbuns"
      >
        {/* Stage: perspectiva 3D centralizada */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ perspective: 1000 }}
        >
          {albums.map((album, realIdx) => {
            const dist  = circularDistance(activeIndex, realIdx, albums.length);
            const style = getCardStyle(dist, CARD_W, GAP);
            const isActive = dist === 0;
            const coverSrc = getCover(album);

            const coverSrcSet = getCoverSrcSet(album);

            return (
              <div
                key={album.id}
                data-album-index={realIdx}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isActive) {
                    setSelectedAlbumIndex(realIdx);
                  } else {
                    lastNavigatedAt.current = Date.now();
                    goToIndex(realIdx, albums.length);
                  }
                }}
                className="absolute group select-none"
                style={{
                  width:   CARD_W,
                  height:  CARD_H,
                  transform: `
                    translateX(${style.translateX}px)
                    translateZ(${style.translateZ}px)
                    rotateY(${style.rotateY}deg)
                    scale(${style.scale})
                  `,
                  opacity:    style.opacity,
                  zIndex:     style.zIndex,
                  visibility: style.hidden ? 'hidden' : 'visible',
                  transition: 'transform 0.4s cubic-bezier(0.25,0.8,0.25,1), opacity 0.4s ease',
                  cursor:     'pointer',
                  willChange: 'transform, opacity',
                  touchAction: 'manipulation',
                }}
              >
                <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/10">
                  {coverSrc ? (
                    <img
                      src={coverSrc}
                      srcSet={coverSrcSet || undefined}
                      sizes="240px"
                      alt={album.title}
                      loading="lazy"
                      className={`w-full h-full object-cover transition-transform duration-700 ${isActive ? 'group-hover:scale-105' : ''}`}
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center">
                      <Images className="w-16 h-16 text-white/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent pointer-events-none" />
                  <div className="absolute bottom-0 inset-x-0 p-5 pointer-events-none">
                    <h3 className="text-white font-bold text-lg drop-shadow-lg mb-1 leading-tight">{album.title}</h3>
                    {album.date && <p className="text-white/70 text-xs">{album.date}</p>}
                    <p className="text-slate-300 text-xs mt-1">{album.photos.length} fotos</p>
                  </div>
                  {isActive && (
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-black/20 backdrop-blur-[2px] pointer-events-none">
                      <span className="bg-white/20 backdrop-blur-md text-white text-sm font-semibold px-6 py-3 rounded-full border border-white/30">
                        Abrir álbum
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal — com AnimatePresence para fade suave */}
      <AnimatePresence>
        {selectedAlbumIndex !== null && (
          <AlbumViewerModal
            albums={albums}
            initialAlbumIndex={selectedAlbumIndex}
            onClose={() => setSelectedAlbumIndex(null)}
            onAlbumChange={(idx) => setActiveIndex(circularIndex(idx, albums.length))}
          />
        )}
      </AnimatePresence>
    </>
  );
}
