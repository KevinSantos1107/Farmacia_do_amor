import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ChevronRight, Moon, Award } from 'lucide-react';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import { getUniverseData } from './milestoneMath';

export function MilestoneTrigger() {
  const navigate = useNavigate();
  const { config } = useSiteConfigStore();

  const startDate = config?.relationship?.startDate;

  const summary = useMemo(() => {
    if (!startDate) return null;
    const data = getUniverseData(startDate);
    return {
      fullMoons: data.fullMoons,
      reachedAnniversaries: data.reachedAnniversariesCount,
      nextTitle: data.nextMilestone.title,
      daysLeft: data.nextMilestone.daysRemaining,
    };
  }, [startDate]);

  if (!summary) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="flex justify-center pt-2"
    >
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate('/universe')}
        className="group relative inline-flex items-center gap-3 px-5 sm:px-6 py-3 rounded-full border border-theme-primary/30 bg-white/[0.03] hover:bg-white/[0.08] hover:border-theme-primary/60 backdrop-blur-xl shadow-[0_0_25px_rgba(var(--theme-primary-rgb),0.12)] hover:shadow-[0_0_35px_rgba(var(--theme-primary-rgb),0.35)] transition-all duration-300 cursor-pointer overflow-hidden"
      >
        {/* Shimmer light sweep on hover */}
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
        {/* Pulsing indicator icon */}
        <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-theme-primary/15 border border-theme-primary/40 text-theme-primary group-hover:scale-110 transition-transform">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="absolute inset-0 rounded-full bg-theme-primary/20 animate-ping opacity-60 pointer-events-none" />
        </div>

        {/* Text presentation */}
        <div className="flex items-center gap-2 text-left text-xs sm:text-sm font-medium text-white/90">
          <span>O Universo de Vocês</span>
          <span className="hidden sm:inline text-white/30">•</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-slate-300 font-light">
            <Moon className="w-3 h-3 text-sky-400 inline" /> {summary.fullMoons} luas
          </span>
          <span className="hidden sm:inline text-white/30">•</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-slate-300 font-light">
            <Award className="w-3 h-3 text-amber-400 inline" /> {summary.reachedAnniversaries} marcos
          </span>
          <span className="text-white/30">•</span>
          <span className="text-theme-secondary text-[11px] sm:text-xs font-semibold">
            Próximo marco em {summary.daysLeft}d
          </span>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-4 h-4 text-theme-primary/70 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
      </motion.button>
    </motion.div>
  );
}
