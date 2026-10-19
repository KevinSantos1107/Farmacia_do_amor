import { useSiteConfigStore } from '../../../../store/siteConfigStore';
import { useEffect, useRef, useMemo } from 'react';
import { animate, motion, useInView } from 'framer-motion';
import { useCounterState } from '../../../../shared/hooks/useCounterState';
import { getSafeTime } from '../../../../shared/utils/dateUtils';

// Hook simples para o contador — usando ref para evitar re-render que mata a animação
function useAnimatedCounter(target: number, isInView: boolean) {
  const hasAnimatedRef = useRef(false);
  const { value, setValue } = useCounterState(0);

  useEffect(() => {
    // Só dispara quando o slide entrar em tela e apenas uma vez
    if (!isInView || hasAnimatedRef.current || target === 0) return;

    hasAnimatedRef.current = true; // ref: não causa re-render, não mata a animação

    const controls = animate(0, target, {
      duration: 3.5,
      ease: [0.16, 1, 0.3, 1], // expoOut — rápido no início, freia no final
      onUpdate: (v) => setValue(Math.round(v)),
    });

    // Cleanup só cancela se o componente for desmontado antes de terminar
    return () => controls.stop();
  }, [isInView, target, setValue]); // hasAnimatedRef não entra aqui — é uma ref estável

  return value;
}

export function TimeSlide() {
  const { config: siteConfig } = useSiteConfigStore();

  // Detecta quando o slide fica visível (threshold baixo para o carrossel)
  const rootRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(rootRef, { once: true, amount: 0.3 });

  // Cálculo das horas com fix de fuso horário seguro
  const targetHours = useMemo(() => {
    const startStr = siteConfig?.relationship?.startDate;
    const startMs = getSafeTime(startStr) ?? getSafeTime('2025-10-27') ?? Date.now();
    const diff = Math.floor((Date.now() - startMs) / (1000 * 60 * 60));
    return isNaN(diff) || diff < 0 ? 0 : diff;
  }, [siteConfig?.relationship?.startDate]);

  const hours = useAnimatedCounter(targetHours, isInView);
  const formattedNumber = new Intl.NumberFormat('pt-BR').format(hours);

  // Faixas coloridas — pares entram da esquerda, ímpares da direita
  const echoColors = [
    { bg: '#C1175A', text: '#111' }, // Deep Pink
    { bg: '#E65100', text: '#111' }, // Deep Orange
    { bg: '#4A0080', text: '#E5D813' }, // Deep Purple / yellow
    { bg: '#E65100', text: '#111' }, // Deep Orange
    { bg: '#C1175A', text: '#111' }, // Deep Pink
  ];

  return (
    <div
      ref={rootRef}
      className="flex-1 bg-[#0a0a0a] flex flex-col items-stretch justify-center relative overflow-hidden"
    >
      {/* Faixas coloridas com deslizamento horizontal alternado */}
      <div className="absolute inset-0 flex flex-col">
        {echoColors.map((color, i) => {
          const fromX = i % 2 === 0 ? '-120%' : '120%';
          return (
            <motion.div
              key={i}
              className="flex-1 flex items-center overflow-hidden"
              style={{ backgroundColor: color.bg }}
              initial={{ x: fromX, opacity: 0 }}
              animate={isInView ? { x: '0%', opacity: 1 } : {}}
              transition={{ duration: 0.7, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Número dentro da faixa desliza com leve parallax */}
              <motion.span
                className="font-black whitespace-nowrap opacity-85 select-none w-full text-center"
                style={{
                  fontSize: 'clamp(3.5rem, 22vw, 11rem)',
                  lineHeight: 1,
                  color: color.text,
                  letterSpacing: '-0.05em',
                  transform: 'scaleY(1.15)',
                }}
                initial={{ x: i % 2 === 0 ? '12%' : '-12%' }}
                animate={isInView ? { x: '0%' } : {}}
                transition={{ duration: 1.3, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
              >
                {formattedNumber}
              </motion.span>
            </motion.div>
          );
        })}
      </div>

      {/* Overlay central com o número principal */}
      <motion.div
        className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.72) 50%, rgba(0,0,0,0.5) 100%)',
        }}
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {/* Label */}
        <motion.span
          className="text-white/70 text-xs md:text-sm font-bold mb-3 tracking-[0.25em] uppercase"
          initial={{ opacity: 0, y: -12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.45 }}
        >
          Horas Juntos
        </motion.span>

        {/* Número principal */}
        <span
          className="text-white font-black tabular-nums"
          style={{
            fontSize: 'clamp(4rem, 18vw, 10rem)',
            lineHeight: 1,
            letterSpacing: '-0.04em',
            textShadow: '0 0 60px rgba(255,255,255,0.2)',
          }}
        >
          {formattedNumber}
        </span>

        {/* Frase de impacto — aparece após a contagem terminar */}
        <motion.span
          className="text-white/50 text-xs md:text-sm mt-8 flex items-center gap-2 tracking-wide"
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 3.2 }}
        >
          Mais que 14% dos casais no mundo <span>✨</span>
        </motion.span>
      </motion.div>
    </div>
  );
}
