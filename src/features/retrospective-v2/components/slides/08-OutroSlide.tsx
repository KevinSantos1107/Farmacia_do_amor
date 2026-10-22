import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRetroV2Store } from '../../store/useRetroV2Store';

// ─── Scratch Card para a Mensagem Final ─────────────────────────────────────
function ScratchCard({ text }: { text: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const isDrawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // Gradient background — rich and romantic
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#be185d');
    grad.addColorStop(0.5, '#db2777');
    grad.addColorStop(1, '#9d174d');
    ctx.fillStyle = grad;
    ctx.roundRect(0, 0, W, H, 16);
    ctx.fill();

    // Shimmer effect
    const shimmer = ctx.createLinearGradient(0, 0, W, 0);
    shimmer.addColorStop(0, 'rgba(255,255,255,0)');
    shimmer.addColorStop(0.5, 'rgba(255,255,255,0.2)');
    shimmer.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shimmer;
    ctx.fillRect(0, 0, W, H);

    // Emojis pattern
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 10; col++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.3 + 0.1})`;
        ctx.fillText(col % 2 === 0 ? '❤️' : '✨', col * 34 + 16, row * 26 + 20);
      }
    }

    // Hint text
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText('🔮 Risque para revelar', W / 2, H / 2 + 5);
  }, []);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const scratch = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.fill();

    const sample = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let transparent = 0;
    for (let i = 3; i < sample.data.length; i += 16) {
      if (sample.data[i] < 128) transparent++;
    }
    const pct = (transparent / (sample.data.length / 64)) * 100;
    if (pct > 55) setIsRevealed(true);
  };

  return (
    <div className="relative w-full max-w-[280px] h-[140px] mx-auto mt-6">
      {/* Hidden Message */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 flex items-center justify-center text-center shadow-inner">
        <p className="text-white/90 font-medium text-sm leading-relaxed drop-shadow-md">
          {text}
        </p>
      </div>

      {/* Scratch overlay */}
      <AnimatePresence>
        {!isRevealed && (
          <motion.canvas
            ref={canvasRef}
            width={280}
            height={140}
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)', transition: { duration: 0.8 } }}
            className="absolute inset-0 w-full h-full rounded-2xl cursor-crosshair touch-none shadow-lg"
            onPointerDown={(e) => {
              e.stopPropagation();
              isDrawing.current = true;
              try { (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId); } catch {}
              scratch(getPos(e).x, getPos(e).y);
            }}
            onPointerMove={(e) => {
              e.stopPropagation();
              if (isDrawing.current) scratch(getPos(e).x, getPos(e).y);
            }}
            onPointerUp={(e) => { e.stopPropagation(); isDrawing.current = false; }}
            onPointerCancel={(e) => { e.stopPropagation(); isDrawing.current = false; }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export function OutroSlide({ onReplay }: { onReplay?: () => void }) {
  void onReplay;
  const { config } = useRetroV2Store();
  
  const title = config.outroTitle || 'Feliz 1 ano pra nós, meu amor!';
  const message = config.outroMessage || 'Obrigado por cada momento incrível. Essa é só uma parte da nossa história.';

  // Confetti particles
  const PARTICLES = Array.from({ length: 40 }, (_, i) => ({
    width: (i * 13 % 6) + 4,
    height: (i * 7 % 12) + 6,
    color: ['#f43f5e', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6'][i % 5],
    left: (i * 7919 % 100),
    duration: (i * 17 % 3) + 2,
    delay: (i * 31 % 5),
  }));

  return (
    <div className="flex-1 bg-[#09090b] flex flex-col items-center justify-center text-center p-6 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
        <div className="w-[300px] h-[300px] bg-pink-600 rounded-full blur-[120px]" />
      </div>

      {/* Confetti */}
      <div className="absolute inset-0 pointer-events-none">
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="retro-v2-particle absolute"
            style={{
              width: `${p.width}px`,
              height: `${p.height}px`,
              backgroundColor: p.color,
              left: `${p.left}%`,
              animation: `retro-v2-fall ${p.duration}s linear infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="z-10 w-full max-w-sm flex flex-col items-center"
      >
        <h2
          className="text-white font-black mb-2 leading-tight drop-shadow-[0_0_15px_rgba(219,39,119,0.5)]"
          style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: 'clamp(2.2rem, 10vw, 3.5rem)',
          }}
        >
          {title}
        </h2>

        <ScratchCard text={message} />
      </motion.div>
    </div>
  );
}
