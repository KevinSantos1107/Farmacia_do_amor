import { useSiteConfigStore } from '../../../../store/siteConfigStore';
import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { animate } from 'framer-motion';
import { parseSafeDate } from '../../../../shared/utils/dateUtils';

// Fix de fuso horário seguro: lê a data local para nunca cruzar a barreira UTC
function parseLocalDate(dateStr: string): Date {
  return parseSafeDate(dateStr) || new Date();
}

// Estrelas com tamanho e posição estáveis (sem Math.random() no render)
const STARS = Array.from({ length: 55 }, (_, i) => ({
  id: i,
  w: ((i * 7 + 13) % 25) / 10 + 1,       // 1 ~ 3.5px
  top: ((i * 37 + 11) % 100),
  left: ((i * 53 + 7) % 100),
  opacity: ((i * 19 + 3) % 60) / 100 + 0.15,
  delay: ((i * 41) % 30) / 10,
  duration: ((i * 23 + 5) % 20) / 10 + 2,
}));

export function IntroSlide({ onStart, isReady }: { onStart: () => void; isReady: boolean }) {
  const { config } = useSiteConfigStore();
  const [displayDays, setDisplayDays] = useState(0);

  const { days, startDate } = useMemo(() => {
    const startStr = config?.relationship?.startDate;
    const start = startStr ? parseLocalDate(startStr) : parseLocalDate('2025-10-27');
    const d = Math.floor((Date.now() - start.getTime()) / 86400000);
    const formatted = start.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    return { days: isNaN(d) || d < 0 ? 0 : d, startDate: formatted };
  }, [config?.relationship?.startDate]);

  // Animação estilo Spotify: sobe rápido, freia dramaticamente no final
  useEffect(() => {
    if (days === 0) return;
    const controls = animate(0, days, {
      duration: 2.5,
      ease: [0.16, 1, 0.3, 1] as const,
      onUpdate: (v) => setDisplayDays(Math.round(v)),
    });
    return () => controls.stop();
  }, [days]);

  const partner1 = config?.couple?.partner1?.name || 'Você';
  const partner2 = config?.couple?.partner2?.name || '';

  // Variantes de animação para entrar em sequência
  const container = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.18, delayChildren: 0.2 } },
  };
  const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
  };
  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.8 } },
  };

  return (
    <div className="flex-1 relative flex flex-col items-center justify-center text-center overflow-hidden p-6">

      {/* Gradiente de fundo principal */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, #5b21b6 0%, #1a0533 45%, #080010 100%)' }}
      />
      {/* Glow rosado no canto inferior */}
      <div
        className="absolute inset-0 opacity-40"
        style={{ background: 'radial-gradient(ellipse at 75% 90%, #be185d 0%, transparent 55%)' }}
      />
      {/* Glow azulado no canto oposto */}
      <div
        className="absolute inset-0 opacity-20"
        style={{ background: 'radial-gradient(ellipse at 20% 20%, #2563eb 0%, transparent 50%)' }}
      />

      {/* Estrelas pulsantes */}
      <div className="absolute inset-0 pointer-events-none">
        {STARS.map((s) => (
          <motion.div
            key={s.id}
            className="absolute rounded-full bg-white"
            style={{
              width: s.w,
              height: s.w,
              top: `${s.top}%`,
              left: `${s.left}%`,
              opacity: s.opacity,
            }}
            animate={{ opacity: [s.opacity, s.opacity * 2.5, s.opacity] }}
            transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>

      {/* Conteúdo principal com entrada em cascata */}
      <motion.div
        className="z-10 flex flex-col items-center gap-5"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        {/* Nomes do casal */}
        {partner2 && (
          <motion.p
            variants={fadeIn}
            className="text-white/50 text-xs tracking-[0.35em] uppercase font-medium"
          >
            {partner1} &amp; {partner2}
          </motion.p>
        )}

        {/* Título principal com glow */}
        <motion.h1
          variants={fadeUp}
          className="font-black uppercase leading-none"
          style={{
            fontSize: 'clamp(3.2rem, 17vw, 6.5rem)',
            letterSpacing: '-0.03em',
            background: 'linear-gradient(145deg, #ffffff 0%, #e9d5ff 35%, #f9a8d4 70%, #fbbf24 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 35px rgba(192,132,252,0.55))',
          }}
        >
          Nossa
          <br />
          História
        </motion.h1>

        {/* Número de dias */}
        <motion.div variants={fadeUp} className="flex flex-col items-center -mt-1">
          <motion.span
            className="font-black leading-none tabular-nums"
            style={{
              fontSize: 'clamp(4rem, 21vw, 8.5rem)',
              background: 'linear-gradient(180deg, #ffffff 0%, #d946ef 45%, #f43f5e 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 45px rgba(217,70,239,0.75))',
            }}
          >
            {displayDays.toLocaleString('pt-BR')}
          </motion.span>
          <span className="text-white/40 text-[11px] tracking-[0.3em] uppercase mt-1 font-medium">
            Dias Juntos
          </span>
        </motion.div>

        {/* Data de início — só aparece depois dos dias subirem */}
        <motion.p
          variants={fadeIn}
          transition={{ delay: 2.2 }}
          className="text-white/25 text-[11px] -mt-2 font-light"
        >
          Desde {startDate}
        </motion.p>

        {/* Botão Começar */}
        <motion.button
          variants={fadeUp}
          onClick={onStart}
          disabled={!isReady}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="mt-2 px-10 py-4 rounded-full font-bold text-sm uppercase tracking-widest text-white disabled:opacity-50 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
            boxShadow: '0 0 35px rgba(219,39,119,0.55), 0 0 70px rgba(124,58,237,0.25)',
          }}
        >
          {/* Brilho animado no botão */}
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }}
          />
          <span className="relative z-10">
            {isReady ? '▶  Começar' : 'Carregando...'}
          </span>
        </motion.button>
      </motion.div>
    </div>
  );
}


