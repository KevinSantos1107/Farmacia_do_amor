import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { cn } from '../../shared/utils/cn';
import { lockBodyScroll } from '../../shared/utils/scrollLock';
import { imagePreloader } from './ImagePreloader';
import { cloudinaryUrl, cloudinaryResponsiveSrcSet } from '../../services/cloudinary/upload';

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

function getPhotoSrcSet(photo: Photo): string | undefined {
  // Só gera srcSet para publicIds limpos (não URLs completas)
  if (photo.publicId && !photo.publicId.startsWith('http')) {
    return cloudinaryResponsiveSrcSet(photo.publicId, [600, 900, 1200]);
  }
  return undefined;
}

// ─── Foto com Pinch to Zoom e Pan ─────────────────────────────────────────────
function ZoomableImage({ src, srcSet, alt }: { src: string; srcSet?: string; alt: string }) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

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
      <img
        src={src}
        srcSet={srcSet}
        sizes="(max-width: 768px) 100vw, 90vw"
        alt={alt}
        draggable={false}
        className="max-w-full max-h-full object-contain pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transition: scale === 1 && pan.x === 0 && pan.y === 0 ? 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
          willChange: 'transform'
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
  const srcSet = photo ? getPhotoSrcSet(photo) : undefined;
  const caption = photo?.caption || photo?.description;

  return (
    <div className="w-full h-full relative bg-black flex items-center justify-center">
      {/* Barras de progresso */}
      <div className="absolute top-4 inset-x-0 z-50 flex gap-[3px] px-4 drop-shadow-md pointer-events-none">
        {album.photos.map((_, i) => (
          <div key={i} className="flex-1 h-[3px] bg-white/25 rounded-full overflow-hidden">
            <div className={cn(
              'h-full bg-white rounded-full transition-transform duration-200 origin-left',
              i <= photoIndex ? 'scale-x-100' : 'scale-x-0'
            )} />
          </div>
        ))}
      </div>

      {/* Título */}
      <div className="absolute top-9 left-4 z-50 pointer-events-none">
        <p className="text-white/90 font-semibold text-sm drop-shadow">{album.title}</p>
      </div>

      {/* Foto customizada com Zoom & Pan isolados */}
      {url && <ZoomableImage src={url} srcSet={srcSet} alt={caption || `Foto ${photoIndex + 1}`} />}

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
  const [albumIndex, setAlbumIndex] = useState(initialAlbumIndex);
  const [photoIndexes, setPhotoIndexes] = useState<Record<string, number>>({});

  // Refs para acesso sem stale closures
  const albumIndexRef = useRef(initialAlbumIndex);
  const photoIndexesRef = useRef<Record<string, number>>({});
  const transitioning = useRef(false);

  // ── Motion values ─────────────────────────────────────────────────────────
  const y = useMotionValue(0);
  const bgOpacity = useTransform(y, [-300, 0, 300], [0, 1, 0]);
  const contentScale = useTransform(y, [-300, 0, 300], [0.85, 1, 0.85]);
  const bgColor = useTransform(bgOpacity, (o) => `rgba(0,0,0,${Number(o) * 0.97})`);

  const dragX = useMotionValue(0);
  const stripX = useTransform(dragX, (v) => `calc(-100vw + ${v}px)`);

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
  useEffect(() => {
    const urls: string[] = [];
    
    const addUrl = (aIdx: number, pIdx: number) => {
      const a = albums[aIdx];
      if (!a) return;
      const p = a.photos[pIdx];
      if (!p) return;
      const url = getPhotoUrl(p);
      if (url && !urls.includes(url)) urls.push(url);
    };

    const curA = albumIndex;
    const curP = photoIndexes[albums[curA]?.id] ?? 0;

    // 1. Alta prioridade: Próximas fotos no mesmo álbum
    addUrl(curA, curP + 1);
    addUrl(curA, curP + 2);
    addUrl(curA, curP + 3);

    // 2. Média prioridade: Foto anterior (se o usuário voltar)
    addUrl(curA, curP - 1);

    // 3. Primeira foto do PRÓXIMO álbum (caso passe de álbum)
    const nextA = curA + 1;
    const nextAP = photoIndexes[albums[nextA]?.id] ?? 0;
    addUrl(nextA, nextAP);
    addUrl(nextA, nextAP + 1); // e a seguinte também

    // 4. Primeira foto do ÁLBUM ANTERIOR
    const prevA = curA - 1;
    const prevAP = photoIndexes[albums[prevA]?.id] ?? 0;
    addUrl(prevA, prevAP);

    // Envia fila para o worker de cache
    imagePreloader.setPriority(urls);
  }, [albumIndex, photoIndexes, albums]);

  // ── Ir para álbum ─────────────────────────────────────────────────────────
  const goToAlbum = useCallback((idx: number) => {
    if (albums.length === 0) return;
    const wrappedIdx = (idx + albums.length) % albums.length;
    albumIndexRef.current = wrappedIdx;
    setAlbumIndex(wrappedIdx);
    onAlbumChange?.(wrappedIdx);
  }, [albums.length, onAlbumChange]);

  // ── Navegar foto / transbordar para álbum ─────────────────────────────────
  const navigatePhoto = useCallback((dir: number) => {
    if (transitioning.current || albums.length === 0) return;
    const album = albums[albumIndexRef.current];
    if (!album) return;

    const curr = photoIndexesRef.current[album.id] ?? 0;
    const next = curr + dir;

    if (next >= 0 && next < album.photos.length) {
      const updated = { ...photoIndexesRef.current, [album.id]: next };
      photoIndexesRef.current = updated;
      setPhotoIndexes({ ...updated });
    } else {
      const newIdx = albumIndexRef.current + dir;
      const targetX = dir > 0 ? -window.innerWidth : window.innerWidth;
      transitioning.current = true;
      animate(dragX, targetX, { type: 'tween', duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] })
        .then(() => {
          goToAlbum(newIdx);
          dragX.set(0);
          transitioning.current = false;
        });
    }
  }, [albums, goToAlbum, dragX]);

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
      dragX.set(dx); // Removida a resistência nas bordas para permitir loop livre
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
      const swipeDir = dx < 0 ? +1 : -1;
      const newIdx = albumIndexRef.current + swipeDir;
      const shouldSwipe = (absDx > 50 || Math.abs(velX) > 0.25) && albums.length > 1;

      if (shouldSwipe) {
        transitioning.current = true;
        const targetX = dx < 0 ? -window.innerWidth : window.innerWidth;
        animate(dragX, targetX, { type: 'tween', duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] })
          .then(() => {
            goToAlbum(newIdx);
            dragX.set(0);
            transitioning.current = false;
          });
      } else {
        animate(dragX, 0, { type: 'spring', stiffness: 320, damping: 32 });
      }
    } else if (direction === 'v') {
      if (absDy > 60 || Math.abs(velY) > 0.3) {
        animate(y, dy > 0 ? window.innerHeight : -window.innerHeight, { duration: 0.22 })
          .then(onClose);
      } else {
        animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 });
      }
    }
  };

  const onPointerCancel = () => {
    gesture.current.pointerId = null;
    gesture.current.direction = 'idle';
    animate(dragX, 0, { type: 'spring', stiffness: 320, damping: 32 });
    animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 });
  };

  // ── Dados dos três painéis ────────────────────────────────────────────────
  const N = albums.length;
  const prevAlbum = N > 0 ? albums[(albumIndex - 1 + N) % N] : undefined;
  const curAlbum = N > 0 ? albums[albumIndex] : undefined;
  const nextAlbum = N > 0 ? albums[(albumIndex + 1) % N] : undefined;
  
  const getPhotoIdx = (album: Album | undefined) =>
    album ? (photoIndexes[album.id] ?? 0) : 0;

  // ── Render ────────────────────────────────────────────────────────────────
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

      <motion.div style={{ y, scale: contentScale }} className="w-full h-full overflow-hidden">
        <motion.div
          style={{ x: stripX }}
          className="flex h-full"
        >
          <div className="w-[100vw] shrink-0">
            <AlbumPanel
              key={prevAlbum?.id || 'prev-none'}
              album={prevAlbum}
              photoIndex={getPhotoIdx(prevAlbum)}
              onClose={onClose}
            />
          </div>

          <div className="w-[100vw] shrink-0">
            <AlbumPanel
              key={curAlbum?.id || 'cur-none'}
              album={curAlbum}
              photoIndex={getPhotoIdx(curAlbum)}
              onClose={onClose}
            />
          </div>

          <div className="w-[100vw] shrink-0">
            <AlbumPanel
              key={nextAlbum?.id || 'next-none'}
              album={nextAlbum}
              photoIndex={getPhotoIdx(nextAlbum)}
              onClose={onClose}
            />
          </div>
        </motion.div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
