import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Heart,
  Moon,
  Compass,
  Calendar,
  Clock,
  Share2,
  Check,
  CheckCircle2,
  Hourglass,
  Sun,
  Award,
  TreeDeciduous,
  Star,
  PartyPopper,
} from 'lucide-react';
import { FullScreenOverlay } from '../../shared/ui/FullScreenOverlay';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import { getUniverseData } from './milestoneMath';
import { formatSafeDate } from '../../shared/utils/dateUtils';
import { cn } from '../../shared/utils/cn';

interface MilestonesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabKey = 'overview' | 'bodas' | 'cosmos' | 'nature' | 'curiosities';

const TABS: { id: TabKey; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Destaques', icon: Sparkles },
  { id: 'bodas', label: 'Bodas & Marcos', icon: Award },
  { id: 'cosmos', label: 'Nosso Cosmos', icon: Moon },
  { id: 'nature', label: 'Natureza & Tempo', icon: TreeDeciduous },
  { id: 'curiosities', label: 'Curiosidades', icon: Clock },
];

// ─── Variantes de Animação com Stagger Fluido ────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 22, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 280,
      damping: 24,
    },
  },
};

export function MilestonesModal({ isOpen, onClose }: MilestonesModalProps) {
  const { config } = useSiteConfigStore();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [bodaFilter, setBodaFilter] = useState<'all' | 'monthly' | 'yearly' | 'days'>('all');
  const [copied, setCopied] = useState(false);

  const startDate = config?.relationship?.startDate;
  const partner1 = config?.couple?.partner1;
  const partner2 = config?.couple?.partner2;

  const data = useMemo(() => {
    if (!startDate) return null;
    return getUniverseData(
      startDate,
      partner1 ? { name: partner1.name, birthDate: partner1.birthDate } : undefined,
      partner2 ? { name: partner2.name, birthDate: partner2.birthDate } : undefined
    );
  }, [startDate, partner1, partner2]);

  if (!isOpen || !data || !config) return null;

  const handleCopySummary = () => {
    if (!data) return;
    const text = [
      `✨ O Universo de ${partner1?.name || 'Nós'} & ${partner2?.name || 'Amor'} ✨`,
      `⏱ ${data.totalDays.toLocaleString('pt-BR')} dias de história e cumplicidade`,
      `🌕 ${data.fullMoons} Luas Cheias vividas sob o mesmo céu`,
      `🌍 ${data.solarOrbits} voltas completas ao redor do Sol (${data.orbitalKmMillions.toLocaleString('pt-BR')} mi de km viajados pelo cosmos)`,
      `❄️ ${data.winters} invernos nos aquecendo e 🌸 ${data.springs} primaveras florescendo juntos`,
      `💍 Próximo marco: ${data.nextMilestone.title} em ${data.nextMilestone.daysRemaining} dias`,
      ...(data.lifePercentages
        ? [
            `❤️ ${data.lifePercentages.partner1Name} viveu ${data.lifePercentages.partner1Percent}% da sua vida com ${data.lifePercentages.partner2Name}`,
            `❤️ ${data.lifePercentages.partner2Name} viveu ${data.lifePercentages.partner2Percent}% da sua vida com ${data.lifePercentages.partner1Name}`,
          ]
        : []),
      `\n"Você é o melhor capítulo da minha vida." 💕`,
    ].join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  // Filtragem de bodas
  const filteredBodas = data.bodas.filter((b) => {
    if (bodaFilter === 'monthly') return b.type === 'monthly';
    if (bodaFilter === 'yearly') return b.type === 'yearly';
    return true;
  });

  return (
    <FullScreenOverlay
      isOpen={isOpen}
      onClose={onClose}
      title="O Universo de Vocês"
      subtitle="Marcos, efemérides cósmicas e descobertas sobre a história de vocês"
      icon={<Sparkles className="w-5 h-5 text-theme-primary" />}
      actions={
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCopySummary}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-theme-primary/30 bg-theme-primary/10 hover:bg-theme-primary/20 text-white transition-all cursor-pointer shadow-[0_0_15px_rgba(var(--theme-primary-rgb),0.2)]"
          title="Copiar resumo do casal"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300">Copiado!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-theme-secondary" />
              <span className="hidden sm:inline">Compartilhar</span>
            </>
          )}
        </motion.button>
      }
    >
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8 space-y-6">

        {/* ─── Navegação por Abas (Pill Navigation com Glow) ─── */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl overflow-x-auto no-scrollbar shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 cursor-pointer',
                  isActive
                    ? 'text-white'
                    : 'text-white/60 hover:text-white/90 hover:bg-white/[0.02]'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="milestone-active-tab"
                    className="absolute inset-0 rounded-xl bg-theme-primary/20 border border-theme-primary/40 shadow-[0_0_20px_rgba(var(--theme-primary-rgb),0.35)]"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon className={cn('w-4 h-4 relative z-10 transition-transform duration-300', isActive && 'scale-110 text-theme-primary')} />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ─── Conteúdo das Abas com Animação Detalhada ─── */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -12, transition: { duration: 0.18 } }}
              className="space-y-6"
            >
              {/* Card Destaque: Próximo Marco (com Shimmer Beam e Aura Neon) */}
              <motion.div
                variants={cardVariants}
                whileHover={{ scale: 1.01 }}
                className="relative overflow-hidden rounded-3xl p-6 md:p-8 border border-theme-primary/40 bg-gradient-to-br from-theme-primary/15 via-white/[0.02] to-transparent backdrop-blur-2xl shadow-[0_0_50px_rgba(var(--theme-primary-rgb),0.2)] group"
              >
                {/* Aura respirante no fundo */}
                <motion.div
                  animate={{
                    scale: [1, 1.25, 1],
                    opacity: [0.15, 0.35, 0.15],
                  }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -top-12 -right-12 w-80 h-80 bg-theme-primary/30 blur-[100px] rounded-full pointer-events-none"
                />

                {/* Shimmer Light Beam ao longo do topo */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-theme-primary to-transparent opacity-80 animate-shimmer" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div className="space-y-2">
                    <motion.div
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-theme-primary/20 text-theme-secondary border border-theme-primary/40 shadow-[0_0_15px_rgba(var(--theme-primary-rgb),0.25)]"
                    >
                      <Hourglass className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
                      Próximo Grande Marco
                    </motion.div>
                    <h3 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-white tracking-tight">
                      {data.nextMilestone.title}
                    </h3>
                    <p className="text-sm md:text-base text-slate-300 font-light max-w-lg leading-relaxed">
                      {data.nextMilestone.description}
                    </p>
                    <p className="text-xs text-white/50 pt-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-theme-primary/80" />
                      Data prevista:{' '}
                      <span className="text-white/80 font-medium">
                        {formatSafeDate(data.nextMilestone.targetDate, 'pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-col items-start md:items-end shrink-0">
                    <span className="text-xs uppercase tracking-widest text-slate-400 font-medium">Faltam apenas</span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <motion.span
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                        className="text-5xl sm:text-6xl md:text-7xl font-bold font-mono text-white"
                        style={{ textShadow: '0 0 25px var(--theme-primary)' }}
                      >
                        {data.nextMilestone.daysRemaining}
                      </motion.span>
                      <span className="text-base text-theme-secondary font-medium">
                        {data.nextMilestone.daysRemaining === 1 ? 'dia' : 'dias'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Barra de Progresso Animada com Brilho Deslizante */}
                <div className="mt-6 pt-6 border-t border-white/10 space-y-2 relative z-10">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>
                      <span className="text-white/80 font-semibold font-mono">
                        {data.totalDays.toLocaleString('pt-BR')}
                      </span>{' '}
                      de{' '}
                      <span className="text-white/80 font-semibold font-mono">
                        {data.nextMilestone.totalTargetDays.toLocaleString('pt-BR')}
                      </span>{' '}
                      dias
                    </span>
                    <span className="font-mono text-theme-primary font-bold">
                      Faltam {data.nextMilestone.daysRemaining.toLocaleString('pt-BR')} dias
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden relative p-[1px]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${data.nextMilestone.progressPercent}%` }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                      className="h-full rounded-full bg-gradient-to-r from-theme-primary via-theme-secondary to-theme-accent relative shadow-[0_0_20px_var(--theme-primary)]"
                    >
                      {/* Efeito de luz percorrendo a barra */}
                      <motion.div
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent w-24"
                      />
                    </motion.div>
                  </div>
                </div>
              </motion.div>

              {/* Grid dos 4 Grandes Indicadores com Micro-Animações */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <motion.div
                  variants={cardVariants}
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className="p-4 md:p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-1 relative overflow-hidden group cursor-default"
                >
                  <div className="flex items-center gap-2 text-theme-secondary text-xs uppercase tracking-wider font-semibold">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </motion.div>
                    Tempo Juntos
                  </div>
                  <p className="text-2xl md:text-3xl font-bold font-mono text-white">
                    {data.totalDays.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-[11px] text-white/50">dias de história</p>
                </motion.div>

                <motion.div
                  variants={cardVariants}
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className="p-4 md:p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-1 relative overflow-hidden group cursor-default"
                >
                  <div className="flex items-center gap-2 text-amber-400 text-xs uppercase tracking-wider font-semibold">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Award className="w-3.5 h-3.5" />
                    </motion.div>
                    Bodas Conquistadas
                  </div>
                  <p className="text-2xl md:text-3xl font-bold font-mono text-white">
                    {data.reachedBodasCount}
                  </p>
                  <p className="text-[11px] text-white/50">marcos tradicionais</p>
                </motion.div>

                <motion.div
                  variants={cardVariants}
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className="p-4 md:p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-1 relative overflow-hidden group cursor-default"
                >
                  <div className="flex items-center gap-2 text-sky-400 text-xs uppercase tracking-wider font-semibold">
                    <motion.div
                      animate={{ rotate: [-8, 8, -8] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Moon className="w-3.5 h-3.5" />
                    </motion.div>
                    Luas Cheias
                  </div>
                  <p className="text-2xl md:text-3xl font-bold font-mono text-white">
                    {data.fullMoons}
                  </p>
                  <p className="text-[11px] text-white/50">noites sob lua cheia</p>
                </motion.div>

                <motion.div
                  variants={cardVariants}
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className="p-4 md:p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-1 relative overflow-hidden group cursor-default"
                >
                  <div className="flex items-center gap-2 text-emerald-400 text-xs uppercase tracking-wider font-semibold">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    >
                      <Compass className="w-3.5 h-3.5" />
                    </motion.div>
                    Órbita Solar
                  </div>
                  <p className="text-2xl md:text-3xl font-bold font-mono text-white">
                    {data.solarOrbits}
                  </p>
                  <p className="text-[11px] text-white/50">voltas ao redor do Sol</p>
                </motion.div>
              </div>

              {/* Porcentagem da Vida Entrelaçada com Animação de Batimento */}
              {data.lifePercentages && (
                <motion.div
                  variants={cardVariants}
                  className="p-6 md:p-8 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl space-y-5 relative overflow-hidden"
                >
                  <div className="flex items-center gap-2.5">
                    <motion.div
                      animate={{ scale: [1, 1.3, 1, 1.25, 1] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                    </motion.div>
                    <h4 className="text-lg md:text-xl font-serif font-bold text-white">
                      Linha da Vida Entrelaçada
                    </h4>
                  </div>
                  <p className="text-sm text-slate-300 font-light leading-relaxed">
                    A proporção exata de cada existência que já foi compartilhada sob o mesmo amor:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-white/80 font-medium">{data.lifePercentages.partner1Name}</span>
                        <span className="font-mono text-theme-primary font-bold text-base">
                          {data.lifePercentages.partner1Percent}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${data.lifePercentages.partner1Percent}%` }}
                          transition={{ duration: 1.4, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-theme-primary to-theme-secondary rounded-full shadow-[0_0_10px_var(--theme-primary)]"
                        />
                      </div>
                      <p className="text-[11px] text-white/45">da vida vivida ao lado de {data.lifePercentages.partner2Name}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-white/80 font-medium">{data.lifePercentages.partner2Name}</span>
                        <span className="font-mono text-theme-secondary font-bold text-base">
                          {data.lifePercentages.partner2Percent}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${data.lifePercentages.partner2Percent}%` }}
                          transition={{ duration: 1.4, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-theme-secondary to-theme-accent rounded-full shadow-[0_0_10px_var(--theme-secondary)]"
                        />
                      </div>
                      <p className="text-[11px] text-white/45">da vida vivida ao lado de {data.lifePercentages.partner1Name}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'bodas' && (
            <motion.div
              key="bodas"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -12, transition: { duration: 0.18 } }}
              className="space-y-6"
            >
              {/* Filtro de Bodas */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-white/50 uppercase tracking-wider mr-1">Filtrar:</span>
                {[
                  { id: 'all', label: 'Todas as Bodas' },
                  { id: 'monthly', label: 'Mensais (1 a 11 meses)' },
                  { id: 'yearly', label: 'Anuais (Tradição)' },
                  { id: 'days', label: 'Dias Notáveis' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setBodaFilter(f.id as any)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer',
                      bodaFilter === f.id
                        ? 'bg-theme-primary/25 text-white border border-theme-primary/50 shadow-[0_0_15px_rgba(var(--theme-primary-rgb),0.2)]'
                        : 'bg-white/[0.03] text-white/60 hover:text-white border border-white/5'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Lista com Animações Staggered */}
              {bodaFilter === 'days' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.dayMilestones.map((milestone) => (
                    <motion.div
                      key={milestone.targetDays}
                      variants={cardVariants}
                      whileHover={{ scale: 1.02, y: -3 }}
                      className={cn(
                        'p-4 rounded-2xl border transition-all flex items-center justify-between',
                        milestone.isReached
                          ? 'bg-white/[0.04] border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                          : 'bg-white/[0.02] border-white/5 opacity-75'
                      )}
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs text-theme-primary font-mono font-semibold uppercase tracking-wider">
                          {milestone.targetDays.toLocaleString('pt-BR')} Dias
                        </span>
                        <p className="text-sm font-medium text-white">{milestone.title}</p>
                        <p className="text-[11px] text-white/50">
                          {formatSafeDate(milestone.targetDate, 'pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div>
                        {milestone.isReached ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Alcançado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-white/5 text-slate-300 border border-white/10">
                            Faltam {milestone.daysRemaining}d
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredBodas.map((boda, idx) => (
                    <motion.div
                      key={idx}
                      variants={cardVariants}
                      whileHover={{ scale: 1.02, y: -3 }}
                      className={cn(
                        'p-5 rounded-2xl border transition-all space-y-2 relative overflow-hidden',
                        boda.isReached
                          ? 'bg-white/[0.04] border-theme-primary/30 shadow-[0_0_25px_rgba(var(--theme-primary-rgb),0.08)]'
                          : 'bg-white/[0.015] border-white/5 opacity-80'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-widest text-theme-secondary">
                            {boda.period}
                          </span>
                          <h4 className="text-base font-serif font-bold text-white mt-0.5">{boda.name}</h4>
                        </div>
                        {boda.isReached ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                            <Check className="w-3 h-3 text-emerald-400" /> Celebrado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/5 text-white/60 border border-white/10 shrink-0">
                            Em {boda.daysRemaining} dias
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 font-light leading-relaxed">{boda.meaning}</p>

                      <div className="pt-2 border-t border-white/5 text-[10px] text-white/40">
                        {boda.isReached ? 'Comemorado em: ' : 'Data prevista: '}
                        <span className="text-white/70 font-medium">
                          {formatSafeDate(boda.targetDate, 'pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'cosmos' && (
            <motion.div
              key="cosmos"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -12, transition: { duration: 0.18 } }}
              className="space-y-6"
            >
              {/* O Céu no Dia do Início com Esfera Cósmica Flutuante */}
              <motion.div
                variants={cardVariants}
                className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-white/[0.02] to-transparent border border-indigo-500/30 backdrop-blur-xl relative overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                  {/* Esfera lunar animada */}
                  <div className="relative shrink-0">
                    <motion.div
                      animate={{
                        scale: [1, 1.15, 1],
                        opacity: [0.4, 0.7, 0.4],
                      }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute inset-0 rounded-full bg-indigo-500/30 blur-xl"
                    />
                    <motion.div
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                      className="relative w-24 h-24 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-5xl shadow-[0_0_35px_rgba(165,180,252,0.3)]"
                    >
                      <span>{data.startMoonPhase.emoji}</span>
                    </motion.div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs uppercase tracking-widest text-indigo-300 font-bold">
                      A Lua no Dia do Nosso Início
                    </span>
                    <h3 className="text-2xl font-serif font-bold text-white">
                      {data.startMoonPhase.phaseName} ({data.startMoonPhase.illumination}% iluminada)
                    </h3>
                    <p className="text-sm text-slate-300 font-light leading-relaxed max-w-xl">
                      {data.startMoonPhase.description}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Estatísticas Cósmicas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <motion.div
                  variants={cardVariants}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-2"
                >
                  <div className="flex items-center gap-2 text-sky-400 text-xs uppercase tracking-wider font-semibold">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
                    >
                      <Moon className="w-4 h-4" />
                    </motion.div>
                    Ciclos Lunares
                  </div>
                  <p className="text-2xl font-bold font-mono text-white">{data.fullMoons} Luas Cheias</p>
                  <p className="text-xs text-slate-300 font-light leading-relaxed">
                    Você e seu amor já dividiram {data.fullMoons} noites de lua cheia e {data.newMoons} luas novas de renovação.
                  </p>
                </motion.div>

                <motion.div
                  variants={cardVariants}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-2"
                >
                  <div className="flex items-center gap-2 text-purple-400 text-xs uppercase tracking-wider font-semibold">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
                    >
                      <Compass className="w-4 h-4" />
                    </motion.div>
                    Viagem Espacial Compartilhada
                  </div>
                  <p className="text-2xl font-bold font-mono text-white">
                    {data.orbitalKmMillions.toLocaleString('pt-BR')} milhões km
                  </p>
                  <p className="text-xs text-slate-300 font-light leading-relaxed">
                    Distância que a Terra já percorreu ao redor do Sol com vocês dois juntos a bordo do mesmo planeta.
                  </p>
                </motion.div>

                <motion.div
                  variants={cardVariants}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-2"
                >
                  <div className="flex items-center gap-2 text-amber-400 text-xs uppercase tracking-wider font-semibold">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                    >
                      <Sun className="w-4 h-4" />
                    </motion.div>
                    Solstícios & Equinócios
                  </div>
                  <p className="text-2xl font-bold font-mono text-white">{data.solsticesAndEquinoxes} Alinhamentos</p>
                  <p className="text-xs text-slate-300 font-light leading-relaxed">
                    Mudanças cósmicas de luz, incluindo os dias mais longos e as noites mais aconchegantes do ano.
                  </p>
                </motion.div>

                <motion.div
                  variants={cardVariants}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-2"
                >
                  <div className="flex items-center gap-2 text-rose-400 text-xs uppercase tracking-wider font-semibold">
                    <motion.div
                      animate={{ scale: [1, 1.25, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Sparkles className="w-4 h-4" />
                    </motion.div>
                    Translação Terrestre
                  </div>
                  <p className="text-2xl font-bold font-mono text-white">{data.solarOrbits} Voltas Completas</p>
                  <p className="text-xs text-slate-300 font-light leading-relaxed">
                    Anos siderais inteiros de cumplicidade, orbitando o calor do Sol.
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}

          {activeTab === 'nature' && (
            <motion.div
              key="nature"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -12, transition: { duration: 0.18 } }}
              className="space-y-6"
            >
              {/* Estações do Ano com Micro-Animações Temáticas */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-white/70">
                  As 4 Estações Divididas (Hemisfério Sul)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <motion.div
                    variants={cardVariants}
                    whileHover={{ scale: 1.04, y: -3 }}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-amber-500/20 text-center space-y-1.5 cursor-default"
                  >
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                      className="text-2xl inline-block"
                    >
                      ☀️
                    </motion.span>
                    <p className="text-xl font-bold font-mono text-white">{data.summers}</p>
                    <p className="text-xs text-slate-400">Verões</p>
                  </motion.div>

                  <motion.div
                    variants={cardVariants}
                    whileHover={{ scale: 1.04, y: -3 }}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-orange-500/20 text-center space-y-1.5 cursor-default"
                  >
                    <motion.span
                      animate={{ rotate: [-6, 6, -6], y: [-2, 2, -2] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      className="text-2xl inline-block"
                    >
                      🍂
                    </motion.span>
                    <p className="text-xl font-bold font-mono text-white">{data.autumns}</p>
                    <p className="text-xs text-slate-400">Outonos</p>
                  </motion.div>

                  <motion.div
                    variants={cardVariants}
                    whileHover={{ scale: 1.04, y: -3 }}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-sky-500/20 text-center space-y-1.5 cursor-default"
                  >
                    <motion.span
                      animate={{ opacity: [0.7, 1, 0.7], scale: [0.95, 1.05, 0.95] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                      className="text-2xl inline-block"
                    >
                      ❄️
                    </motion.span>
                    <p className="text-xl font-bold font-mono text-white">{data.winters}</p>
                    <p className="text-xs text-slate-400">Invernos</p>
                  </motion.div>

                  <motion.div
                    variants={cardVariants}
                    whileHover={{ scale: 1.04, y: -3 }}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-rose-500/20 text-center space-y-1.5 cursor-default"
                  >
                    <motion.span
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      className="text-2xl inline-block"
                    >
                      🌸
                    </motion.span>
                    <p className="text-xl font-bold font-mono text-white">{data.springs}</p>
                    <p className="text-xs text-slate-400">Primaveras</p>
                  </motion.div>
                </div>
              </div>

              {/* Momentos Especiais no Calendário (Sem sexta-feira 13) */}
              <div className="space-y-3 pt-2">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-white/70">
                  Memórias do Nosso Calendário
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <motion.div
                    variants={cardVariants}
                    whileHover={{ y: -3 }}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1"
                  >
                    <div className="flex items-center gap-2 text-theme-primary text-xs font-semibold uppercase">
                      <Calendar className="w-3.5 h-3.5" />
                      Finais de Semana
                    </div>
                    <p className="text-2xl font-bold font-mono text-white">{data.weekends}</p>
                    <p className="text-[11px] text-white/50">sábados para descansar e amar</p>
                  </motion.div>

                  <motion.div
                    variants={cardVariants}
                    whileHover={{ y: -3 }}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1"
                  >
                    <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold uppercase">
                      <PartyPopper className="w-3.5 h-3.5" />
                      Natais & Réveillons
                    </div>
                    <p className="text-2xl font-bold font-mono text-white">
                      {data.christmases} 🎄 / {data.newYears} 🎆
                    </p>
                    <p className="text-[11px] text-white/50">viradas de ano e noites especiais</p>
                  </motion.div>

                  <motion.div
                    variants={cardVariants}
                    whileHover={{ y: -3 }}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1"
                  >
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase">
                      <Star className="w-3.5 h-3.5" />
                      Renovações do Mês
                    </div>
                    <p className="text-2xl font-bold font-mono text-white">{data.monthlyAnniversaries}</p>
                    <p className="text-[11px] text-white/50">vezes celebrando o dia de vocês</p>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'curiosities' && (
            <motion.div
              key="curiosities"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -12, transition: { duration: 0.18 } }}
              className="space-y-4"
            >
              {/* Batimentos Cardíacos com Pulso Vivo */}
              <motion.div
                variants={cardVariants}
                whileHover={{ scale: 1.02 }}
                className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left relative overflow-hidden"
              >
                <div className="relative shrink-0">
                  <motion.div
                    animate={{
                      scale: [1, 1.35, 1, 1.25, 1],
                      opacity: [0.2, 0.5, 0.2, 0.4, 0.2],
                    }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-0 rounded-2xl bg-rose-500/30 blur-lg"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.15, 1, 1.1, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                    className="relative w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.4, 1, 1.3, 1] }}
                      transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Heart className="w-8 h-8 fill-rose-500 text-rose-500" />
                    </motion.div>
                  </motion.div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-wider text-rose-400 font-bold">Compasso Biológico</span>
                  <h4 className="text-xl font-serif font-bold text-white">
                    ~{data.estimatedHeartbeatsMillions.toLocaleString('pt-BR')} Milhões de Batimentos
                  </h4>
                  <p className="text-xs text-slate-300 font-light leading-relaxed">
                    Estimativa de quantas vezes seus corações já bateram no mesmo mundo desde o primeiro instante de relacionamento.
                  </p>
                </div>
              </motion.div>

              {/* Descanso e Sonhos */}
              <motion.div
                variants={cardVariants}
                whileHover={{ scale: 1.02 }}
                className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left relative overflow-hidden"
              >
                <div className="relative shrink-0">
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.15, 0.35, 0.15],
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-0 rounded-2xl bg-indigo-500/30 blur-lg"
                  />
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    className="relative w-16 h-16 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400"
                  >
                    <Moon className="w-8 h-8" />
                  </motion.div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-wider text-indigo-400 font-bold">Descanso & Sonhos</span>
                  <h4 className="text-xl font-serif font-bold text-white">
                    ~{data.estimatedSleepHours.toLocaleString('pt-BR')} Horas de Repouso
                  </h4>
                  <p className="text-xs text-slate-300 font-light leading-relaxed">
                    Horas de noites tranquilas vividas sabendo que você tem alguém especial para chamar de lar.
                  </p>
                </div>
              </motion.div>

              {/* O Tempo ao Vivo */}
              <motion.div
                variants={cardVariants}
                whileHover={{ scale: 1.02 }}
                className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left relative overflow-hidden"
              >
                <div className="relative shrink-0">
                  <motion.div
                    animate={{
                      scale: [1, 1.25, 1],
                      opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-0 rounded-2xl bg-amber-500/30 blur-lg"
                  />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
                    className="relative w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400"
                  >
                    <Clock className="w-8 h-8" />
                  </motion.div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-wider text-amber-400 font-bold">O Tempo ao Vivo</span>
                  <h4 className="text-xl font-serif font-bold text-white">
                    {data.totalHours.toLocaleString('pt-BR')} Horas • {data.totalMinutes.toLocaleString('pt-BR')} Minutos
                  </h4>
                  <p className="text-xs text-slate-300 font-light leading-relaxed">
                    Cada minuto ao lado de quem se ama é um pedaço de eternidade construído no presente.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </FullScreenOverlay>
  );
}
