import { motion } from 'framer-motion';
import { useTimeLeft } from './useTimeLeft';

export interface DaysTogetherBadgeProps {
  startMs: number | null | undefined;
}

export function DaysTogetherBadge({ startMs }: DaysTogetherBadgeProps) {
  const time = useTimeLeft(startMs, 60_000);

  if (!time || time.totalDays <= 0) return null;

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="inline-flex flex-col items-center gap-1 px-10 py-5 rounded-3xl border-2 border-[var(--theme-primary)]/60 bg-white/[0.02] backdrop-blur-xl shadow-[0_0_40px_rgba(var(--theme-primary-rgb),0.4),inset_0_0_20px_rgba(var(--theme-primary-rgb),0.2)]"
    >
      <span
        className="font-bold text-white font-mono"
        style={{
          fontSize: 'clamp(3rem, 10vw, 5rem)',
          lineHeight: 1,
          textShadow: '0 0 15px var(--theme-primary), 0 0 30px var(--theme-primary)',
        }}
      >
        {time.totalDays.toLocaleString('pt-BR')}
      </span>
      <span
        className="text-sm uppercase tracking-[0.3em] text-[var(--theme-secondary)] font-bold"
        style={{ textShadow: '0 0 10px var(--theme-secondary)' }}
      >
        dias juntos
      </span>
    </motion.div>
  );
}
