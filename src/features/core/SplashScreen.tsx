import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
  title?: string;
  isReady?: boolean; // Prop para controlar se os dados estão prontos
}

// Estrelas estáticas (sem Math.random no render)
const STARS = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  size: ((i * 7 + 3) % 25) / 10 + 1,
  top: ((i * 37 + 11) % 100),
  left: ((i * 53 + 7) % 100),
  opacity: ((i * 19 + 3) % 50) / 100 + 0.08,
  delay: ((i * 41) % 30) / 10,
  duration: ((i * 23 + 5) % 20) / 10 + 2,
}));

export function SplashScreen({
  onComplete,
  title = '',
  isReady = false,
}: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'in' | 'out'>('in');

  // Extrai os dois nomes do título (formato "Nome1 & Nome2")
  const parts = title.split('&').map(s => s.trim());
  const name1 = parts[0] || '';
  const name2 = parts[1] || '';

  const currentProgressRef = useRef(0);
  const startRef = useRef(performance.now());

  useEffect(() => {
    let raf: number;

    const tick = (now: number) => {
      if (phase !== 'in') return;
      
      const elapsed = now - startRef.current;

      if (!isReady) {
        // Fase 1: Carregamento simulado (assintótico até 90%)
        // Demora cerca de 3 segundos para chegar em ~90%
        currentProgressRef.current = 90 * (1 - Math.exp(-elapsed / 1200));
        setProgress(Math.round(currentProgressRef.current));
        raf = requestAnimationFrame(tick);
      } else {
        // Fase 2: isReady é true! Dispara para 100% rapidamente a partir de onde parou
        currentProgressRef.current += (100 - currentProgressRef.current) * 0.15;
        
        // Garante que o visual sempre ande pelo menos um pouquinho por frame
        if (currentProgressRef.current > 99) currentProgressRef.current = 100;
        
        setProgress(Math.round(currentProgressRef.current));

        if (currentProgressRef.current < 100) {
          raf = requestAnimationFrame(tick);
        } else {
          // Chegou a 100% de verdade, fazemos o fade out
          setTimeout(() => {
            setPhase('out');
            setTimeout(onComplete, 700);
          }, 300);
        }
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isReady, onComplete, phase]);

  return (
    <AnimatePresence>
      {phase === 'in' && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, #3b0764 0%, #0f0318 50%, #020004 100%)' }}
        >
          {/* Estrelas de fundo */}
          <div className="absolute inset-0 pointer-events-none">
            {STARS.map((s) => (
              <motion.div
                key={s.id}
                className="absolute rounded-full bg-white"
                style={{
                  width: s.size,
                  height: s.size,
                  top: `${s.top}%`,
                  left: `${s.left}%`,
                  opacity: s.opacity,
                }}
                animate={{ opacity: [s.opacity, s.opacity * 3, s.opacity] }}
                transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
              />
            ))}
          </div>

          {/* Glow decorativo */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 60%, rgba(219,39,119,0.18) 0%, transparent 65%)' }}
          />

          {/* Conteúdo central */}
          <div className="relative z-10 flex flex-col items-center gap-8 px-8 w-full max-w-sm">

            {/* Nomes do casal */}
            <div className="flex flex-col items-center gap-1 w-full">
              {/* Nome 1 */}
              <motion.p
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="text-white/90 font-black uppercase tracking-[0.15em] w-full text-center"
                style={{ fontSize: 'clamp(1.6rem, 9vw, 2.8rem)', letterSpacing: '0.12em' }}
              >
                {name1}
              </motion.p>

              {/* Coração central */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="flex items-center justify-center my-2"
              >
                <Heart className="w-8 h-8 text-rose-500 fill-rose-500" />
              </motion.div>

              {/* Nome 2 */}
              <motion.p
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
                className="font-black uppercase w-full text-center"
                style={{
                  fontSize: 'clamp(1.6rem, 9vw, 2.8rem)',
                  letterSpacing: '0.12em',
                  background: 'linear-gradient(to right, #f9a8d4, #c084fc)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {name2}
              </motion.p>
            </div>

            {/* Separador decorativo */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.2 }}
              className="w-12 h-px bg-white/20"
            />

            {/* Barra de progresso */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 1.3 }}
              className="w-full flex flex-col items-center gap-2"
            >
              {/* Track */}
              <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    width: `${progress}%`,
                    background: 'linear-gradient(to right, #ec4899, #a855f7)',
                    boxShadow: '0 0 8px rgba(236,72,153,0.6)',
                    transition: 'width 0.05s linear',
                  }}
                />
              </div>
            </motion.div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
