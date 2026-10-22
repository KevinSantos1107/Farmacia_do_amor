import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { cn } from '../../shared/utils/cn';
import { lockBodyScroll } from '../../shared/utils/scrollLock';
import { imagePreloader } from './ImagePreloader';
import { cloudinaryUrl } from '../../services/cloudinary/upload';
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
}

interface AlbumViewerModalProps {
  albums: Album[];
  initialAlbumIndex: number;
  onClose: () => void;
  onAlbumChange?: (index: number) => void;
}

// ─── Helper para URL da foto ────────────────────────────────────────────────
function getPhotoUrl(photo: Photo): string {
  // Prioriza publicId limpo → URL Cloudinary otimizada (1200px, sem crop embutido)
  if (photo.publicId && !photo.publicId.startsWith('http')) {
    return cloudinaryUrl(photo.publicId, { w: 1200 });
  }
  // Fotos legadas do site antigo: prefere srcLarge (1600px) > src (800px) > url
  return photo.srcLarge || photo.src || photo.url || (photo.publicId ?? '') || '';
}

// ─── Foto com Pinch to Zoom e Pan ─────────────────────────────────────────────
function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Transição suave de fotos sem flickering
  const [currentSrc, setCurrentSrc] = useState(src);
  const [prevSrc, setPrevSrc] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(true);

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

  useEffect(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    pointers.current.clear();
    initialGesto.current = null;

    if (src !== currentSrc) {
      setPrevSrc(currentSrc);
      setCurrentSrc(src);
      setIsLoaded(false);
    }
  }, [src, currentSrc]);

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
      {/* Imagem anterior mantida visível enquanto a nova carrega (elimina piscada/flicker) */}
      {prevSrc && (
        <img
          src={prevSrc}
          alt=""
          draggable={false}
          className="absolute inset-0 m-auto max-w-full max-h-full object-contain pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            zIndex: 1,
          }}
        />
      )}

      {/* Imagem atual */}
      <img
        src={currentSrc}
        alt={alt}
        draggable={false}
        onLoad={() => {
          setIsLoaded(true);
          setPrevSrc(null);
        }}
        onError={() => {
          setIsLoaded(true);
          setPrevSrc(null);
        }}
        className={cn(
          "max-w-full max-h-full object-contain pointer-events-none transition-opacity duration-200 ease-out",
          !isLoaded && prevSrc ? "opacity-0" : "opacity-100"
        )}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transition: scale === 1 && pan.x === 0 && pan.y === 0 ? 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease-out' : 'opacity 0.2s ease-out',
          willChange: 'transform, opacity',
          zIndex: 2,
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
}: {
  album: Album | undefined;
  photoIndex: number;
  onClose?: () => void;
}) {
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
      {/* Barras de progresso com transição fluida nativa estilo Instagram */}
      <div className="absolute top-4 inset-x-0 z-50 flex gap-[3px] px-4 drop-shadow-md pointer-events-none">
        {album.photos.map((_, i) => (
          <div key={i} className="flex-1 h-[3px] bg-white/25 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full bg-white rounded-full transition-transform duration-200 origin-left',
                i <= photoIndex ? 'scale-x-100' : 'scale-x-0'
              )}
            />
          </div>
        ))}
      </div>

      {/* Título */}
      <div className="absolute top-9 left-4 z-50 pointer-events-none">
        <p className="text-white/90 font-semibold text-sm drop-shadow">{album.title}</p>
      </div>

      {/* Foto customizada com Zoom & Pan isolados */}
      {url && <ZoomableImage src={url} alt={caption || `Foto ${photoIndex + 1}`} />}

      {/* Legenda */}
      {caption && (
        <div className="absolute bottom-8 inset-x-0 flex justify-center px-6 pointer-events-none">
          <div className="bg-black/55 backdrop-blur-md text-white text-sm px-4 py-2 rounded-xl text-center max-w-sm shadow-lg pointer-events-auto">
            {caption}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modal principal ──────────────────────────────────────────────────────────
export function AlbumViewerModal({ albums, initialAlbumIndex, onClose, onAlbumChange }: AlbumViewerModalProps) {
  const [virtualIndex, setVirtualIndex] = useState(initialAlbumIndex);
  const [photoIndexes, setPhotoIndexes] = useState<Record<string, number>>({});

  useOverlayHistory({
    id: 'album-viewer-modal',
    isOpen: true,
    onClose,
  });

  // Refs para acesso sem stale closures
  const virtualIndexRef = useRef(initialAlbumIndex);
  const photoIndexesRef = useRef<Record<string, number>>({});
  const transitioning = useRef(false);

  const getWindowWidth = () => (typeof window !== 'undefined' ? window.innerWidth : 400);

  // ── Motion values ─────────────────────────────────────────────────────────
  const y = useMotionValue(0);
  const bgOpacity = useTransform(y, [-300, 0, 300], [0, 1, 0]);
  const contentScale = useTransform(y, [-300, 0, 300], [0.85, 1, 0.85]);
  const bgColor = useTransform(bgOpacity, (o) => `rgba(0,0,0,${Number(o) * 0.97})`);

  // Posicionamento horizontal contínuo com suporte a loop infinito circular
  const x = useMotionValue(-initialAlbumIndex * getWindowWidth());

  useEffect(() => {
    const syncX = () => {
      x.set(-virtualIndexRef.current * getWindowWidth());
    };
    syncX();
    window.addEventListener('resize', syncX);
    return () => window.removeEventListener('resize', syncX);
  }, [x]);

  const gesture = useRef<{
    startX: number;
    startY: number;
    startTime: number;
    direction: 'idle' | 'h' | 'v';
    pointerId: number | null;
  }>({ startX: 0, startY: 0, startTime: 0, direction: 'idle', pointerId: null });

  // ── Bloquear scroll do fundo ──────────────────────────────────────────────
  useEffect(() => {
    const unlock = lockBodyScroll();
    return () => { unlock(); };
  }, []);

  // ── SMART PRELOADING ──────────────────────────────────────────────────────
  const actualIndex = albums.length > 0
    ? ((virtualIndex % albums.length) + albums.length) % albums.length
    : 0;

  useEffect(() => {
    if (albums.length === 0) return;
    const urls: string[] = [];
    
    const addUrl = (aIdx: number, pIdx: number) => {
      const normalizedIdx = ((aIdx % albums.length) + albums.length) % albums.length;
      const a = albums[normalizedIdx];
      if (!a) return;
      const p = a.photos[pIdx];
      if (!p) return;
      const url = getPhotoUrl(p);
      if (url && !urls.includes(url)) urls.push(url);
    };

    const curA = actualIndex;
    const curP = photoIndexes[albums[curA]?.id] ?? 0;

    // 1. Alta prioridade: Próximas fotos no mesmo álbum
    addUrl(curA, curP + 1);
    addUrl(curA, curP + 2);
    addUrl(curA, curP + 3);

    // 2. Média prioridade: Foto anterior (se o usuário voltar)
    addUrl(curA, curP - 1);

    // 3. Primeira foto do PRÓXIMO álbum (em loop circular)
    const nextA = curA + 1;
    const nextAP = photoIndexes[albums[((nextA % albums.length) + albums.length) % albums.length]?.id] ?? 0;
    addUrl(nextA, nextAP);
    addUrl(nextA, nextAP + 1);

    // 4. Primeira foto do ÁLBUM ANTERIOR (em loop circular)
    const prevA = curA - 1;
    const prevAP = photoIndexes[albums[((prevA % albums.length) + albums.length) % albums.length]?.id] ?? 0;
    addUrl(prevA, prevAP);

    // Envia fila para o worker de cache
    imagePreloader.setPriority(urls);
  }, [actualIndex, photoIndexes, albums]);

  // ── Navegar foto / transbordar para álbum em loop infinito ─────────────────
  const navigatePhoto = useCallback((dir: number) => {
    if (transitioning.current || albums.length === 0) return;
    const currentActualIndex = ((virtualIndexRef.current % albums.length) + albums.length) % albums.length;
    const currentAlbum = albums[currentActualIndex];
    if (!currentAlbum) return;

    const curr = photoIndexesRef.current[currentAlbum.id] ?? 0;
    const next = curr + dir;

    if (next >= 0 && next < currentAlbum.photos.length) {
      const updated = { ...photoIndexesRef.current, [currentAlbum.id]: next };
      photoIndexesRef.current = updated;
      setPhotoIndexes(updated);
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

      transitioning.current = true;
      const width = getWindowWidth();
      const targetX = -targetVirtualIndex * width;

      animate(x, targetX, {
        type: 'tween',
        duration: 0.28,
        ease: [0.25, 0.46, 0.45, 0.94],
        onComplete: () => {
          transitioning.current = false;
          virtualIndexRef.current = targetVirtualIndex;
          setVirtualIndex(targetVirtualIndex);
          onAlbumChange?.(targetActualIndex);
        },
      });
    }
  }, [albums, onAlbumChange, x]);

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
    if (gesture.current.pointerId !== null || transitioning.current) return;
    if ((e.target as HTMLElement).closest?.('[data-no-gesture]')) return;
    gesture.current = {
      startX: e.clientX,
      startY: e.clientY,
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
      }
    }

    if (gesture.current.direction === 'h') {
      const width = getWindowWidth();
      const baseX = -virtualIndexRef.current * width;
      let effectiveDx = dx;
      if (albums.length <= 1) {
        effectiveDx = dx * 0.35; // Resistência elástica se só existir 1 álbum
      }
      x.set(baseX + effectiveDx);
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

    if (direction === 'idle' || (absDx < 12 && absDy < 12)) {
      navigatePhoto(e.clientX > window.innerWidth / 2 ? +1 : -1);
    } else if (direction === 'h') {
      const width = getWindowWidth();
      let targetVirtualIndex = virtualIndexRef.current;
      const shouldSwipe = (absDx > 50 || Math.abs(velX) > 0.25) && albums.length > 1;

      if (shouldSwipe) {
        targetVirtualIndex = virtualIndexRef.current + (dx < 0 ? 1 : -1);
        const targetActualIndex = ((targetVirtualIndex % albums.length) + albums.length) % albums.length;
        const targetAlbum = albums[targetActualIndex];
        if (targetAlbum && targetAlbum.photos.length > 0 && !(targetAlbum.id in photoIndexesRef.current)) {
          const targetPhotoIdx = dx < 0 ? 0 : targetAlbum.photos.length - 1;
          const updated = { ...photoIndexesRef.current, [targetAlbum.id]: targetPhotoIdx };
          photoIndexesRef.current = updated;
          setPhotoIndexes(updated);
        }
      }

      transitioning.current = true;
      const targetX = -targetVirtualIndex * width;
      animate(x, targetX, {
        type: 'spring',
        stiffness: 320,
        damping: 32,
        onComplete: () => {
          transitioning.current = false;
          if (targetVirtualIndex !== virtualIndexRef.current) {
            virtualIndexRef.current = targetVirtualIndex;
            setVirtualIndex(targetVirtualIndex);
            const actualIdx = ((targetVirtualIndex % albums.length) + albums.length) % albums.length;
            onAlbumChange?.(actualIdx);
          }
        },
      });
    } else if (direction === 'v') {
      if (absDy > 60 || Math.abs(velY) > 0.3) {
        closeBySlide(dy > 0 ? window.innerHeight : -window.innerHeight);
      } else {
        animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 });
      }
    }
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (transitioning.current) return;
    if (gesture.current.pointerId !== e.pointerId) return;
    gesture.current.pointerId = null;
    gesture.current.direction = 'idle';
    animate(x, -virtualIndexRef.current * getWindowWidth(), { type: 'spring', stiffness: 320, damping: 32 });
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

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{ backgroundColor: bgColor }}
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
          {activeItems.map((item) => (
            <div
              key={`slot-${item.slotKey}`}
              className="absolute inset-0 w-[100vw] h-full"
              style={{
                transform: `translateX(${item.v * 100}vw)`,
                WebkitTransform: `translateX(${item.v * 100}vw)`,
              }}
            >
              <AlbumPanel
                album={item.album}
                photoIndex={photoIndexes[item.album.id] ?? 0}
                onClose={onClose}
              />
            </div>
          ))}
        </motion.div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
