import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ChevronDown, RefreshCw, Sparkles, Clock, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSiteConfigStore } from '../store/siteConfigStore';
import { useThemeStore } from '../store/useThemeStore';
import { lazy, Suspense } from 'react';
import { DaysTogetherBadge } from './home/DaysTogetherBadge';
import { Countdown } from './home/Countdown';

const PlaylistTabs = lazy(() => import('../features/playlist/PlaylistTabs').then(m => ({ default: m.PlaylistTabs })));
const AlbumCarousel = lazy(() => import('../features/album/AlbumCarousel').then(m => ({ default: m.AlbumCarousel })));
import { getSafeTime } from '../shared/utils/dateUtils';

// ─── Data ────────────────────────────────────────────────────────────────────
const LOVE_MESSAGES = [
  'Cada dia ao seu lado é uma página nova em nosso livro de amor, escrita com sorrisos, carinho e cumplicidade.',
  'Se eu pudesse escolher novamente entre todas as pessoas do mundo, escolheria você, sempre você.',
  'Nos seus olhos encontro meu lugar favorito no mundo, onde posso ser apenas eu e saber que sou amado.',
  'O amor que sinto por você não cabe em palavras, mas transborda em cada gesto, cada olhar, cada momento juntos.',
  'Mesmo de longe, você conseguiu fazer eu me sentir mais amado do que nunca.',
  'Você transformou a distância em mais uma prova de que fomos feitos um para o outro.',
  'Amar você é a coisa mais natural e bonita que já aconteceu na minha vida.',
  'Você chegou na minha vida e, sem perceber, se tornou meu lugar favorito.',
  'Não importa a distância, meu coração sempre encontra o caminho até você.',
  'Com você, até os dias comuns se tornam especiais.',
  'Você é a melhor coincidência que a vida colocou no meu caminho.',
  'Entre tantas pessoas no mundo, foi você quem fez meu coração se sentir em casa.',
  'Seu amor mudou completamente a forma como eu vejo a vida.',
  'Toda vez que penso no futuro, é você que eu imagino ao meu lado.',
  'Você conseguiu ser minha paz mesmo estando quilômetros de distância.',
];

const ACROSTIC = [
  {
    letter: 'I',
    color: 'text-[var(--theme-primary)]',
    short: 'ncrível — você é boa em tudo que faz',
    long: 'Sua dedicação, seu esforço e o carinho fazem eu admirar você cada dia mais. Estar ao seu lado me inspira a querer ser alguém melhor todos os dias.',
  },
  {
    letter: 'A',
    color: 'text-[var(--theme-secondary)]',
    short: 'mor — você me mostrou o que é o verdadeiro amor',
    long: 'Com você, amar deixou de ser apenas uma palavra e virou sentimento, cuidado, reciprocidade e paz. Seu amor melhorou a minha vida em todos os sentidos.',
  },
  {
    letter: 'R',
    color: 'text-[var(--theme-accent)]',
    short: 'ara — não é fácil encontrar alguém como você',
    long: 'Quanto mais eu te conheço, mais percebo o quão única e especial você é. Você é como uma joia rara: difícil de encontrar, impossível de substituir.',
  },
  {
    letter: 'A',
    color: 'text-[var(--theme-primary)]',
    short: 'utêntica — a sua essência é única',
    long: 'O seu jeitinho, sua personalidade e a forma sincera com que você vive a vida me deixam completamente apaixonado. Você consegue ser diferente de todo mundo da melhor forma possível.',
  },
];

import type { Variants } from 'framer-motion';

// ─── Animations ──────────────────────────────────────────────────────────────
const fadeUpVariant: Variants = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0 },
};

import { MeteorShower } from '../features/themes/components/MeteorShower';
import { FallingHearts } from '../features/themes/components/FallingHearts';
import { AuroraBorealis } from '../features/themes/components/AuroraBorealis';
import { FrostVignette } from '../features/themes/components/FrostVignette';
import { ParticleCanvas } from '../features/themes/components/ParticleCanvas';


// ─── Section Divider ─────────────────────────────────────────────────────────
function SectionLabel({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex justify-center">
      <span className="px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest bg-[var(--theme-primary)]/10 text-white border border-[var(--theme-primary)]/50 flex items-center gap-3 backdrop-blur-md shadow-[0_0_20px_rgba(var(--theme-primary-rgb),0.4)]">
        <span style={{ textShadow: '0 0 10px var(--theme-primary)' }}>{emoji}</span> {text}
      </span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const { config } = useSiteConfigStore();
  const { activeTheme } = useThemeStore();
  const [msgIndex, setMsgIndex] = useState(0);
  const [openAcrostic, setOpenAcrostic] = useState<number | null>(null);

  const startMs = useMemo(() => {
    return getSafeTime(config?.relationship?.startDate);
  }, [config?.relationship?.startDate]);

  useEffect(() => {
    const THEMES = {
      meteors: {
        primary: '#9d4edd',
        primaryRgb: '157, 78, 221',
        secondary: '#e0aaff',
        accent: '#c77dff',
      },
      hearts: {
        primary: '#ff0055',
        primaryRgb: '255, 0, 85',
        secondary: '#ff4d94',
        accent: '#ff2a7a',
      },
      aurora: {
        primary: '#00ffc8',
        primaryRgb: '0, 255, 200',
        secondary: '#a855f7',
        accent: '#22d3ee',
      },
      snow: {
        primary: '#00f0ff',
        primaryRgb: '0, 240, 255',
        secondary: '#ffffff',
        accent: '#4a90e2',
      },
    };

    const t = THEMES[activeTheme];
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', t.primary);
    root.style.setProperty('--theme-primary-rgb', t.primaryRgb);
    root.style.setProperty('--theme-secondary', t.secondary);
    root.style.setProperty('--theme-accent', t.accent);
  }, [activeTheme]);

  // Preload dinâmico da imagem de capa apenas quando a rota Home estiver montada
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = '/capa_principal.jpg';
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);

  if (!config) return null;

  const { partner1, partner2 } = config.couple;

  return (
    <div
      className="relative -mt-0 min-h-[100lvh] text-slate-200 selection:bg-[var(--theme-primary)]/40 selection:text-white overflow-x-hidden"
      style={
        activeTheme === 'meteors'
          ? {
              backgroundImage: 'linear-gradient(rgba(3, 0, 13, 0.35), rgba(11, 1, 32, 0.5))',
              backgroundColor: '#03000d',
            }
          : activeTheme === 'hearts'
          ? { background: '#05050A' }
          : activeTheme === 'aurora'
          ? { background: 'linear-gradient(180deg, #000a0f 0%, #00110d 35%, #001a14 65%, #000508 100%)' }
          : { background: 'linear-gradient(180deg, #020412 0%, #0a1526 50%, #07192f 100%)' }
      }
    >
      {/* ══════════════════════════ NEBULA BACKGROUND (METEORS) ══════════════════════════ */}
      {activeTheme === 'meteors' && (
        <>
          {/* Imagem de fundo — fixada com viewport máximo para evitar resize jumps no mobile */}
          <div
            className="nebula-bg-mobile fixed top-0 left-0 w-full h-[100lvh] z-0 pointer-events-none"
            style={{
              backgroundRepeat: 'no-repeat',
              opacity: 0.9,
            }}
          />
          {/* Overlay escuro fixo nas extremidades do viewport para legibilidade contínua */}
          <div
            className="fixed top-0 left-0 w-full h-[100lvh] z-0 pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, rgba(3,0,13,0.4) 0%, transparent 20%, transparent 80%, rgba(3,0,13,0.5) 100%)',
            }}
          />
        </>
      )}


      {/* ══════════════════════════ BACKGROUND NEON LIGHTS ══════════════════════════ */}
      <div className="fixed top-0 left-0 w-screen h-[100lvh] z-0 pointer-events-none">
        {activeTheme === 'meteors' ? (
          <>
            <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-900/20 blur-[200px] rounded-full" />
            <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] bg-teal-700/15 blur-[180px] rounded-full" />
            <div className="absolute bottom-[-10%] left-[20%] w-[700px] h-[700px] bg-indigo-900/20 blur-[220px] rounded-full" />
          </>
        ) : (
          <>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[600px] bg-[var(--theme-primary)]/10 blur-[150px] rounded-full" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[var(--theme-accent)]/5 blur-[150px] rounded-full" />
            <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-[var(--theme-primary)]/10 blur-[150px] rounded-full" />
          </>
        )}
      </div>

      {/* ══════════════════════════ PARTICLES (SITE-WIDE) ══════════════════════════ */}
      <ParticleCanvas theme={activeTheme} />

      {/* ══════════════════════════ DYNAMIC EFFECTS ══════════════════════════ */}
      {activeTheme === 'meteors' ? (
        <MeteorShower />
      ) : activeTheme === 'hearts' ? (
        <FallingHearts />
      ) : activeTheme === 'aurora' ? (
        <AuroraBorealis />
      ) : (
        <FrostVignette />
      )}

      {/* ══════════════════════════ HERO ══════════════════════════ */}
      <section id="section-hero" className="relative min-h-screen flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="relative z-10 text-center space-y-12 py-16 max-w-2xl mx-auto"
        >
          <div className="flex justify-center">
            <div className="relative">
              <Heart
                className="w-24 h-24 text-[var(--theme-secondary)] fill-[var(--theme-secondary)]"
                style={{ filter: 'drop-shadow(0 0 30px var(--theme-primary))' }}
              />
              <Heart className="w-24 h-24 text-[var(--theme-secondary)] fill-[var(--theme-secondary)] absolute inset-0 animate-ping opacity-50" />
            </div>
          </div>

          <div className="space-y-4">
            <h1
              className="font-serif font-bold leading-none tracking-tight"
              style={{
                fontSize: 'clamp(4rem, 15vw, 7.5rem)',
                color: '#fff',
                textShadow: '0 0 15px var(--theme-primary), 0 0 30px var(--theme-primary), 0 0 60px rgba(157, 78, 221, 0.8)',
              }}
            >
              {partner1.name}
            </h1>
            <p
              className="text-5xl text-white"
              style={{
                fontFamily: "'Dancing Script', cursive",
                textShadow: '0 0 15px var(--theme-primary), 0 0 30px var(--theme-primary)',
              }}
            >
              &amp;
            </p>
            <h1
              className="font-serif font-bold leading-none tracking-tight"
              style={{
                fontSize: 'clamp(4rem, 15vw, 7.5rem)',
                color: '#fff',
                textShadow: '0 0 15px var(--theme-primary), 0 0 30px var(--theme-primary), 0 0 60px rgba(157, 78, 221, 0.8)',
              }}
            >
              {partner2.name}
            </h1>
          </div>

          <p
            className="text-xl md:text-2xl text-white italic leading-relaxed px-4 font-light"
            style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}
          >
            "Você é o melhor capítulo da minha vida"
          </p>

          <DaysTogetherBadge startMs={startMs} />

          <div className="flex flex-col items-center gap-3 pt-12 opacity-80">
            <span
              className="text-sm uppercase tracking-[0.2em] font-bold text-[var(--theme-secondary)]"
              style={{ textShadow: '0 0 10px var(--theme-secondary)' }}
            >
              Explore
            </span>
            <ChevronDown
              className="w-8 h-8 text-[var(--theme-primary)] animate-bounce"
              style={{ filter: 'drop-shadow(0 0 15px var(--theme-primary))' }}
            />
          </div>
        </motion.div>
      </section>

      {/* ══════════════════════════ CARTA DE AMOR ══════════════════════════ */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={fadeUpVariant}
        className="relative py-24 px-4 z-10"
        id="section-carta"
      >
        <div className="max-w-2xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <SectionLabel emoji="💌" text="Uma Carta Para Você" />
          </div>

          <div className="relative rounded-[2.5rem] overflow-hidden border border-[var(--theme-primary)]/30 bg-white/[0.03] backdrop-blur-2xl shadow-[0_0_50px_rgba(var(--theme-primary-rgb),0.2),inset_0_0_25px_rgba(var(--theme-primary-rgb),0.08)] transition-all duration-500 hover:border-[var(--theme-primary)]/50 hover:shadow-[0_0_70px_rgba(var(--theme-primary-rgb),0.35),inset_0_0_35px_rgba(var(--theme-primary-rgb),0.15)] group">

            {/* ── Imagem de Capa (LCP) ── */}
            <div className="relative w-full aspect-[16/10] overflow-hidden">
              <img
                src="/capa_principal.jpg"
                alt={config.couple
                  ? `${config.couple.partner1.name} & ${config.couple.partner2.name}`
                  : 'Capa do site'
                }
                width={1498}
                height={936}
                fetchPriority="high"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110"
              />
              {/* Gradient overlay from bottom */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#05050A] via-[#05050A]/40 to-transparent" />
              {/* Neon glow overlay at edges */}
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--theme-primary)]/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              {/* Side vignette */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,#05050A_100%)] opacity-60" />

              {/* Neon frame line at bottom of image */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--theme-primary)] to-transparent shadow-[0_0_15px_var(--theme-primary)]" />
            </div>

            {/* ── Conteúdo da Carta ── */}
            <div className="relative px-6 pb-8 pt-6 md:p-14 md:-mt-6">
              <p
                className="text-2xl md:text-3xl font-bold text-white mb-8 relative z-10"
                style={{
                  fontFamily: "'Dancing Script', cursive",
                  textShadow: '0 0 15px rgba(var(--theme-primary-rgb),0.6)',
                }}
              >
                {partner2.name},
              </p>

              <div className="space-y-6 text-base md:text-lg leading-relaxed text-slate-200/90 font-light">
                <p>
                  Posso dizer com toda certeza que encontrar alguém como você não é algo fácil. Uma garota linda por dentro e por fora, que chegou na minha vida e transformou completamente o meu 2025.
                </p>
                <p>
                  Você é quem me inspira todos os dias, quem me traz força, paz e alegria mesmo nos momentos difíceis. Com você, a vida ficou mais leve, mais bonita e mais verdadeira. A distância só me deu mais certeza de que é você quem eu quero ao meu lado.
                </p>
              </div>

              <div className="mt-10 pt-8 border-t border-[var(--theme-primary)]/20 text-right">
                <p className="text-sm text-slate-400 uppercase tracking-widest mb-2">Com todo meu amor,</p>
                <p
                  className="text-3xl font-bold text-white"
                  style={{
                    fontFamily: "'Dancing Script', cursive",
                    textShadow: '0 0 15px var(--theme-primary), 0 0 30px var(--theme-primary)',
                  }}
                >
                  {partner1.name} 💕
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ══════════════════════════ CONTADOR ══════════════════════════ */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={fadeUpVariant}
        className="relative py-24 px-4 overflow-hidden z-10"
        id="section-contador"
      >
        <div className="max-w-3xl mx-auto text-center space-y-12">
          <div className="space-y-4">
            <SectionLabel emoji="⏱" text="Tempo Juntos" />
            <h2
              className="text-4xl md:text-5xl font-serif font-bold text-white mt-4"
              style={{ textShadow: '0 0 20px var(--theme-primary)' }}
            >
              Contando Cada Segundo
            </h2>
          </div>

          <Countdown startMs={startMs} />
        </div>
      </motion.section>

      {/* ══════════════════════════ TRILHA SONORA ══════════════════════════ */}
      {config.features.enableMusic && (
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeUpVariant}
          className="py-24 overflow-hidden relative z-10"
          id="section-musica"
        >
          <div className="max-w-3xl mx-auto text-center space-y-4 px-4 mb-12">
            <SectionLabel emoji="🎵" text="Nossa Trilha Sonora" />
            <h2
              className="text-4xl md:text-5xl font-serif font-bold text-white mt-4"
              style={{ textShadow: '0 0 20px var(--theme-primary)' }}
            >
              Escolha a Playlist
            </h2>
          </div>
          <div className="relative z-10 px-4 max-w-4xl mx-auto">
            <Suspense fallback={null}>
              <PlaylistTabs />
            </Suspense>
          </div>
        </motion.section>
      )}

      {/* ══════════════════════════ ÁLBUNS ══════════════════════════ */}
      {config.features.enableAlbum && (
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeUpVariant}
          className="py-24 overflow-hidden z-10 relative"
          id="section-albuns"
        >
          <div className="max-w-3xl mx-auto text-center space-y-4 px-4 mb-12">
            <SectionLabel emoji="📸" text="Nossas Memórias" />
            <h2
              className="text-4xl md:text-5xl font-serif font-bold text-white mt-4"
              style={{ textShadow: '0 0 20px var(--theme-primary)' }}
            >
              Nosso Álbum
            </h2>
          </div>
          <div className="drop-shadow-[0_0_40px_rgba(var(--theme-primary-rgb),0.3)]">
            <Suspense fallback={null}>
              <AlbumCarousel />
            </Suspense>
          </div>
        </motion.section>
      )}

      {/* ══════════════════════════ ACRÓSTICO ══════════════════════════ */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={fadeUpVariant}
        className="py-24 px-4 z-10 relative"
        id="section-acrostico"
      >
        <div className="max-w-3xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <SectionLabel emoji="✨" text="Acróstico" />
            <h2
              className="text-4xl md:text-5xl font-serif font-bold text-white mt-4 tracking-wide"
              style={{ textShadow: '0 0 20px var(--theme-primary)' }}
            >
              I A R A
            </h2>
          </div>

          <div className="space-y-5">
            {ACROSTIC.map((line, index) => {
              const isOpen = openAcrostic === index;
              return (
                <motion.button
                  key={index}
                  onClick={() => setOpenAcrostic(isOpen ? null : index)}
                  layout
                  transition={{ layout: { type: 'spring', stiffness: 300, damping: 30 } }}
                  className={`
                    w-full text-left rounded-2xl overflow-hidden
                    backdrop-blur-xl transition-all duration-500 group
                    border
                    ${isOpen
                      ? 'bg-white/[0.06] border-[var(--theme-primary)]/50 shadow-[0_0_50px_rgba(var(--theme-primary-rgb),0.25),inset_0_1px_0_rgba(255,255,255,0.08)]'
                      : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-[var(--theme-primary)]/40 hover:shadow-[0_0_35px_rgba(var(--theme-primary-rgb),0.15)]'
                    }
                  `}
                  style={{ touchAction: 'manipulation' }}
                >
                  {/* Active glow line at top */}
                  <div
                    className={`h-[2px] w-full transition-all duration-500 ${
                      isOpen
                        ? 'bg-gradient-to-r from-transparent via-[var(--theme-primary)] to-transparent opacity-100'
                        : 'bg-gradient-to-r from-transparent via-[var(--theme-primary)] to-transparent opacity-0 group-hover:opacity-40'
                    }`}
                  />

                  <div className="flex items-center gap-5 p-5 md:p-7">
                    {/* Letter badge */}
                    <div className={`
                      relative w-14 h-14 md:w-16 md:h-16 rounded-xl shrink-0
                      flex items-center justify-center
                      transition-all duration-500
                      ${isOpen
                        ? 'bg-[var(--theme-primary)]/15 shadow-[0_0_25px_rgba(var(--theme-primary-rgb),0.3)]'
                        : 'bg-white/[0.04] group-hover:bg-[var(--theme-primary)]/10'
                      }
                    `}>
                      <span
                        className={`text-3xl md:text-4xl font-bold font-serif ${line.color} transition-all duration-500`}
                        style={{
                          textShadow: isOpen ? '0 0 25px currentColor' : '0 0 12px currentColor',
                          filter: isOpen ? 'brightness(1.2)' : undefined,
                        }}
                      >
                        {line.letter}
                      </span>
                    </div>

                    {/* Content area */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-white/90 font-medium text-lg md:text-xl leading-snug"
                        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                      >
                        <span className={`font-bold ${line.color}`}>{line.letter}</span>
                        {line.short}
                      </p>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            key={`acrostic-content-${index}`}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{
                              height: { type: 'spring', stiffness: 250, damping: 28 },
                              opacity: { duration: 0.25, ease: 'easeInOut' },
                            }}
                            className="overflow-hidden"
                          >
                            <div className="pt-4 pb-1">
                              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4" />
                              <p className="text-slate-300/90 text-base md:text-lg leading-relaxed font-light">
                                {line.long}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Chevron */}
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="shrink-0"
                    >
                      <ChevronDown
                        className={`w-6 h-6 transition-colors duration-300 ${
                          isOpen ? 'text-[var(--theme-primary)]' : 'text-white/30 group-hover:text-white/60'
                        }`}
                        style={isOpen ? { filter: 'drop-shadow(0 0 8px var(--theme-primary))' } : undefined}
                      />
                    </motion.div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* ══════════════════════════ MENSAGEM ROMÂNTICA ══════════════════════════ */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={fadeUpVariant}
        className="py-24 px-4 z-10 relative"
        id="section-mensagens"
      >
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-[2.5rem] overflow-hidden border border-[var(--theme-primary)]/30 bg-white/[0.03] backdrop-blur-2xl shadow-[0_0_50px_rgba(var(--theme-primary-rgb),0.2),inset_0_1px_0_rgba(255,255,255,0.1)] p-8 md:p-14 text-center space-y-10 transition-all duration-500 hover:border-[var(--theme-primary)]/50 hover:shadow-[0_0_70px_rgba(var(--theme-primary-rgb),0.35),inset_0_1px_0_rgba(255,255,255,0.15)] group">
            
            {/* Top gradient glow line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--theme-primary)] to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className="space-y-4">
              <motion.div 
                animate={{ rotate: [-5, 5, -5] }}
                transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
              >
                <Sparkles
                  className="w-12 h-12 text-[var(--theme-primary)] mx-auto opacity-90"
                  style={{ filter: 'drop-shadow(0 0 15px var(--theme-primary))' }}
                />
              </motion.div>
              
              <h2
                className="text-3xl md:text-4xl font-serif font-bold text-white tracking-wide"
                style={{ textShadow: '0 0 20px var(--theme-primary)' }}
              >
                Para Minha Princesa
              </h2>
            </div>

            <div className="min-h-[160px] md:min-h-[140px] flex items-center justify-center px-2">
              <AnimatePresence mode="wait">
                <motion.p
                  key={msgIndex}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="text-white/95 leading-relaxed md:leading-loose text-xl md:text-2xl italic font-light tracking-wide"
                  style={{ textShadow: '0 2px 10px rgba(0,0,0,0.4)' }}
                >
                  "{LOVE_MESSAGES[msgIndex]}"
                </motion.p>
              </AnimatePresence>
            </div>

            <div className="flex flex-col gap-2 pt-8 border-t border-[var(--theme-primary)]/20 relative">
              <p className="text-slate-300/80 text-xs md:text-sm font-medium uppercase tracking-[0.3em]">
                Com todo meu amor,
              </p>
              <p
                className="text-white text-3xl md:text-4xl mt-2"
                style={{ 
                  fontFamily: "'Dancing Script', cursive",
                  textShadow: '0 0 15px var(--theme-primary), 0 0 30px var(--theme-primary)' 
                }}
              >
                {partner1.name} 💕
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMsgIndex((i) => (i + 1) % LOVE_MESSAGES.length)}
              className="mt-2 inline-flex items-center justify-center gap-3 text-sm text-white font-bold uppercase tracking-wider px-8 py-4 rounded-full bg-[var(--theme-primary)]/10 hover:bg-[var(--theme-primary)]/25 border border-[var(--theme-primary)]/40 hover:border-[var(--theme-primary)]/80 hover:shadow-[0_0_35px_rgba(var(--theme-primary-rgb),0.5)] transition-colors duration-300"
              style={{ touchAction: 'manipulation' }}
            >
              <motion.div
                initial={false}
                animate={{ rotate: msgIndex * 180 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              >
                <RefreshCw className="w-5 h-5" />
              </motion.div>
              Nova mensagem
            </motion.button>
          </div>
        </div>
      </motion.section>

      {/* ══════════════════════════ NOSSA HISTÓRIA (TIMELINE) ══════════════════════════ */}
      {config.features.enableTimeline && (
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeUpVariant}
          className="py-24 px-4 text-center space-y-8 z-10 relative"
          id="section-historia"
        >
          <div className="max-w-3xl mx-auto space-y-4">
            <SectionLabel emoji="📖" text="Nossa História" />
            <h2
              className="text-4xl md:text-5xl font-serif font-bold text-white mt-4"
              style={{ textShadow: '0 0 20px var(--theme-primary)' }}
            >
              Cada Momento Importa
            </h2>
          </div>
          <div className="flex justify-center mt-12 drop-shadow-[0_0_40px_rgba(var(--theme-primary-rgb),0.5)] hover:drop-shadow-[0_0_60px_rgba(var(--theme-primary-rgb),0.8)] transition-all duration-500 scale-110">
            <button
              onClick={() => navigate('/timeline')}
              className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl border transition-all duration-300 hover:scale-105"
              style={{
                borderColor: 'rgba(var(--theme-primary-rgb, 157,78,221), 0.3)',
                backgroundColor: 'rgba(var(--theme-primary-rgb, 157,78,221), 0.05)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(var(--theme-primary-rgb, 157,78,221), 0.1)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(var(--theme-primary-rgb, 157,78,221), 0.5)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(var(--theme-primary-rgb, 157,78,221), 0.05)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(var(--theme-primary-rgb, 157,78,221), 0.3)';
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'rgba(var(--theme-primary-rgb, 157,78,221), 0.1)' }}
              >
                <Clock className="w-5 h-5" style={{ color: 'var(--theme-secondary, #e0aaff)' }} />
              </div>
              <div className="text-left">
                <p className="text-white font-bold text-base">Nossa História</p>
                <p className="text-slate-400 text-sm">Relembra nossos momentos juntos</p>
              </div>
              <div
                className="w-2 h-2 rounded-full animate-pulse ml-2"
                style={{ backgroundColor: 'var(--theme-primary, #9d4edd)' }}
              />
            </button>
          </div>
        </motion.section>
      )}

      {/* ══════════════════════════ DEVOCIONAL DO CASAL ══════════════════════════ */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={fadeUpVariant}
        className="py-24 px-4 text-center space-y-8 z-10 relative"
        id="section-devocional"
      >
        <div className="max-w-3xl mx-auto space-y-4">
          <SectionLabel emoji="✝️" text="Devocional do Casal" />
          <h2
            className="text-4xl md:text-5xl font-serif font-bold text-white mt-4"
            style={{ textShadow: '0 0 25px rgba(212,175,55,0.6)' }}
          >
            Conexão com Deus &amp; Entre Nós
          </h2>
          <p className="text-slate-300/80 text-sm md:text-base max-w-md mx-auto font-light leading-relaxed">
            Um versículo, meditação e desafio diário gerados sob medida para os sentimentos do nosso coração.
          </p>
        </div>

        <div className="flex justify-center mt-6">
          <button
            onClick={() => navigate('/devotional')}
            className="group relative inline-flex items-center gap-4 px-8 py-4 rounded-2xl border transition-all duration-300 hover:scale-105 shadow-[0_0_30px_rgba(212,175,55,0.2)] hover:shadow-[0_0_50px_rgba(212,175,55,0.4)] cursor-pointer"
            style={{
              borderColor: 'rgba(212, 175, 55, 0.4)',
              backgroundColor: 'rgba(212, 175, 55, 0.08)',
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ backgroundColor: 'rgba(212, 175, 55, 0.15)' }}
            >
              <BookOpen className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div className="text-left">
              <p className="text-white font-bold text-base">Abrir Devocional</p>
              <p className="text-[#D4AF37]/80 text-xs">A sós ou sincronizado com seu amor</p>
            </div>
            <div className="w-2 h-2 rounded-full animate-pulse ml-2 bg-[#D4AF37]" />
          </button>
        </div>
      </motion.section>

      {/* Bottom glow */}
      <div className="py-16" />
      <div className="h-2 w-full bg-[var(--theme-primary)] shadow-[0_0_50px_var(--theme-primary),0_0_100px_var(--theme-primary)]" />
    </div>
  );
}
