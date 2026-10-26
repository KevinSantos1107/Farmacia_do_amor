import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { query, orderBy, getDocs, where } from 'firebase/firestore';
import { siteCollection, getDataLayout } from '../../services/firestore/paths';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import { AlbumViewerModal } from './AlbumViewerModal';
import { Images } from 'lucide-react';
import { cloudinaryUrl, cloudinaryResponsiveSrcSet } from '../../services/cloudinary/upload';
import { AnimatePresence } from 'framer-motion';
import { circularIndex, circularDistance, getCardStyle } from './albumCarouselMath';
import { getPhotoUrl, normalizeCloudinaryUrl } from './photoUrl';
import { listCollectionDocs, queryAlbumPhotoPages } from './firestoreRest';

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
 * Contém o array de fotos (pré-carregado ou cacheado) para abertura instantânea (0ms).
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
  photoCount: number;
  photos: Photo[] | null;
}

// ─── Cache & REST API Helpers para iOS / WebKit ─────────────────────────────
// No iOS (Safari e Chrome no iPhone), o WebChannel de streaming do Firestore sofre
// com buffering de HTTP/2 e timeouts de 120s da Google.
// 1. O cache local (localStorage/sessionStorage) permite exibir os cards e abrir o álbum em 0ms.
// 2. A API REST direta (fetch HTTPS simples) responde em ~500ms sem sockets WebChannel.
// 3. O Firestore SDK serve como fallback seguro e universal.

const ALBUMS_CACHE_KEY = 're_albums_cache_v2';

function loadCachedAlbums(): AlbumSummary[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(ALBUMS_CACHE_KEY) || localStorage.getItem(ALBUMS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.albums) && parsed.albums.length > 0) {
      return parsed.albums as AlbumSummary[];
    }
  } catch {
    // ignora erros de parse ou storage restrito
  }
  return null;
}

function saveCachedAlbums(albums: AlbumSummary[]) {
  if (typeof window === 'undefined' || albums.length === 0) return;
  try {
    const payload = JSON.stringify({ timestamp: Date.now(), albums });
    sessionStorage.setItem(ALBUMS_CACHE_KEY, payload);
    localStorage.setItem(ALBUMS_CACHE_KEY, payload);
  } catch {
    // ignora erros de quota excedida
  }
}

function decodeFirestoreValue(val: unknown): unknown {
  if (!val || typeof val !== 'object') return val;
  const obj = val as Record<string, unknown>;
  if ('stringValue' in obj) return obj.stringValue;
  if ('integerValue' in obj) return parseInt(obj.integerValue as string, 10);
  if ('doubleValue' in obj) return parseFloat(obj.doubleValue as string);
  if ('booleanValue' in obj) return obj.booleanValue;
  if ('timestampValue' in obj) return obj.timestampValue;
  if ('nullValue' in obj) return null;
  if ('arrayValue' in obj) {
    const arr = (obj.arrayValue as { values?: unknown[] })?.values || [];
    return arr.map(decodeFirestoreValue);
  }
  if ('mapValue' in obj) {
    const res: Record<string, unknown> = {};
    const fields = ((obj.mapValue as { fields?: Record<string, unknown> })?.fields) || {};
    for (const k in fields) {
      res[k] = decodeFirestoreValue(fields[k]);
    }
    return res;
  }
  return val;
}

function decodeFirestoreDoc(doc: unknown): { id: string; data: Record<string, unknown> } {
  const d = doc as { name?: string; fields?: Record<string, unknown> };
  const parts = (d.name || '').split('/');
  const id = parts[parts.length - 1];
  const data: Record<string, unknown> = {};
  const fields = d.fields || {};
  for (const k in fields) {
    data[k] = decodeFirestoreValue(fields[k]);
  }
  return { id, data };
}

// ─── Carousel component ───────────────────────────────────────────────────────

export function AlbumCarousel() {
  const { config } = useSiteConfigStore();

  // Inicialização Cache-First: se já temos dados no storage, o carrossel nasce pronto em 0ms
  const initialCached = useMemo(() => loadCachedAlbums(), []);

  // Dados
  const [albums, setAlbums]   = useState<AlbumSummary[]>(() => initialCached || []);
  const [loading, setLoading] = useState<boolean>(() => !initialCached || initialCached.length === 0);

  // ── Única fonte de verdade do carrossel ──
  const [activeIndex, setActiveIndex] = useState(0);

  // Modal
  const [selectedAlbumIndex, setSelectedAlbumIndex] = useState<number | null>(null);

  // Cache em memória de fotos indexadas por albumId
  const photoCacheRef = useRef<Record<string, Photo[] | undefined>>({});
  const loadingPromiseRef = useRef<Record<string, Promise<Photo[]> | undefined>>({});

  // Alimenta o cache de fotos em memória com dados pré-carregados do storage local
  if (initialCached && Object.keys(photoCacheRef.current).length === 0) {
    initialCached.forEach((a) => {
      if (a.photos && a.photos.length > 0) {
        photoCacheRef.current[a.id] = a.photos;
      }
    });
  }

  // Swipe & Toque
  const containerRef    = useRef<HTMLDivElement>(null);
  const dragStartX      = useRef<number | null>(null);
  const dragStartY      = useRef<number | null>(null);
  const isDragging      = useRef(false);
  const lastSwipedAt    = useRef(0);       // timestamp do último swipe concluído (evita falso clique sem travar)
  const lastNavigatedAt = useRef(0);       // timestamp da última navegação lateral

  // ─── Navegação ─────────────────────────────────────────────────────────────

  const goToIndex = useCallback((index: number, total: number) => {
    lastNavigatedAt.current = Date.now();
    setActiveIndex(circularIndex(index, total));
  }, []);

  // ─── REST Fetcher direto (Bypassa WebChannel no iOS/Safari) ─────────────────
  const fetchViaRest = useCallback(async (): Promise<AlbumSummary[] | null> => {
    // O REST direto lê as coleções da raiz (layout 'legacy'). No layout 'site' deixa o SDK cuidar.
    if (getDataLayout() === 'site') return null;

    // Timeout geral de 10s: no celular é melhor esperar um pouco o REST do que cair no SDK lento.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      // Busca paginada: antes só vinha a 1ª página (100 docs) e álbuns ficavam sem fotos.
      const [rawAlbumDocs, rawPhotoDocs] = await Promise.all([
        listCollectionDocs('albums', controller.signal),
        listCollectionDocs('album_photos', controller.signal),
      ]);
      clearTimeout(timeoutId);

      // Qualquer falha → null → o fallback (SDK) assume, como antes.
      if (!rawAlbumDocs || !rawPhotoDocs) return null;

      const decodedAlbums = rawAlbumDocs.map(decodeFirestoreDoc).filter((d) => !d.id.startsWith('_'));
      const decodedPhotos = rawPhotoDocs.map(decodeFirestoreDoc).filter((d) => !d.id.startsWith('_'));

      if (decodedAlbums.length === 0) return [];

      // Mapeia todas as fotos por albumId antecipadamente
      const photosByAlbum: Record<string, Photo[]> = {};
      decodedPhotos
        .sort((a, b) => ((a.data.pageNumber as number) ?? 0) - ((b.data.pageNumber as number) ?? 0))
        .forEach((pDoc) => {
          const aid = pDoc.data.albumId as string | undefined;
          if (!aid) return;
          if (!photosByAlbum[aid]) photosByAlbum[aid] = [];
          if (Array.isArray(pDoc.data.photos)) {
            photosByAlbum[aid].push(...(pDoc.data.photos as Photo[]));
          }
        });

      // Ordena álbuns por orderIndex
      decodedAlbums.sort((a, b) => ((a.data.orderIndex as number) ?? 0) - ((b.data.orderIndex as number) ?? 0));

      const loaded: AlbumSummary[] = decodedAlbums.map((doc) => {
        const d = doc.data;
        const photos = photosByAlbum[doc.id] ?? [];
        photoCacheRef.current[doc.id] = photos;
        return {
          id: doc.id,
          title: (d.title as string) || '',
          description: d.description as string | undefined,
          date: d.date as string | undefined,
          cover: d.cover as string | undefined,
          coverThumb: d.coverThumb as string | undefined,
          coverLarge: d.coverLarge as string | undefined,
          coverPublicId: d.coverPublicId as string | undefined,
          photoCount: (d.photoCount as number) ?? photos.length,
          photos,
        };
      });

      return loaded;
    } catch {
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  // ─── Fetch de álbuns e fotos antecipadas ──────────────────────────────────
  // No layout 'legacy' os dados não dependem do siteId, então a busca roda UMA vez só.
  // (Antes, `config?.id` na dependência disparava a busca completa duas vezes ao carregar a config.)
  const dataScopeKey = getDataLayout() === 'site' ? (config?.id ?? '') : 'legacy';
  useEffect(() => {
    let isMounted = true;
    const fetchAlbums = async () => {
      // 1. Tenta REST API direta primeiro (resposta em ~500ms sem travar em WebChannel no iPhone)
      try {
        const restResult = await fetchViaRest();
        if (restResult && isMounted) {
          setAlbums(restResult);
          saveCachedAlbums(restResult);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('REST API fallback to SDK:', err);
      }

      // 2. Fallback: Firestore SDK getDocs
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
        saveCachedAlbums(loaded);
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
  }, [dataScopeKey, fetchViaRest]);

  // ─── Lazy-load / fallback de fotos ───────────────────────────────────────
  const loadAlbumPhotos = useCallback(async (albumId: string): Promise<Photo[]> => {
    console.time(`⏱️ [AlbumCarousel] loadAlbumPhotos(${albumId})`);
    // 1. Cache hit em memória — fotos já carregadas (resposta imediata em 0ms)
    const cached = photoCacheRef.current[albumId];
    if (cached !== undefined && cached.length > 0) {
      console.log(`⚡ [AlbumCarousel] Cache hit para ${albumId}: ${cached.length} fotos`);
      console.timeEnd(`⏱️ [AlbumCarousel] loadAlbumPhotos(${albumId})`);
      return cached;
    }

    // 2. Fetch já em andamento — aguarda a mesma promise
    const existingPromise = loadingPromiseRef.current[albumId];
    if (existingPromise !== undefined) {
      console.log(`⏳ [AlbumCarousel] Aguardando busca já em andamento para ${albumId}`);
      return existingPromise;
    }

    // 3. Busca só as fotos deste álbum via REST runQuery (sem limite de paginação e sem exigir
    //    índice composto). Se falhar, cai no SDK do Firestore como antes.
    const fetchPromise = (async (): Promise<Photo[]> => {
      try {
        if (getDataLayout() !== 'site') {
          console.log(`🌐 [AlbumCarousel] Buscando fotos via REST runQuery para ${albumId}...`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            console.warn(`⏰ [AlbumCarousel] Timeout de 8s estourou no REST para ${albumId}`);
            controller.abort();
          }, 8000);
          try {
            const rawDocs = await queryAlbumPhotoPages(albumId, controller.signal);
            if (rawDocs) {
              const photos: Photo[] = [];
              rawDocs
                .map(decodeFirestoreDoc)
                .filter((d) => !d.id.startsWith('_'))
                .sort((a, b) => ((a.data.pageNumber as number) ?? 0) - ((b.data.pageNumber as number) ?? 0))
                .forEach((d) => {
                  if (Array.isArray(d.data.photos)) {
                    photos.push(...(d.data.photos as Photo[]));
                  }
                });

              console.log(`✅ [AlbumCarousel] REST runQuery retornou ${photos.length} fotos para ${albumId}`);
              photoCacheRef.current[albumId] = photos;
              if (photos.length > 0) {
                setAlbums((prev) =>
                  prev.map((a) => (a.id === albumId ? { ...a, photos } : a))
                );
              }
              console.timeEnd(`⏱️ [AlbumCarousel] loadAlbumPhotos(${albumId})`);
              return photos;
            }
          } catch (restErr) {
            console.warn(`⚠️ [AlbumCarousel] Falha REST para ${albumId}:`, restErr);
          } finally {
            clearTimeout(timeoutId);
          }
        }

        console.log(`🔄 [AlbumCarousel] Fallback: buscando via SDK Firestore getDocs para ${albumId}...`);
        // Fallback SDK getDocs
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

        console.log(`✅ [AlbumCarousel] SDK Firestore retornou ${allPhotos.length} fotos para ${albumId}`);
        photoCacheRef.current[albumId] = allPhotos;
        setAlbums((prev) =>
          prev.map((a) => (a.id === albumId ? { ...a, photos: allPhotos } : a))
        );
        console.timeEnd(`⏱️ [AlbumCarousel] loadAlbumPhotos(${albumId})`);
        return allPhotos;
      } catch (e) {
        console.error('❌ [AlbumCarousel] Erro fatal ao carregar fotos do álbum:', albumId, e);
        console.timeEnd(`⏱️ [AlbumCarousel] loadAlbumPhotos(${albumId})`);
        return [];
      } finally {
        delete loadingPromiseRef.current[albumId];
      }
    })();

    loadingPromiseRef.current[albumId] = fetchPromise;
    return fetchPromise;
  }, []);

  // ─── Pré-carrega a primeira foto do álbum que está centralizado ────────────
  // Usa `new Image()` (funciona em TODOS os navegadores, inclusive Safari/iPhone) e a MESMA
  // função getPhotoUrl do modal, então a imagem baixada aqui é exatamente a que o modal vai
  // exibir. Substitui o antigo <link rel="prefetch">, que o Safari do iPhone ignora.
  const warmedUrlsRef = useRef<Set<string>>(new Set());
  const warmedImagesRef = useRef<HTMLImageElement[]>([]);
  useEffect(() => {
    if (albums.length === 0) return;
    const album = albums[activeIndex];
    if (!album) return;

    const photos = album.photos ?? photoCacheRef.current[album.id];
    if (!photos || photos.length === 0) return;

    const url = getPhotoUrl(photos[0]);
    if (!url || url.length < 10 || warmedUrlsRef.current.has(url)) return;
    warmedUrlsRef.current.add(url);

    const img = new Image();
    img.decoding = 'async';
    // Só remove do array após o download terminar, evitando que o GC do Safari/iOS
    // descarte a Image antes do download completar (sem referência → GC coleta).
    const onDone = () => {
      const idx = warmedImagesRef.current.indexOf(img);
      if (idx !== -1) warmedImagesRef.current.splice(idx, 1);
    };
    img.onload = onDone;
    img.onerror = onDone;
    img.src = url;
    // Mantém referência forte enquanto o download não terminar
    warmedImagesRef.current.push(img);
    // Limita o array a 12 entradas (apenas as mais recentes) para evitar vazamento de memória
    if (warmedImagesRef.current.length > 12) warmedImagesRef.current.shift();
  }, [activeIndex, albums]);

  // ─── Pointer events (swipe) & Clique ─────────────────────────────────────
  const SWIPE_THRESHOLD = 30; // px

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
    isDragging.current = false;
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      isDragging.current = true;
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
        lastSwipedAt.current = Date.now();
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
    console.log(`📸 [AlbumCarousel] Clique no card ${clickedIdx}, activeIndex: ${activeIndex}`);
    // Se o usuário realizou um swipe nos últimos 250ms, descarta o clique
    if (Date.now() - lastSwipedAt.current < 250) {
      console.warn('⚠️ [AlbumCarousel] Clique ignorado: swipe recente (< 250ms)');
      return;
    }
    const dist = circularDistance(activeIndex, clickedIdx, albums.length);
    if (dist === 0) {
      // Card central ativo: abre o visualizador imediatamente
      console.log(`🚀 [AlbumCarousel] Abrindo modal do álbum index: ${clickedIdx}, id: ${albums[clickedIdx]?.id}, title: "${albums[clickedIdx]?.title}"`);
      console.log(`📊 [AlbumCarousel] Fotos disponíveis no card antes de abrir:`, albums[clickedIdx]?.photos?.length ?? 0);
      setSelectedAlbumIndex(clickedIdx);
    } else {
      // Card lateral: rotaciona para centralizá-lo
      console.log(`🔄 [AlbumCarousel] Rotacionando carrossel para card ${clickedIdx}`);
      lastNavigatedAt.current = Date.now();
      goToIndex(clickedIdx, albums.length);
    }
  }, [activeIndex, albums, goToIndex]);

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
  // Garante que se photoCacheRef tiver as fotos, elas são passadas imediatamente
  // coverUrl: URL da capa pequena (300px) já carregada no carrossel — usada como placeholder borrado
  const albumsForModal = useMemo(
    () =>
      albums.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        date: a.date,
        coverUrl: normalizeCloudinaryUrl(a.cover || a.coverThumb || (a.coverPublicId ? cloudinaryUrl(a.coverPublicId, { w: 300, f: 'webp' }) : '')),
        photos: a.photos ?? photoCacheRef.current[a.id] ?? [],
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
            WebkitPerspective: 1000,
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
                  WebkitTransform: `
                    translateX(${style.translateX}px)
                    translateZ(${style.translateZ}px)
                    rotateY(${style.rotateY}deg)
                    scale(${style.scale})
                  `,
                  transformStyle: 'preserve-3d',
                  WebkitTransformStyle: 'preserve-3d',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  WebkitTapHighlightColor: 'transparent',
                  opacity:    style.opacity,
                  zIndex:     style.zIndex,
                  visibility: style.hidden ? 'hidden' : 'visible',
                  transition: 'transform 0.25s cubic-bezier(0.25,1,0.5,1), opacity 0.25s ease',
                  cursor:     'pointer',
                  // `willChange` só no card ativo: nos laterais cria camadas GPU desnecessárias
                  // que esgotam a memória de compositor do iPhone, causando tela preta.
                  willChange: isActive ? 'transform, opacity' : undefined,
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
            key="album-viewer-modal"
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
