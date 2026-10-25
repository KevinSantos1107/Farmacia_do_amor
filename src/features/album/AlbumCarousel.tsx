import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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
  srcLarge?: string;
  srcThumb?: string;
}

/**
 * AlbumSummary — dados mínimos necessários para renderizar o carrossel.
 * NÃO inclui o array de fotos (que é grande e lento de carregar).
 * Inclui apenas photoCount para exibir "N fotos" no card.
 */
interface AlbumSummary {
  id: string;
  title: string;
  description?: string;
  date?: string;
  cover?: string;
  coverThumb?: string;
  coverLarge?: string;
  coverPublicId?: string;
  /** Contagem de fotos, salva no documento do álbum — evita buscar album_photos. */
  photoCount: number;
  /** Fotos carregadas sob demanda ao abrir o álbum. Null = ainda não carregado. */
  photos: Photo[] | null;
}

import { circularIndex, circularDistance, getCardStyle } from './albumCarouselMath';

// ─── Carousel component ───────────────────────────────────────────────────────

export function AlbumCarousel() {
  const { config } = useSiteConfigStore();

  // Dados
  const [albums, setAlbums]   = useState<AlbumSummary[]>([]);
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
  const didSwipe        = useRef(false);   // true quando o ponteiro realizou swipe (evita falso clique)
  const lastNavigatedAt = useRef(0);       // timestamp da última navegação lateral

  // ─── Navegação ─────────────────────────────────────────────────────────────

  const goToIndex = useCallback((index: number, total: number) => {
    lastNavigatedAt.current = Date.now();
    setActiveIndex(circularIndex(index, total));
  }, []);

  // ─── Fetch de álbuns e fotos antecipadas ──────────────────────────────────
  // Busca metadados dos álbuns E todas as fotos antecipadamente em paralelo.
  // Como são apenas ~10 documentos de fotos (menos de 20KB de dados JSON),
  // carregar tudo no mount elimina 100% de qualquer espera de rede ou hang de
  // WebChannel/Firestore no iPhone/iOS ao clicar para abrir um álbum (0ms de atraso).

  useEffect(() => {
    let isMounted = true;
    const fetchAlbums = async () => {
      try {
        const [albumSnapshot, photoSnapshot] = await Promise.all([
          getDocs(query(siteCollection('albums'), orderBy('orderIndex', 'asc'))),
          getDocs(siteCollection('album_photos')),
        ]);
        if (!isMounted) return;

        const validDocs = albumSnapshot.docs.filter((d) => !d.id.startsWith('_'));
        if (validDocs.length === 0) {
          setAlbums([]);
          setLoading(false);
          return;
        }

        // Mapeia todas as fotos por albumId antecipadamente
        const photosByAlbum: Record<string, Photo[]> = {};
        photoSnapshot.docs
          .filter((pDoc) => !pDoc.id.startsWith('_'))
          .sort((a, b) => (a.data().pageNumber ?? 0) - (b.data().pageNumber ?? 0))
          .forEach((pDoc) => {
            const data = pDoc.data();
            const aid = data.albumId;
            if (!aid) return;
            if (!photosByAlbum[aid]) photosByAlbum[aid] = [];
            if (Array.isArray(data.photos)) {
              photosByAlbum[aid].push(...data.photos);
            }
          });

        const loaded: AlbumSummary[] = validDocs.map((doc) => {
          const d = doc.data();
          const photos = photosByAlbum[doc.id] ?? [];
          // Preenche cache em memória para responder instantaneamente no modal
          photoCacheRef.current[doc.id] = photos;
          return {
            id: doc.id,
            title: d.title,
            description: d.description,
            date: d.date,
            cover: d.cover,
            coverThumb: d.coverThumb,
            coverLarge: d.coverLarge,
            coverPublicId: d.coverPublicId,
            photoCount: d.photoCount ?? photos.length,
            photos,
          };
        });

        setAlbums(loaded);
      } catch (e) {
        console.error('Erro ao carregar álbuns:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchAlbums();
    return () => {
      isMounted = false;
    };
  }, [config?.id]);

  // ─── Lazy-load / fallback de fotos ───────────────────────────────────────
  // Mantido como fallback caso algum álbum novo não tenha vindo no snapshot inicial.

  /** Cache em memória: albumId → fotos carregadas */
  const photoCacheRef = useRef<Record<string, Photo[] | undefined>>({});
  /** Promessas em voo — evita fetch duplicado para o mesmo álbum */
  const loadingPromiseRef = useRef<Record<string, Promise<Photo[]> | undefined>>({});

  const loadAlbumPhotos = useCallback(async (albumId: string): Promise<Photo[]> => {
    // 1. Cache hit — fotos já carregadas no mount inicial (resposta imediata)
    const cached = photoCacheRef.current[albumId];
    if (cached !== undefined) {
      return cached;
    }

    // 2. Fetch já em andamento — aguarda a mesma promise
    const existingPromise = loadingPromiseRef.current[albumId];
    if (existingPromise !== undefined) {
      return existingPromise;
    }

    // 3. Fallback: novo fetch
    const fetchPromise = (async (): Promise<Photo[]> => {
      try {
        const photoSnapshots = await getDocs(
          query(
            siteCollection('album_photos'),
            where('albumId', '==', albumId)
          )
        );
        const sortedPages = photoSnapshots.docs
          .filter((pDoc) => !pDoc.id.startsWith('_'))
          .sort((a, b) => (a.data().pageNumber ?? 0) - (b.data().pageNumber ?? 0));

        const allPhotos: Photo[] = [];
        sortedPages.forEach((pageDoc) => {
          const pd = pageDoc.data();
          if (Array.isArray(pd.photos)) allPhotos.push(...pd.photos);
        });

        // Salva no cache de ref (sem causar re-render)
        photoCacheRef.current[albumId] = allPhotos;
        // Atualiza o estado para o carrossel exibir o count correto
        setAlbums((prev) =>
          prev.map((a) => (a.id === albumId ? { ...a, photos: allPhotos } : a))
        );
        return allPhotos;
      } catch (e) {
        console.error('Erro ao carregar fotos do álbum:', albumId, e);
        return [];
      } finally {
        delete loadingPromiseRef.current[albumId];
      }
    })();

    loadingPromiseRef.current[albumId] = fetchPromise;
    return fetchPromise;
  }, []);

  // ─── Pointer events (swipe) & Clique ─────────────────────────────────────
  // O gesto de arrasto (swipe) é tratado no container para permitir navegar
  // suavemente deslizando para os lados.
  // Já o clique/toque de abertura é tratado diretamente no onClick nativo de
  // cada card, evitando que o iOS/WebKit engula toques via pointercancel
  // durante micro-movimentos ou rolagem vertical da página.

  const SWIPE_THRESHOLD = 30; // px

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
    isDragging.current = false;
    didSwipe.current   = false;
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      isDragging.current = true;
      didSwipe.current   = true;
    }
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (dragStartX.current === null) return;

    const dx = e.clientX - dragStartX.current;
    const dy = e.clientY - (dragStartY.current ?? e.clientY);

    dragStartX.current = null;
    dragStartY.current = null;

    // ── SWIPE ────────────────────────────────────────────────────────────────
    if (isDragging.current || Math.abs(dx) > SWIPE_THRESHOLD) {
      if (Math.abs(dx) > Math.abs(dy)) {
        didSwipe.current = true;
        lastNavigatedAt.current = Date.now();
        setActiveIndex((prev) =>
          circularIndex(dx < 0 ? prev + 1 : prev - 1, albums.length)
        );
      }
      isDragging.current = false;
      return;
    }

    isDragging.current = false;
  }, [albums.length]);

  const onPointerCancel = useCallback(() => {
    dragStartX.current = null;
    dragStartY.current = null;
    isDragging.current = false;
  }, []);

  // Clique direto no card — 100% confiável no mobile/iOS Safari e Android
  const handleCardClick = useCallback((clickedIdx: number) => {
    // Se o usuário realizou um swipe recente, descarta o clique subsequente
    if (didSwipe.current) {
      didSwipe.current = false;
      return;
    }
    const dist = circularDistance(activeIndex, clickedIdx, albums.length);
    if (dist === 0) {
      // Card central ativo: abre o visualizador imediatamente
      setSelectedAlbumIndex(clickedIdx);
    } else {
      // Card lateral: rotaciona para centralizá-lo
      lastNavigatedAt.current = Date.now();
      goToIndex(clickedIdx, albums.length);
    }
  }, [activeIndex, albums.length, goToIndex]);

  // Teclado (acessibilidade)
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      goToIndex(activeIndex + 1, albums.length);
    } else if (e.key === 'ArrowLeft') {
      goToIndex(activeIndex - 1, albums.length);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedAlbumIndex(activeIndex);
    }
  }, [albums.length, activeIndex, goToIndex]);

  // Constrói o array de álbuns com fotos para o modal (memoizado ANTES de early returns)
  const albumsForModal = useMemo(
    () =>
      albums.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        date: a.date,
        photos: a.photos ?? [],
      })),
    [albums]
  );

  // ─── Helpers ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-white/50 animate-pulse">
        Revelando memórias...
      </div>
    );
  }
  if (albums.length === 0) return null;

  const getCover = (album: AlbumSummary): string | null => {
    if (album.cover || album.coverThumb || album.coverLarge)
      return album.cover || album.coverThumb || album.coverLarge || null;
    if (album.coverPublicId) return cloudinaryUrl(album.coverPublicId, { w: 300 });
    return null;
  };

  // Generates a srcset for carousel card images (card width = 240px)
  const getCoverSrcSet = (album: AlbumSummary): string | null => {
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
          style={{
            perspective: 1000,
            // Libera memória de GPU no iPhone ocultando a perspectiva 3D enquanto o modal estiver aberto
            visibility: selectedAlbumIndex !== null ? 'hidden' : 'visible',
          }}
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
                onClick={() => handleCardClick(realIdx)}
                role="button"
                tabIndex={0}
                aria-label={`Abrir álbum ${album.title}`}
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
                  transition: 'transform 0.25s cubic-bezier(0.25,1,0.5,1), opacity 0.25s ease',
                  cursor:     'pointer',
                  willChange: style.hidden ? undefined : 'transform, opacity',
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
                      decoding="async"
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
                    <p className="text-slate-300 text-xs mt-1">{album.photoCount} fotos</p>
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
            albums={albumsForModal}
            initialAlbumIndex={selectedAlbumIndex}
            onLoadPhotos={loadAlbumPhotos}
            onClose={() => {
              lastNavigatedAt.current = Date.now();
              setSelectedAlbumIndex(null);
            }}
            onAlbumChange={(idx) => setActiveIndex(circularIndex(idx, albums.length))}
          />
        )}
      </AnimatePresence>
    </>
  );
}
