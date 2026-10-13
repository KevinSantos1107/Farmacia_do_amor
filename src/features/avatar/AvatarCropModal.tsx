import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react';

interface AvatarCropModalProps {
  /** URL de objeto (blob) ou base64 da imagem selecionada */
  imageSrc: string;
  onConfirm: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

const MIN_ZOOM = 1.0;
const MAX_ZOOM = 3.5;
// 384x384 é a resolução ideal para avatares (hi-DPI/Retina 3x para elementos de até 128px)
const EXPORT_SIZE = 384;
const CIRCLE_RATIO = 0.82; // 82% da largura do container é a área circular de enquadramento

export function AvatarCropModal({ imageSrc, onConfirm, onCancel }: AvatarCropModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // zoom: 1.0 = imagem ajustada exatamente para cobrir o círculo sem bordas vazias
  const [zoom, setZoom] = useState(1.0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, ox: 0, oy: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [containerSize, setContainerSize] = useState(250);

  // Calcula escala base: escala necessária para que a menor dimensão cubra o diâmetro do círculo
  const getBaseScale = useCallback((img: HTMLImageElement, size: number) => {
    const circleD = size * CIRCLE_RATIO;
    return Math.max(circleD / img.width, circleD / img.height);
  }, []);

  // Clampa o offset para que a imagem NUNCA deixe espaços vazios dentro do círculo
  const clampOffset = useCallback(
    (ox: number, oy: number, currentZoom: number) => {
      const img = imgRef.current;
      if (!img) return { x: ox, y: oy };

      const size = containerSize;
      const circleD = size * CIRCLE_RATIO;
      const baseScale = getBaseScale(img, size);
      const effectiveScale = baseScale * currentZoom;

      const scaledW = img.width * effectiveScale;
      const scaledH = img.height * effectiveScale;

      const maxOffsetX = Math.max(0, (scaledW - circleD) / 2);
      const maxOffsetY = Math.max(0, (scaledH - circleD) / 2);

      return {
        x: Math.max(-maxOffsetX, Math.min(maxOffsetX, ox)),
        y: Math.max(-maxOffsetY, Math.min(maxOffsetY, oy)),
      };
    },
    [containerSize, getBaseScale]
  );

  // Carrega imagem inicial
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
      setZoom(1.0);
      setOffset({ x: 0, y: 0 });

      if (containerRef.current) {
        const size = containerRef.current.offsetWidth || 250;
        setContainerSize(size);
      }
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Observa redimensionamento de janela/container
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      if (entries[0]?.contentRect.width) {
        const newSize = entries[0].contentRect.width;
        setContainerSize(newSize);
        setOffset((prev) => clampOffset(prev.x, prev.y, zoom));
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [clampOffset, zoom]);

  // Renderiza prévia interativa no canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = containerSize;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, size, size);

    const baseScale = getBaseScale(img, size);
    const effectiveScale = baseScale * zoom;
    const scaledW = img.width * effectiveScale;
    const scaledH = img.height * effectiveScale;

    const cx = size / 2;
    const cy = size / 2;
    const circleD = size * CIRCLE_RATIO;
    const circleR = circleD / 2;

    const imgX = cx - scaledW / 2 + offset.x;
    const imgY = cy - scaledH / 2 + offset.y;

    // 1. Desenha a imagem
    ctx.drawImage(img, imgX, imgY, scaledW, scaledH);

    // 2. Máscara escura fora do círculo (estilo WhatsApp)
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.beginPath();
    ctx.rect(0, 0, size, size);
    ctx.arc(cx, cy, circleR, 0, Math.PI * 2, true);
    ctx.fill('evenodd');

    // 3. Guia sutil da borda circular com glow delicado
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, circleR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }, [zoom, offset, imgLoaded, containerSize, getBaseScale]);

  // ---------- Manipulação por Mouse (Desktop) ----------
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setOffset(clampOffset(dragStart.ox + dx, dragStart.oy + dy, zoom));
    },
    [dragging, dragStart, zoom, clampOffset]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // ---------- Manipulação por Toque (Celular e Tablet - Arraste e Pinça) ----------
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const lastPinchDistRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastPinchDistRef.current = null;
    } else if (e.touches.length === 2) {
      lastPinchDistRef.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    if (e.touches.length === 1 && lastTouchRef.current) {
      const dx = e.touches[0].clientX - lastTouchRef.current.x;
      const dy = e.touches[0].clientY - lastTouchRef.current.y;
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setOffset((prev) => clampOffset(prev.x + dx, prev.y + dy, zoom));
    } else if (e.touches.length === 2 && lastPinchDistRef.current !== null) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (lastPinchDistRef.current > 0) {
        const ratio = currentDist / lastPinchDistRef.current;
        lastPinchDistRef.current = currentDist;

        setZoom((prevZoom) => {
          const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prevZoom * ratio));
          setOffset((prevOffset) => clampOffset(prevOffset.x, prevOffset.y, nextZoom));
          return nextZoom;
        });
      }
    }
  };

  const handleTouchEnd = () => {
    lastTouchRef.current = null;
    lastPinchDistRef.current = null;
  };

  // ---------- Zoom via Roda do Mouse (Desktop) ----------
  const handleWheel = (e: React.WheelEvent) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => {
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta));
      setOffset((prevOffset) => clampOffset(prevOffset.x, prevOffset.y, next));
      return next;
    });
  };

  const stepZoom = (delta: number) => {
    setZoom((prev) => {
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta));
      setOffset((prevOffset) => clampOffset(prevOffset.x, prevOffset.y, next));
      return next;
    });
  };

  // ---------- Confirmação e Exportação Otimizada (WebP) ----------
  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;

    const size = containerSize;
    const circleD = size * CIRCLE_RATIO;
    const baseScale = getBaseScale(img, size);
    const effectiveScale = baseScale * zoom;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = EXPORT_SIZE;
    exportCanvas.height = EXPORT_SIZE;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // Recorte circular
    ctx.beginPath();
    ctx.arc(EXPORT_SIZE / 2, EXPORT_SIZE / 2, EXPORT_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    const exportRatio = EXPORT_SIZE / circleD;
    const exportScaledW = img.width * effectiveScale * exportRatio;
    const exportScaledH = img.height * effectiveScale * exportRatio;

    const exportX = EXPORT_SIZE / 2 - exportScaledW / 2 + offset.x * exportRatio;
    const exportY = EXPORT_SIZE / 2 - exportScaledH / 2 + offset.y * exportRatio;

    ctx.drawImage(img, exportX, exportY, exportScaledW, exportScaledH);

    // Exporta preferencialmente como WebP otimizado (ou JPEG fallback se não suportado)
    const exportBlob = (type: 'image/webp' | 'image/jpeg', quality: number) => {
      exportCanvas.toBlob(
        (blob) => {
          if (blob && blob.size > 0) {
            onConfirm(blob);
          } else if (type === 'image/webp') {
            exportBlob('image/jpeg', 0.88);
          }
        },
        type,
        quality
      );
    };

    exportBlob('image/webp', 0.88);
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop suave */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />

      {/* Janela Modal Minimalista e Delicada (Mobile, Tablet e Desktop) */}
      <div className="relative z-[201] w-full max-w-[310px] sm:max-w-[340px] bg-slate-900/95 backdrop-blur-md border border-slate-700/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-200">
        {/* Topo Clean */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-slate-800/50">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">Enquadrar Foto</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Posicione seu avatar como desejar</p>
          </div>
          <button
            onClick={onCancel}
            aria-label="Cancelar edição de foto"
            className="w-7 h-7 rounded-full bg-slate-800/70 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Visualizador de Enquadramento */}
        <div className="p-4 flex flex-col items-center">
          <div
            ref={containerRef}
            className="relative w-[230px] h-[230px] sm:w-[250px] sm:h-[250px] rounded-2xl overflow-hidden bg-slate-950/80 shadow-inner ring-1 ring-purple-500/30 cursor-grab active:cursor-grabbing select-none touch-none"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            style={{ touchAction: 'none' }}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full block"
              style={{ width: '100%', height: '100%' }}
            />
          </div>

          {/* Etiqueta / Dica Minimalista */}
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/40 text-[11px] text-slate-300 font-medium select-none">
            <span className="lg:hidden">Arraste para mover · Pinça para zoom</span>
            <span className="hidden lg:inline">Arraste para mover · Use a barra para aproximar</span>
          </div>
        </div>

        {/* Controles de Zoom: omitidos no Celular e no Tablet (lg:flex), pois usam movimento de pinça */}
        <div className="hidden lg:flex px-6 py-1.5 items-center gap-3">
          <button
            type="button"
            onClick={() => stepZoom(-0.15)}
            aria-label="Diminuir zoom"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            aria-label="Controle de zoom da imagem"
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setZoom(val);
              setOffset((prev) => clampOffset(prev.x, prev.y, val));
            }}
            className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />

          <button
            type="button"
            onClick={() => stepZoom(0.15)}
            aria-label="Aumentar zoom"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Rodapé / Botões de Ação */}
        <div className="p-3.5 sm:p-4 bg-slate-950/40 border-t border-slate-800/50 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 px-3 rounded-xl border border-slate-700/70 hover:bg-slate-800/80 text-slate-300 hover:text-white text-xs sm:text-sm font-medium transition-all active:scale-95 cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!imgLoaded}
            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-purple-900/30 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Salvar Foto
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
