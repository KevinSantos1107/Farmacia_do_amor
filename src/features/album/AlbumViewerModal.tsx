import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { cn } from '../../shared/utils/cn';
import { lockBodyScroll } from '../../shared/utils/scrollLock';
import { imagePreloader } from './ImagePreloader';
import { getPhotoUrl } from './photoUrl';
import { useOverlayHistory } from '../../shared/hooks/useOverlayHistory';

interface Photo {
  id?: string;
  src?: string;
  url?: string;
  srcLarge?: string;   // Campo legado do site antigo — versão 1600px
  srcThumb?: string;   // Campo legado — thumbnail
  description?: string;
  caption?: string;
  publicId?: string;
}

interface Album {
  id: string;
  title: string;
  description?: string;
  date?: string;
  photos: Photo[];
  /** URL da capa pequena (300px) do carrossel — usada como placeholder borrado na primeira foto */
  coverUrl?: string;
}

interface AlbumViewerModalProps {
  albums: Album[];
  initialAlbumIndex: number;
  onClose: () => void;
  onAlbumChange?: (index: number) => void;
  /**
   * Callback para carregar as fotos de um álbum sob demanda.
   * Chamado apenas quando o álbum é aberto pela primeira vez.
   * Retorna o array de fotos que deve ser adicionado ao álbum correspondente.
   */
  onLoadPhotos?: (albumId: string) => Promise<Photo[]>;
}

// ─── Helper para Detecção Mobile & URL da foto ──────────────────────────────
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

// getPhotoUrl agora vive em ./photoUrl (fonte única da URL da foto, compartilhada com o carrossel)

// ─── Foto com Pinch to Zoom, Pan e Placeholder de Carregamento ───────────────
// placeholderSrc: URL da capa pequena (300px) já em memória do carrossel.
// Exibida borrada enquanto a foto full carrega, evitando tela preta no iPhone.
function ZoomableImage({ src, alt, placeholderSrc }: { src: string; alt: string; placeholderSrc?: string }) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  
  const initialGesto = useRef<{
    scale: number;
    panX: number;
    panY: number;
    distance: number;
    centerX: number;
    centerY: number;
  } | null>(null);

  const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const getCenter = (p1: { x: number; y: number }, p2: { x: number; y: number }) => ({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 });

  // Ao trocar de foto, reseta zoom, pan e estado de carregamento.
  // ATENÇÃO: se a imagem já está no cache do browser, o onLoad dispara ANTES
  // deste efeito. Por isso, após resetar, verificamos img.complete imediatamente
  // para não travar o spinner indefinidamente em fotos que já estavam em cache.
  useEffect(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    pointers.current.clear();
    initialGesto.current = null;
    setFailed(false);

    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      // Já carregada do cache — marca como loaded imediatamente
      setLoaded(true);
    } else {
      setLoaded(false);
    }
  }, [src]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = Array.from(pointers.current.values());

    if (scale > 1 || pts.length >= 2) {
      e.stopPropagation();
      
      const target = e.currentTarget as HTMLDivElement;
      
      // Rouba o controle absoluto do ponteiro para a imagem
      pointers.current.forEach((_, id) => {
        try { target.setPointerCapture(id); } catch {}
      });

      if (pts.length === 2) {
        initialGesto.current = {
          scale, panX: pan.x, panY: pan.y,
          distance: getDistance(pts[0], pts[1]),
          centerX: getCenter(pts[0], pts[1]).x,
          centerY: getCenter(pts[0], pts[1]).y,
        };
      } else if (pts.length === 1 && scale > 1) {
        initialGesto.current = {
          scale, panX: pan.x, panY: pan.y, distance: 1,
          centerX: pts[0].x, centerY: pts[0].y,
        };
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;

    if (scale > 1 || pointers.current.size >= 2) {
      e.stopPropagation(); // Bloqueia propagação pro modal pai
    } else {
      return; // Deixa vazar (1 dedo, scale 1 -> swipe normal do modal)
    }

    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = Array.from(pointers.current.values());

    if (pts.length === 2 && initialGesto.current) {
      // ── Pinch to Zoom ──
      const { distance: startDist, scale: startScale, panX, panY, centerX: startCx, centerY: startCy } = initialGesto.current;
      const curDist = getDistance(pts[0], pts[1]);
      const curCenter = getCenter(pts[0], pts[1]);
      
      let newScale = startScale * (curDist / startDist);
      if (newScale < 1) newScale = 1;
      if (newScale > 4) newScale = 4;

      const dx = curCenter.x - startCx;
      const dy = curCenter.y - startCy;

      // Ilusão de origin-transform no centro do pinch
      const rect = containerRef.current!.getBoundingClientRect();
      const originX = startCx - (rect.left + rect.width / 2);
      const originY = startCy - (rect.top + rect.height / 2);
      
      const scaleRatio = newScale / startScale;
      let newPanX = panX + dx - originX * (scaleRatio - 1);
      let newPanY = panY + dy - originY * (scaleRatio - 1);

      // Clamp (limites da imagem)
      const maxTx = Math.max(0, (rect.width * newScale - window.innerWidth) / 2);
      const maxTy = Math.max(0, (rect.height * newScale - window.innerHeight) / 2);

      newPanX = Math.max(-maxTx, Math.min(newPanX, maxTx));
      newPanY = Math.max(-maxTy, Math.min(newPanY, maxTy));

      setScale(newScale);
      setPan({ x: newPanX, y: newPanY });

    } else if (pts.length === 1 && initialGesto.current && scale > 1) {
      // ── Pan ──
      const dx = pts[0].x - initialGesto.current.centerX;
      const dy = pts[0].y - initialGesto.current.centerY;

      const rect = containerRef.current!.getBoundingClientRect();
      const maxTx = Math.max(0, (rect.width * scale - window.innerWidth) / 2);
      const maxTy = Math.max(0, (rect.height * scale - window.innerHeight) / 2);

      let newPanX = initialGesto.current.panX + dx;
      let newPanY = initialGesto.current.panY + dy;

      newPanX = Math.max(-maxTx, Math.min(newPanX, maxTx));
      newPanY = Math.max(-maxTy, Math.min(newPanY, maxTy));

      setPan({ x: newPanX, y: newPanY });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);

    try {
      if ((e.currentTarget as HTMLDivElement).hasPointerCapture?.(e.pointerId)) {
        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      }
    } catch {}
    
    if (scale > 1) e.stopPropagation();

    if (pointers.current.size === 1 && scale > 1) {
      const remainingPt = Array.from(pointers.current.values())[0];
      initialGesto.current = {
        scale, panX: pan.x, panY: pan.y, distance: 1,
        centerX: remainingPt.x, centerY: remainingPt.y,
      };
      return;
    }

    if (pointers.current.size === 0) {
      initialGesto.current = null;
      // Usuário soltou todos os dedos: reseta suavemente o zoom e o pan para o estado original
      setScale(1);
      setPan({ x: 0, y: 0 });
    }
  };

  const isZoomedOrPanning = scale > 1 || pan.x !== 0 || pan.y !== 0;

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center relative select-none overflow-hidden touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* Placeholder borrado (capa 300px já em cache no carrossel) — aparece instantaneamente
          e desaparece com fade quando a foto full termina de carregar.
          Elimina a tela preta "a frio" no iPhone sem nenhum custo de rede adicional. */}
      {!loaded && !failed && placeholderSrc && (
        <img
          src={placeholderSrc}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ filter: 'blur(12px)', transform: 'scale(1.08)', WebkitBackfaceVisibility: 'hidden' }}
        />
      )}
      {/* Spinner discreto por cima do placeholder enquanto foto full carrega */}
      {!loaded && !failed && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white/80 animate-spin" />
        </div>
      )}
      {/* Foto que não existe mais (404) ou falhou ao baixar: mostra aviso em vez de tela preta */}
      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 text-center pointer-events-none z-10">
          <p className="text-white/80 text-base font-medium">Foto indisponível</p>
          <p className="text-white/40 text-xs">Toque na lateral para ir para a próxima.</p>
        </div>
      )}
      {/* Imagem com troca direta e instantânea, sem piscar e sem animação */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        draggable={false}
        decoding="async"
        onLoad={() => { setFailed(false); setLoaded(true); }}
        onError={() => { setFailed(true); setLoaded(true); }}
        className="max-w-full max-h-full object-contain pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          willChange: isZoomedOrPanning ? 'transform' : undefined,
          WebkitBackfaceVisibility: 'hidden',
          opacity: loaded && !failed ? 1 : 0,
          transition: loaded ? 'opacity 0.2s ease' : 'none',
        }}
      />
    </div>
  );
}

// ─── Painel de um álbum ───────────────────────────────────────────────────────
function AlbumPanel({
  album,
  photoIndex,
  onClose,
  isLoading,
  coverUrl,
}: {
  album: Album | undefined;
  photoIndex: number;
  onClose?: () => void;
  isLoading?: boolean;
  /** URL da capa pequena (300px) do carrossel, usada como placeholder borrado */
  coverUrl?: string;
}) {
  // Enquanto as fotos estão sendo carregadas, exibe um skeleton discreto
  if (isLoading) {
    return (
      <div className="w-full h-full bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
        <p className="text-white/50 text-sm">{album?.title || 'Carregando álbum...'}</p>
      </div>
    );
  }

  if (!album || !album.photos || album.photos.length === 0) {
    return (
      <div className="w-full h-full bg-black flex flex-col items-center justify-center p-6 text-center">
        <p className="text-white/80 text-lg font-medium mb-2">
          {album?.title || 'Álbum'}
        </p>
        <p className="text-white/50 text-sm mb-6 max-w-xs">
          Este álbum ainda não possui fotos adicionadas.
        </p>
        {onClose && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            data-no-gesture
            className="px-6 py-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white font-semibold text-sm border border-white/30 active:scale-95 transition-transform"
            style={{ touchAction: 'manipulation' }}
          >
            Voltar
          </button>
        )}
      </div>
    );
  }

  const photo = album.photos[photoIndex];
  const url = photo ? getPhotoUrl(photo) : '';
  const caption = photo?.caption || photo?.description;

  return (
    <div className="w-full h-full relative bg-black flex items-center justify-center">
      {/* Barras de progresso com transição fluida nativa estilo Instagram (respeita Dynamic Island / Notch) */}
      <div
        className="absolute inset-x-0 z-50 flex gap-[3px] px-4 drop-shadow-md pointer-events-none"
        style={{
          top: 'max(1rem, calc(env(safe-area-inset-top, 0px) + 0.5rem))',
        }}
      >
        {album.photos.length <= 30 ? (
          album.photos.map((_, i) => (
            <div key={i} className="flex-1 h-[3px] bg-white/25 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full bg-white rounded-full transition-transform duration-200 origin-left',
                  i <= photoIndex ? 'scale-x-100' : 'scale-x-0'
                )}
              />
            </div>
          ))
        ) : (
          <div className="w-full h-[3px] bg-white/25 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-200 origin-left"
              style={{ width: `${((photoIndex + 1) / album.photos.length) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Título (respeita safe-area-inset do iPhone) */}
      <div
        className="absolute left-4 z-50 pointer-events-none"
        style={{
          top: 'max(2.25rem, calc(env(safe-area-inset-top, 0px) + 1.6rem))',
        }}
      >
        <p className="text-white/90 font-semibold text-sm drop-shadow">{album.title}</p>
      </div>

      {/* Foto customizada com Zoom & Pan isolados */}
      {url && <ZoomableImage src={url} alt={caption || `Foto ${photoIndex + 1}`} placeholderSrc={coverUrl} />}

      {/* Legenda (respeita barra de navegação/Home indicator do iOS) */}
      {caption && (
        <div
          className="absolute inset-x-0 flex justify-center px-6 pointer-events-none"
          style={{
            bottom: 'max(2rem, calc(env(safe-area-inset-bottom, 0px) + 1rem))',
          }}
        >
          <div className="bg-neutral-900/90 text-white text-sm px-4 py-2 rounded-xl text-center max-w-sm shadow-lg border border-white/10 pointer-events-auto">
            {caption}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modal principal ──────────────────────────────────────────────────────────
export function AlbumViewerModal({ albums: albumsProp, initialAlbumIndex, onClose, onAlbumChange, onLoadPhotos }: AlbumViewerModalProps) {
  const [virtualIndex, setVirtualIndex] = useState(initialAlbumIndex);
  const [photoIndexes, setPhotoIndexes] = useState<Record<string, number>>({});
  const [isInteracting, setIsInteracting] = useState(false);

  // Cópia local dos álbuns — atualizada quando as fotos chegam via onLoadPhotos
  const [localAlbums, setLocalAlbums] = useState<Album[]>(albumsProp);
  // IDs dos álbuns que estão com o fetch de fotos em andamento
  const [loadingAlbums, setLoadingAlbums] = useState<Set<string>>(new Set());
  // Ref espelho de loadingAlbums — permite verificar sem criar dependência no useEffect
  const loadingAlbumsRef = useRef<Set<string>>(new Set());
  // Álbuns cuja busca já terminou (mesmo que voltem vazios). Evita refazer a busca em loop
  // quando um álbum realmente não tem fotos.
  const attemptedAlbumsRef = useRef<Set<string>>(new Set());
  const [attemptedAlbums, setAttemptedAlbums] = useState<Set<string>>(new Set());

  useOverlayHistory({
    id: 'album-viewer-modal',
    isOpen: true,
    onClose,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const virtualIndexRef = useRef(initialAlbumIndex);
  const photoIndexesRef = useRef<Record<string, number>>({});
  const animControls = useRef<{ stop: () => void } | null>(null);

  // Atualiza localAlbums quando albumsProp sofre atualização externa (cache hit)
  useEffect(() => {
    setLocalAlbums((prev) => {
      let changed = false;
      const next = albumsProp.map((a) => {
        const existing = prev.find((p) => p.id === a.id);
        if (existing && existing.photos.length > 0) return existing;
        if (!existing || existing.photos !== a.photos) changed = true;
        return a;
      });
      return changed ? next : prev;
    });
  }, [albumsProp]);

  // ── Lazy-load de fotos por álbum ────────────────────────────────────────────
  const loadPhotosForAlbum = useCallback(async (albumId: string) => {
    if (!onLoadPhotos) return;
    // Marca como loading na ref ANTES de setar o state, para evitar
    // que o useEffect de lazy-load re-dispare antes do state propagar.
    loadingAlbumsRef.current = new Set(loadingAlbumsRef.current).add(albumId);
    attemptedAlbumsRef.current.add(albumId);
    setLoadingAlbums(new Set(loadingAlbumsRef.current));
    try {
      const photos = await onLoadPhotos(albumId);
      setLocalAlbums((prev) =>
        prev.map((a) => (a.id === albumId ? { ...a, photos } : a))
      );
    } finally {
      const next = new Set(loadingAlbumsRef.current);
      next.delete(albumId);
      loadingAlbumsRef.current = next;
      setLoadingAlbums(new Set(next));
      setAttemptedAlbums(new Set(attemptedAlbumsRef.current));
    }
  }, [onLoadPhotos]);

  // Alias conveniente — usa localAlbums como fonte de verdade
  const albums = localAlbums;

  const getWidth = useCallback(() => {
    if (containerRef.current && containerRef.current.clientWidth > 0) {
      return containerRef.current.clientWidth;
    }
    if (typeof window !== 'undefined' && window.innerWidth > 0) {
      return window.innerWidth;
    }
    return 400;
  }, []);

  const [containerWidth, setContainerWidth] = useState<number>(() => {
    return typeof window !== 'undefined' && window.innerWidth > 0 ? window.innerWidth : 400;
  });

  // ── Motion values ─────────────────────────────────────────────────────────
  const y = useMotionValue(0);
  const bgOpacity = useTransform(y, [-300, 0, 300], [0, 1, 0]);
  const contentScale = useTransform(y, [-300, 0, 300], [0.85, 1, 0.85]);
  const bgColor = useTransform(bgOpacity, (o) => `rgba(0,0,0,${Number(o) * 0.97})`);

  // Posicionamento horizontal contínuo com suporte a loop infinito circular
  const x = useMotionValue(-initialAlbumIndex * (typeof window !== 'undefined' && window.innerWidth > 0 ? window.innerWidth : 400));

  useEffect(() => {
    const syncWidth = () => {
      const w = getWidth();
      setContainerWidth(w);
      x.set(-virtualIndexRef.current * w);
    };
    syncWidth();
    window.addEventListener('resize', syncWidth);
    // Em navegadores móveis / WebKit iOS, aguarda o reflow completo da rotação de tela
    const onOrientation = () => {
      setTimeout(syncWidth, 100);
    };
    window.addEventListener('orientationchange', onOrientation);
    return () => {
      window.removeEventListener('resize', syncWidth);
      window.removeEventListener('orientationchange', onOrientation);
    };
  }, [getWidth, x]);

  useEffect(() => {
    return () => {
      if (animControls.current) {
        animControls.current.stop();
        animControls.current = null;
      }
    };
  }, []);

  const gesture = useRef<{
    startX: number;
    startY: number;
    startMotionX: number;
    startTime: number;
    direction: 'idle' | 'h' | 'v';
    pointerId: number | null;
  }>({ startX: 0, startY: 0, startMotionX: 0, startTime: 0, direction: 'idle', pointerId: null });

  // ── Bloquear scroll do fundo e limpar preloader no desmonte ───────────────
  useEffect(() => {
    const unlock = lockBodyScroll();
    // Pausa os canvas de fundo (neve/partículas) enquanto o visualizador está aberto:
    // no iPhone eles competem por GPU/memória com as fotos e causam tela preta/travamento.
    document.documentElement.setAttribute('data-overlay-open', 'album');
    document.dispatchEvent(new Event('visibilitychange'));
    return () => {
      unlock();
      imagePreloader.clear();
      document.documentElement.removeAttribute('data-overlay-open');
      document.dispatchEvent(new Event('visibilitychange'));
    };
  }, []);

  // ── SMART PRELOADING ──────────────────────────────────────────────────────
  const actualIndex = albums.length > 0
    ? ((virtualIndex % albums.length) + albums.length) % albums.length
    : 0;

  // ── Dispara o lazy-load de fotos ao navegar entre álbuns ──────────────────
  // No mobile, prioriza carregar o álbum ATUAL primeiro para resposta instantânea.
  // Somente após o atual estar com fotos prontas, busca o próximo em segundo plano.
  useEffect(() => {
    if (albums.length === 0 || !onLoadPhotos) return;

    const isMobile = isMobileDevice();
    const curAIdx = ((virtualIndex % albums.length) + albums.length) % albums.length;
    const curAlbum = albums[curAIdx];

    const isBusy = (id: string) => loadingAlbumsRef.current.has(id);
    const wasTried = (id: string) => attemptedAlbumsRef.current.has(id);

    // 1. Prioridade máxima: carrega APENAS o álbum atual se ainda estiver sem fotos
    //    (e ainda não tentamos — álbum vazio não deve ser buscado de novo em loop).
    if (curAlbum && curAlbum.photos.length === 0 && (isBusy(curAlbum.id) || !wasTried(curAlbum.id))) {
      if (!isBusy(curAlbum.id)) {
        loadPhotosForAlbum(curAlbum.id);
      }
      return;
    }

    // 2. Prefetch inteligente de álbuns adjacentes (apenas após o atual estar pronto)
    if (albums.length > 1) {
      const nextAIdx = (((virtualIndex + 1) % albums.length) + albums.length) % albums.length;
      const nextAlbum = albums[nextAIdx];
      if (nextAlbum && nextAlbum.photos.length === 0 && !isBusy(nextAlbum.id) && !wasTried(nextAlbum.id)) {
        loadPhotosForAlbum(nextAlbum.id);
      } else if (!isMobile) {
        // No desktop, também antecipa o anterior
        const prevAIdx = (((virtualIndex - 1) % albums.length) + albums.length) % albums.length;
        const prevAlbum = albums[prevAIdx];
        if (prevAlbum && prevAlbum.photos.length === 0 && !isBusy(prevAlbum.id) && !wasTried(prevAlbum.id)) {
          loadPhotosForAlbum(prevAlbum.id);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [virtualIndex, albums, onLoadPhotos, loadPhotosForAlbum]);

  useEffect(() => {
    if (albums.length === 0) return;
    const isMobile = isMobileDevice();
    const urls: string[] = [];
    
    const addUrl = (aIdx: number, pIdx: number) => {
      const normalizedIdx = ((aIdx % albums.length) + albums.length) % albums.length;
      const a = albums[normalizedIdx];
      if (!a || a.photos.length === 0) return; // Pula álbuns sem fotos ainda
      const p = a.photos[pIdx];
      if (!p) return;
      const url = getPhotoUrl(p);
      if (url && !urls.includes(url)) urls.push(url);
    };

    const curA = actualIndex;
    const curP = photoIndexes[albums[curA]?.id] ?? 0;

    if (isMobile) {
      // No iPhone/Mobile: carrega a foto ATUAL (index 0 ao abrir) e a PRÓXIMA.
      // Garante que a foto inicial do álbum já esteja sendo baixada (cache do navegador).
      if (curP === 0) {
        addUrl(curA, 0); // foto inicial — prioridade máxima no pré-carregamento
      }
      addUrl(curA, curP + 1);
    } else {
      // No Desktop: prefetch mais agressivo
      addUrl(curA, curP + 1);
      addUrl(curA, curP + 2);
      addUrl(curA, curP + 3);
      addUrl(curA, curP - 1);
      const nextA = curA + 1;
      const nextAP = photoIndexes[albums[((nextA % albums.length) + albums.length) % albums.length]?.id] ?? 0;
      addUrl(nextA, nextAP);
      const prevA = curA - 1;
      const prevAP = photoIndexes[albums[((prevA % albums.length) + albums.length) % albums.length]?.id] ?? 0;
      addUrl(prevA, prevAP);
    }

    // Envia fila para o worker de cache
    imagePreloader.setPriority(urls);
  }, [actualIndex, photoIndexes, albums]);

  // ── Navegar foto / transbordar para álbum em loop infinito ─────────────────
  const navigatePhoto = useCallback((dir: number) => {
    if (albums.length === 0) return;
    const currentActualIndex = ((virtualIndexRef.current % albums.length) + albums.length) % albums.length;
    const currentAlbum = albums[currentActualIndex];
    if (!currentAlbum) return;

    const curr = photoIndexesRef.current[currentAlbum.id] ?? 0;
    const next = curr + dir;

    if (next >= 0 && next < currentAlbum.photos.length) {
      const updated = { ...photoIndexesRef.current, [currentAlbum.id]: next };
      photoIndexesRef.current = updated;
      setPhotoIndexes(updated);
      setIsInteracting(false);
    } else if (albums.length > 1) {
      // Transborda para o próximo álbum ou anterior com loop infinito circular
      const targetVirtualIndex = virtualIndexRef.current + dir;
      const targetActualIndex = ((targetVirtualIndex % albums.length) + albums.length) % albums.length;
      const targetAlbum = albums[targetActualIndex];

      if (targetAlbum && targetAlbum.photos.length > 0) {
        const targetPhotoIdx = dir > 0 ? 0 : targetAlbum.photos.length - 1;
        const updated = { ...photoIndexesRef.current, [targetAlbum.id]: targetPhotoIdx };
        photoIndexesRef.current = updated;
        setPhotoIndexes(updated);
      }

      virtualIndexRef.current = targetVirtualIndex;
      setVirtualIndex(targetVirtualIndex);
      onAlbumChange?.(targetActualIndex);

      setIsInteracting(true);
      const width = getWidth();
      const targetX = -targetVirtualIndex * width;

      if (animControls.current) animControls.current.stop();
      animControls.current = animate(x, targetX, {
        type: 'tween',
        duration: 0.22,
        ease: [0.25, 1, 0.5, 1],
        onComplete: () => {
          animControls.current = null;
          setIsInteracting(false);
        },
      });
    }
  }, [albums, getWidth, onAlbumChange, x]);

  // ── Fechar deslizando ─────────────────────────────────────────────────────
  const closeTimer = useRef<number | null>(null);
  const closedRef = useRef(false);

  const closeBySlide = useCallback((targetY: number) => {
    if (closedRef.current) return;
    const finish = () => {
      if (closedRef.current) return;
      closedRef.current = true;
      if (closeTimer.current !== null) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      onClose();
    };
    animate(y, targetY, { duration: 0.22, onComplete: finish });
    closeTimer.current = window.setTimeout(finish, 400);
  }, [y, onClose]);

  useEffect(() => () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  }, []);

  // ── Teclado ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowRight') navigatePhoto(+1);
      if (e.key === 'ArrowLeft') navigatePhoto(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigatePhoto, onClose]);

  // ── Pointer events ────────────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gesture.current.pointerId !== null) return;
    if ((e.target as HTMLElement).closest?.('[data-no-gesture]')) return;

    if (animControls.current) {
      animControls.current.stop();
      animControls.current = null;
    }

    gesture.current = {
      startX: e.clientX,
      startY: e.clientY,
      startMotionX: x.get(),
      startTime: Date.now(),
      direction: 'idle',
      pointerId: e.pointerId,
    };
    try {
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignora erro se WebKit/Safari recusar pointer capture
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gesture.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - gesture.current.startX;
    const dy = e.clientY - gesture.current.startY;

    if (gesture.current.direction === 'idle') {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        gesture.current.direction = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
        if (gesture.current.direction === 'h') {
          setIsInteracting(true);
        }
      }
    }

    if (gesture.current.direction === 'h') {
      let effectiveDx = dx;
      if (albums.length <= 1) {
        effectiveDx = dx * 0.35; // Resistência elástica se só existir 1 álbum
      }
      x.set(gesture.current.startMotionX + effectiveDx);
    } else if (gesture.current.direction === 'v') {
      y.set(dy);
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gesture.current.pointerId !== e.pointerId) return;

    const { startX, startY, startTime, direction } = gesture.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const dt = Math.max(Date.now() - startTime, 1);
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const velX = dx / dt;
    const velY = dy / dt;

    gesture.current.pointerId = null;
    gesture.current.direction = 'idle';

    try {
      if ((e.currentTarget as HTMLDivElement).hasPointerCapture?.(e.pointerId)) {
        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      }
    } catch {}

    if (direction === 'idle' || (absDx < 12 && absDy < 12)) {
      const width = getWidth();
      const restingX = -virtualIndexRef.current * width;
      // Se parou no meio de uma animação anterior interrompida, completa até o álbum atual
      if (Math.abs(x.get() - restingX) > 2) {
        if (animControls.current) animControls.current.stop();
        animControls.current = animate(x, restingX, {
          type: 'tween',
          duration: 0.20,
          ease: [0.25, 1, 0.5, 1],
          onComplete: () => {
            animControls.current = null;
            setIsInteracting(false);
          },
        });
        return;
      }
      setIsInteracting(false);
      navigatePhoto(e.clientX > window.innerWidth / 2 ? +1 : -1);
    } else if (direction === 'h') {
      const width = getWidth();
      const shouldSwipe = (absDx > 35 || Math.abs(velX) > 0.18) && albums.length > 1;

      if (shouldSwipe) {
        const dir = dx < 0 ? 1 : -1;
        const targetVirtualIndex = virtualIndexRef.current + dir;
        const targetActualIndex = ((targetVirtualIndex % albums.length) + albums.length) % albums.length;
        const targetAlbum = albums[targetActualIndex];
        if (targetAlbum && targetAlbum.photos.length > 0 && !(targetAlbum.id in photoIndexesRef.current)) {
          const targetPhotoIdx = dir > 0 ? 0 : targetAlbum.photos.length - 1;
          const updated = { ...photoIndexesRef.current, [targetAlbum.id]: targetPhotoIdx };
          photoIndexesRef.current = updated;
          setPhotoIndexes(updated);
        }

        virtualIndexRef.current = targetVirtualIndex;
        setVirtualIndex(targetVirtualIndex);
        onAlbumChange?.(targetActualIndex);

        setIsInteracting(true);
        const targetX = -targetVirtualIndex * width;
        if (animControls.current) animControls.current.stop();
        animControls.current = animate(x, targetX, {
          type: 'tween',
          duration: 0.22,
          ease: [0.25, 1, 0.5, 1],
          onComplete: () => {
            animControls.current = null;
            setIsInteracting(false);
          },
        });
      } else {
        const targetX = -virtualIndexRef.current * width;
        if (animControls.current) animControls.current.stop();
        animControls.current = animate(x, targetX, {
          type: 'tween',
          duration: 0.18,
          ease: [0.25, 1, 0.5, 1],
          onComplete: () => {
            animControls.current = null;
            setIsInteracting(false);
          },
        });
      }
    } else if (direction === 'v') {
      setIsInteracting(false);
      if (absDy > 60 || Math.abs(velY) > 0.3) {
        closeBySlide(dy > 0 ? window.innerHeight : -window.innerHeight);
      } else {
        animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 });
      }
    }
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gesture.current.pointerId !== e.pointerId) return;
    gesture.current.pointerId = null;
    gesture.current.direction = 'idle';

    try {
      if ((e.currentTarget as HTMLDivElement).hasPointerCapture?.(e.pointerId)) {
        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      }
    } catch {}

    const width = getWidth();
    if (animControls.current) animControls.current.stop();
    animControls.current = animate(x, -virtualIndexRef.current * width, {
      type: 'tween',
      duration: 0.18,
      ease: [0.25, 1, 0.5, 1],
      onComplete: () => {
        animControls.current = null;
        setIsInteracting(false);
      },
    });
    animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 });
  };

  // ── Renderização com Sliding Window de 3 Slots Contínuos ──────────────────
  const offsets = albums.length > 1 ? [-1, 0, 1] : [0];
  const activeItems = offsets.map((k) => {
    const v = virtualIndex + k;
    const slotKey = ((v % 3) + 3) % 3;
    const albumIdx = ((v % albums.length) + albums.length) % albums.length;
    const album = albums[albumIdx];
    return { v, slotKey, album };
  });

  // Renderiza no #modal-root (fora do #root do React) para evitar conflito com
  // position:fixed e overflow:hidden que o lockBodyScroll aplica ao body no iOS.
  // O #modal-root fica irmão do body e não é afetado pelo travamento de scroll.
  const portalTarget =
    (typeof document !== 'undefined' && document.getElementById('modal-root')) ||
    (typeof document !== 'undefined' ? document.body : null);

  if (!portalTarget) return null;

  return createPortal(
    <motion.div
      ref={containerRef}
      // Sem initial={{ opacity:0 }} para não criar camada de compositor GPU extra no iOS.
      // No iPhone isso causava tela preta por 1-2s ao abrir, pois competia com as camadas
      // do canvas de partículas. A animação de entrada fica a cargo do bgColor (motion value).
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{ backgroundColor: bgColor, opacity: 1 }}
      className="fixed inset-0 z-[99999] touch-none select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <motion.div style={{ y, scale: contentScale }} className="w-full h-full overflow-hidden relative">
        <motion.div
          style={{ x }}
          className="w-full h-full relative"
        >
          {activeItems.map((item) => {
            const isCurrent = item.v === virtualIndex;
            const isVisible = isInteracting || isCurrent;

            return (
              <div
                key={`slot-${item.slotKey}`}
                className="absolute inset-0 w-full h-full overflow-hidden"
                style={{
                  transform: `translateX(${item.v * containerWidth}px)`,
                  WebkitTransform: `translateX(${item.v * containerWidth}px)`,
                  visibility: isVisible ? 'visible' : 'hidden',
                }}
              >
                {isVisible ? (
                  <AlbumPanel
                    album={item.album}
                    photoIndex={photoIndexes[item.album?.id ?? ''] ?? 0}
                    onClose={onClose}
                    coverUrl={item.album?.coverUrl}
                    isLoading={
                      loadingAlbums.has(item.album?.id ?? '') ||
                      (isCurrent && !!item.album && item.album.photos.length === 0 && !attemptedAlbums.has(item.album.id))
                    }
                  />
                ) : null}
              </div>
            );
          })}
        </motion.div>
      </motion.div>
    </motion.div>,
    portalTarget
  );
}
