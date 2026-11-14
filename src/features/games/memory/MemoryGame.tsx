import { useState, useEffect, useMemo, useCallback, useRef, memo, useEffectEvent } from 'react';
import { Trophy, RotateCcw, Heart, Clock, Zap, Eye, Sparkles, Gem, Infinity as InfinityIcon, Crown, Layers } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { shuffle } from '../../../shared/utils/shuffle';
import { cloudinaryUrl } from '../../../services/cloudinary/upload';
import { normalizeCloudinaryUrl } from '../../album/photoUrl';
import { selectPhotosForGame } from './selectPhotosForGame';
import type { AlbumForGame } from './selectPhotosForGame';
import { saveMemoryRecordIfBetter } from '../../../services/gameRecords';
import { usePlayerIdentityStore } from '../../../store/usePlayerIdentityStore';
import { useSiteConfigStore } from '../../../store/siteConfigStore';
import { getPlayerIds } from '../../auth/playerIds';
import { RankingModal } from '../ranking/RankingModal';
import {
  DIFFICULTIES,
  getComboMultiplier,
  getTimeMultiplier,
  calcPairScore,
  formatTime,
  getDealAnimationTiming,
  canTriggerGameWin,
} from './memoryUtils';
import type { GridDimensions, DifficultyConfig } from './memoryUtils';

function DiffIcon({ name, className }: { name: string; className?: string }) {
  if (name === 'sparkles') return <Sparkles className={className} />;
  if (name === 'gem') return <Gem className={className} />;
  if (name === 'infinity') return <InfinityIcon className={className} />;
  if (name === 'crown') return <Crown className={className} />;
  return null;
}

interface MiniGridBoxProps {
  cols: number;
  rows: number;
  isSquare: boolean;
  deviceLabel: string;
  className?: string;
  accentRgb: string;
}

function MiniGridBox({ cols, rows, isSquare, deviceLabel, className = '' }: MiniGridBoxProps) {
  const total = cols * rows;
  // Cartas quadradas (1:1) vs retrato (~2:3)
  const dotWidth = isSquare ? 5.5 : 4.5;
  const dotHeight = isSquare ? 5.5 : 6.5;
  const gap = 2;
  const paddingX = 12;
  const totalWidth = cols * dotWidth + (cols - 1) * gap + paddingX;

  return (
    <div
      className={cn(
        'p-1.5 rounded-lg bg-black/50 border border-white/10 shrink-0 self-center transition-all duration-300 group-hover:border-white/25',
        className
      )}
      style={{
        width: `${Math.ceil(totalWidth)}px`,
      }}
      title={`${deviceLabel}: ${cols} colunas × ${rows} linhas (${total} cartas${isSquare ? ' quadradas' : ''})`}
    >
      <div
        className="grid justify-center items-center"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${dotWidth}px)`,
          gap: `${gap}px`,
        }}
      >
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="rounded-[1px] bg-white/25 group-hover:bg-white/70 transition-colors"
            style={{
              width: `${dotWidth}px`,
              height: `${dotHeight}px`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function MiniGridVisualizer({
  grids,
  isSquare = false,
  accentRgb,
}: {
  grids: {
    mobile: GridDimensions;
    tablet: GridDimensions;
    desktop: GridDimensions;
  };
  isSquare?: boolean;
  accentRgb: string;
}) {
  return (
    <>
      <MiniGridBox
        cols={grids.mobile.cols}
        rows={grids.mobile.rows}
        isSquare={isSquare}
        deviceLabel="Mobile"
        className="block sm:hidden"
        accentRgb={accentRgb}
      />
      <MiniGridBox
        cols={grids.tablet.cols}
        rows={grids.tablet.rows}
        isSquare={isSquare}
        deviceLabel="Tablet"
        className="hidden sm:block lg:hidden"
        accentRgb={accentRgb}
      />
      <MiniGridBox
        cols={grids.desktop.cols}
        rows={grids.desktop.rows}
        isSquare={isSquare}
        deviceLabel="Desktop"
        className="hidden lg:block"
        accentRgb={accentRgb}
      />
    </>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Card {
  id: string;
  photoId: string;
  src: string;
  publicId?: string;
  state: 'preview' | 'hidden' | 'revealed' | 'matched';
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  symbol: string;
}

interface ScorePopup {
  id: number;
  pts: number;
  combo: number;
  x: number;
  y: number;
}


// ─── Particle System Hook ────────────────────────────────────────────────────

function useParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const nextId = useRef(0);

  const burst = useCallback((x: number, y: number) => {
    const SYMBOLS = ['💕', '💗', '✨', '💫', '🌸'];
    const count = 8;
    const newP: Particle[] = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3;
      return {
        id: nextId.current++,
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1,
        symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      };
    });
    setParticles((prev) => [...prev, ...newP]);
  }, []);

  const hasParticles = particles.length > 0;
  useEffect(() => {
    if (!hasParticles) return;
    let rafId: number;
    const tick = () => {
      setParticles((prev) => {
        const updated = prev
          .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.18, life: p.life - 0.03 }))
          .filter((p) => p.life > 0);
        if (updated.length > 0) rafId = requestAnimationFrame(tick);
        return updated;
      });
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [hasParticles]);

  return { particles, burst };
}

// ─── Main Component ──────────────────────────────────────────────────────────

export interface MemoryGameProps {
  albums: AlbumForGame[];
  winMessage?: string;
}

export function MemoryGame({ albums, winMessage }: MemoryGameProps) {
  const [screen, setScreen] = useState<'difficulty' | 'playing' | 'won'>('difficulty');
  const [activeDiff, setActiveDiff] = useState<DifficultyConfig>(DIFFICULTIES[1]);

  // Intro animation: preview → gather → deal → playing
  type GamePhase = 'preview' | 'gather' | 'deal' | 'playing';
  const [phase, setPhase] = useState<GamePhase>('playing');
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  const [cards, setCards] = useState<Card[]>([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);
  const popupId = useRef(0);
  const [showRanking, setShowRanking] = useState(false);
  const didSaveRef = useRef(false);
  const [mismatchedIds, setMismatchedIds] = useState<string[]>([]);

  const seenPhotoIds = useRef<Set<string>>(new Set());

  // Concurrency & timeout control
  const sessionRef = useRef(0);
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const isStartingRef = useRef(false);

  const clearAllGameTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current.clear();
  }, []);

  const scheduleTimeout = useCallback((fn: () => void, delayMs: number) => {
    const currentSession = sessionRef.current;
    const timeoutId = setTimeout(() => {
      timeoutsRef.current.delete(timeoutId);
      if (sessionRef.current === currentSession) {
        fn();
      }
    }, delayMs);
    timeoutsRef.current.add(timeoutId);
    return timeoutId;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllGameTimeouts();
    };
  }, [clearAllGameTimeouts]);

  const { particles, burst } = useParticles();
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const player = usePlayerIdentityStore((s) => s.player);
  const { config } = useSiteConfigStore();

  const isGameActive = screen === 'playing' && phase === 'playing' && !isLoading;

  const getCardSrc = useCallback((cardOrPhoto: { src?: string; publicId?: string; url?: string }) => {
    if (cardOrPhoto.publicId && !cardOrPhoto.publicId.startsWith('http')) {
      return cloudinaryUrl(cardOrPhoto.publicId, { w: 350, h: 350, c: 'fill', q: 'auto', f: 'auto' });
    }
    const raw = cardOrPhoto.src || cardOrPhoto.url || cardOrPhoto.publicId || '';
    return normalizeCloudinaryUrl(raw);
  }, []);

  const startGame = useCallback(
    async (diff: DifficultyConfig) => {
      const photos = selectPhotosForGame(albums, diff.pairs);
      if (photos.length === 0) {
        isStartingRef.current = false;
        return;
      }

      // Previne início concorrente
      if (isStartingRef.current) return;
      isStartingRef.current = true;

      // Invalida sessões anteriores e cancela todos os timeouts ativos imediatamente
      clearAllGameTimeouts();
      const currentSession = ++sessionRef.current;

      // Reseta todo o estado do jogo
      setScore(0);
      setMoves(0);
      setElapsed(0);
      setCombo(0);
      setMaxCombo(0);
      setIsLocked(true);
      setActiveDiff(diff);
      seenPhotoIds.current.clear();
      cardRefs.current.clear();
      setScorePopups([]);
      setMismatchedIds([]);
      didSaveRef.current = false;

      // ── Build ordered preview deck (pares juntos: A,A,B,B,C,C…) ──
      // Importante: estado 'preview' mantém as fotos abertas para memorização sem contar como 'revealed'
      const orderedDeck: Card[] = [];
      photos.forEach((photo, idx) => {
        const photoId = `photo-${idx}`;
        orderedDeck.push(
          { id: `${photoId}-a`, photoId, src: photo.src, publicId: photo.publicId, state: 'preview' },
          { id: `${photoId}-b`, photoId, src: photo.src, publicId: photo.publicId, state: 'preview' },
        );
      });

      // ── Phase 0: Pré-carregamento 100% silencioso antes de exibir qualquer carta ──
      setCards([]);
      setPhase('preview');
      setScreen('playing');
      setIsLoading(true);
      setLoadProgress(0);

      const srcs = photos.map(getCardSrc).filter(Boolean);
      let loaded = 0;
      const total = srcs.length;

      await Promise.all(
        srcs.map(
          (src) =>
            new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = async () => {
                try {
                  if ('decode' in img) {
                    await img.decode();
                  }
                } catch {
                  // Se falhar o decode, onload já baixou o arquivo
                }
                loaded++;
                if (sessionRef.current === currentSession) {
                  setLoadProgress(Math.round((loaded / total) * 100));
                }
                resolve();
              };
              img.onerror = () => {
                loaded++;
                if (sessionRef.current === currentSession) {
                  setLoadProgress(Math.round((loaded / total) * 100));
                }
                resolve();
              };
              img.src = src;
            }),
        ),
      );

      // Se uma nova rodada foi iniciada enquanto baixava, aborta
      if (sessionRef.current !== currentSession) return;

      // Imagens baixadas e decodificadas na memória
      setCards(orderedDeck);
      setIsLoading(false);

      const { totalDealDuration } = getDealAnimationTiming(diff.pairs, orderedDeck.length);

      // ── Phase 1: Exibe os pares para memorização (1.5s para Extremo, 2.2s padrão) ──
      const previewDurationMs = diff.id === 'extreme' ? 1500 : 2200;
      scheduleTimeout(() => {
        // Vira suavemente as cartas para baixo
        setCards((prev) => prev.map((c) => ({ ...c, state: 'hidden' })));

        // ── Phase 2: Aguarda 320ms para o flip completar e inicia o recolhimento (gather, 420ms) ──
        scheduleTimeout(() => {
          setPhase('gather');

          scheduleTimeout(() => {
            // ── Phase 3: Embaralha e distribui com animação escalonada ──
            const shuffledDeck = shuffle(orderedDeck.map((c) => ({ ...c, state: 'hidden' as const })));
            setCards(shuffledDeck);
            setPhase('deal');

            // ── Phase 4: Aguarda todas as cartas terminarem a animação de distribuição ──
            scheduleTimeout(() => {
              setPhase('playing');
              setIsLocked(false);
              isStartingRef.current = false;
            }, totalDealDuration);
          }, 420);
        }, 320);
      }, previewDurationMs);
    },
    [albums, getCardSrc, clearAllGameTimeouts, scheduleTimeout],
  );

  const handleRestart = useCallback(() => {
    if (!isGameActive) return;
    void startGame(activeDiff);
  }, [isGameActive, startGame, activeDiff]);

  const goToDifficulty = useCallback(() => {
    clearAllGameTimeouts();
    sessionRef.current++;
    isStartingRef.current = false;
    setCards([]);
    setMismatchedIds([]);
    setPhase('preview');
    setIsLoading(false);
    setIsLocked(false);
    setScreen('difficulty');
  }, [clearAllGameTimeouts]);

  useEffect(() => {
    if (screen !== 'playing' || phase !== 'playing') return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [screen, phase]);

  const revealed = useMemo(() => cards.filter((c) => c.state === 'revealed'), [cards]);

  const onGameWon = useEffectEvent(() => {
    // Validação de segurança: nunca disparar vitória sem jogadas suficientes ou fora da fase 'playing'
    if (!canTriggerGameWin(moves, activeDiff.pairs, phase)) {
      console.warn('[MemoryGame] Tentativa de vitória ignorada por validação de segurança:', {
        moves,
        pairs: activeDiff.pairs,
        phase,
      });
      return;
    }

    const timeMult = getTimeMultiplier(elapsed, activeDiff);
    const final = Math.round(score * timeMult);
    setFinalScore(final);
    setScreen('won');

    const { p1Id, p2Id } = getPlayerIds(config);
    if (!didSaveRef.current && (player === p1Id || player === p2Id || player === 'kevin' || player === 'iara')) {
      didSaveRef.current = true;
      void saveMemoryRecordIfBetter(player, final, elapsed, activeDiff.id, maxCombo);
    }
  });

  const allMatched = cards.length > 0 && cards.every((c) => c.state === 'matched');

  useEffect(() => {
    if (screen !== 'playing' || phase !== 'playing' || isLoading) return;
    if (allMatched) {
      onGameWon();
    }
  }, [allMatched, screen, phase, isLoading]);

  const onPairRevealed = useEffectEvent((a: Card, b: Card) => {
    setIsLocked(true);

    if (a.photoId === b.photoId) {
      const newCombo = combo + 1;
      const newMax = Math.max(newCombo, maxCombo);
      const pts = calcPairScore(activeDiff, newCombo);

      setCombo(newCombo);
      setMaxCombo(newMax);
      setScore((s) => s + pts);
      setCards((prev) =>
        prev.map((c) => (c.photoId === a.photoId ? { ...c, state: 'matched' } : c)),
      );

      scheduleTimeout(() => {
        [a.id, b.id].slice(0, 1).forEach((id) => {
          const el = cardRefs.current.get(id);
          const container = containerRef.current;
          if (el && container) {
            const rect = el.getBoundingClientRect();
            const cRect = container.getBoundingClientRect();
            const x = rect.left - cRect.left + rect.width / 2;
            const y = rect.top - cRect.top;
            burst(x, rect.top - cRect.top + rect.height / 2);
            setScorePopups((prev) => [...prev, { id: popupId.current++, pts, combo: newCombo, x, y }]);
          }
        });
        setIsLocked(false);
      }, 150);
    } else {
      const aWasSeen = seenPhotoIds.current.has(a.photoId);
      const bWasSeen = seenPhotoIds.current.has(b.photoId);
      const shouldPenalize = aWasSeen && bWasSeen;

      if (shouldPenalize) {
        setScore((s) => Math.max(0, s - 5));
      }
      setCombo(0);

      // Efeito de sacudida (shake) e destaque sutil nos dois cartões incorretos
      setMismatchedIds([a.id, b.id]);

      scheduleTimeout(() => {
        setMismatchedIds([]);
        setCards((prev) =>
          prev.map((c) => (c.state === 'revealed' ? { ...c, state: 'hidden' } : c)),
        );
        setIsLocked(false);
      }, 950);
    }
  });

  useEffect(() => {
    // Only process matches during actual gameplay — never during preview/gather/deal
    if (phase !== 'playing' || revealed.length < 2) return;
    onPairRevealed(revealed[0], revealed[1]);
  }, [revealed, phase]);

  useEffect(() => {
    if (scorePopups.length === 0) return;
    const id = setTimeout(() => setScorePopups((prev) => prev.slice(1)), 1200);
    return () => clearTimeout(id);
  }, [scorePopups.length]);

  const handleCardClick = useCallback(
    (card: Card) => {
      if (phase !== 'playing' || isLocked || card.state !== 'hidden' || revealed.length >= 2) return;
      seenPhotoIds.current.add(card.photoId);
      setCards((prev) =>
        prev.map((c) => (c.id === card.id ? { ...c, state: 'revealed' } : c)),
      );
      setMoves((m) => m + 1);
    },
    [phase, isLocked, revealed.length],
  );

  // ─── Screens ────────────────────────────────────────────────────────────

  if (screen === 'difficulty') {
    return (
      <div className="flex flex-col items-center justify-between py-6 px-3 sm:px-6 h-full w-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] relative">
        {/* Glow ambient background orbs */}
        <div
          className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[360px] rounded-full blur-[130px] pointer-events-none opacity-25 -z-10"
          style={{ background: 'radial-gradient(circle, var(--theme-primary) 0%, transparent 70%)' }}
        />

        <div className="w-full max-w-[420px] md:max-w-2xl lg:max-w-3xl flex flex-col items-center gap-6 sm:gap-8 my-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Header Romântico & Elegante */}
          <div className="text-center space-y-3 flex flex-col items-center">
            <div className="relative group">
              <div
                className="absolute -inset-1 rounded-3xl blur-lg opacity-40 group-hover:opacity-75 transition duration-500 pointer-events-none"
                style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))' }}
              />
              <div
                className="relative inline-flex items-center justify-center w-16 h-16 sm:w-18 sm:h-18 rounded-2xl border backdrop-blur-xl transition-transform duration-300 group-hover:scale-105 shadow-xl"
                style={{
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(15,15,25,0.7) 100%)',
                  borderColor: 'rgba(var(--theme-primary-rgb), 0.35)',
                }}
              >
                <Layers
                  className="w-8 h-8 sm:w-9 sm:h-9"
                  style={{
                    color: 'var(--theme-primary)',
                    filter: 'drop-shadow(0 0 10px var(--theme-primary))',
                  }}
                />
              </div>
            </div>

            <div>
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white tracking-tight"
                style={{ textShadow: '0 4px 24px rgba(var(--theme-primary-rgb), 0.35)' }}
              >
                Jogo da Memória
              </h2>
              <p className="text-white/60 text-xs sm:text-sm font-light tracking-wide mt-1.5 max-w-sm mx-auto">
                Encontre as fotos dos nossos momentos e teste sua conexão 💕
              </p>
            </div>
          </div>

          {/* Bento Grid: 1 col on mobile, 2x2 on tablet/desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
            {DIFFICULTIES.map((diff) => (
              <button
                key={diff.id}
                onClick={() => {
                  if (isStartingRef.current) return;
                  void startGame(diff);
                }}
                className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl border transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] text-left overflow-hidden cursor-pointer backdrop-blur-xl shadow-lg"
                style={{
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(10,10,18,0.75) 100%)',
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              >
                {/* Dynamic hover gradient aura specific to this level */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 50% 0%, rgba(${diff.accentRgb}, 0.22) 0%, transparent 75%)`,
                  }}
                />

                {/* Border glow on hover */}
                <div
                  className="absolute inset-0 rounded-2xl border transition-all duration-300 pointer-events-none opacity-0 group-hover:opacity-100"
                  style={{
                    borderColor: `rgba(${diff.accentRgb}, 0.45)`,
                    boxShadow: `inset 0 0 15px rgba(${diff.accentRgb}, 0.1)`,
                  }}
                />

                {/* Top Row: Icon + Title & Badge + MiniGrid */}
                <div className="relative flex items-center justify-between w-full gap-3">
                  <div className="flex items-center gap-3.5">
                    {/* Icon container */}
                    <div
                      className="p-3 rounded-xl border shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-inner"
                      style={{
                        background: `linear-gradient(135deg, rgba(${diff.accentRgb}, 0.18) 0%, rgba(0,0,0,0.4) 100%)`,
                        borderColor: `rgba(${diff.accentRgb}, 0.35)`,
                        color: diff.accentColor,
                        boxShadow: `0 0 16px rgba(${diff.accentRgb}, 0.25)`,
                      }}
                    >
                      <DiffIcon name={diff.iconName} className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>

                    {/* Title + Badge */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-bold text-base sm:text-lg tracking-wide group-hover:text-white transition-colors">
                          {diff.label}
                        </h3>
                        <span
                          className="px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wider uppercase border"
                          style={{
                            background: `rgba(${diff.accentRgb}, 0.12)`,
                            borderColor: `rgba(${diff.accentRgb}, 0.3)`,
                            color: diff.accentColor,
                          }}
                        >
                          {diff.badge}
                        </span>
                      </div>
                      <p className="text-white/40 text-[11px] sm:text-xs mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{diff.pairs} Pares ({diff.pairs * 2} cartas)</span>
                        <span className="text-white/20">·</span>
                        {/* Mobile grid label */}
                        <span className="text-white/60 font-mono text-[10px] sm:hidden">
                          {diff.grids.mobile.cols}×{diff.grids.mobile.rows}
                        </span>
                        {/* Tablet grid label */}
                        <span className="text-white/60 font-mono text-[10px] hidden sm:inline lg:hidden">
                          {diff.grids.tablet.cols}×{diff.grids.tablet.rows}
                        </span>
                        {/* Desktop grid label */}
                        <span className="text-white/60 font-mono text-[10px] hidden lg:inline">
                          {diff.grids.desktop.cols}×{diff.grids.desktop.rows}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Micro-Grid Visualizer adaptativo por dispositivo */}
                  <MiniGridVisualizer
                    grids={diff.grids}
                    isSquare={diff.cardAspect === 'square'}
                    accentRgb={diff.accentRgb}
                  />
                </div>

                {/* Bottom Row: Score + Multiplier Chips */}
                <div className="relative flex items-center justify-between pt-3 mt-3 border-t border-white/5">
                  <div className="flex items-center gap-1.5 text-white/50 text-xs">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-mono font-semibold text-white/90 text-xs sm:text-sm">
                      {diff.basePointsPerPair} pts
                    </span>
                    <span className="text-[10px] text-white/30">/ par</span>
                  </div>

                  <div
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-mono font-medium border"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderColor: 'rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.7)',
                    }}
                  >
                    <span>Combo até ×2</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Footer Action: Floating Couple Ranking Pill */}
          <button
            onClick={() => setShowRanking(true)}
            className="group relative flex items-center gap-3 px-5 py-2.5 rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] shadow-lg cursor-pointer"
            style={{
              borderColor: 'rgba(var(--theme-primary-rgb), 0.25)',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
            }}
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400">
              <Trophy className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform duration-300" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-white/90 text-xs sm:text-sm font-semibold tracking-wide">
                Ranking do Casal
              </span>
              <span className="text-white/40 text-[10px] font-mono">
                Kevin vs Iara · Ver placar geral
              </span>
            </div>
          </button>
        </div>

        <RankingModal isOpen={showRanking} onClose={() => setShowRanking(false)} initialGame="memory" />
      </div>
    );
  }

  if (screen === 'won') {
    const timeBonus = finalScore - score;
    return (
      <div className="flex flex-col items-center py-6 px-4 h-full w-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="w-full max-w-[340px] flex flex-col items-center gap-6 sm:gap-8 my-auto animate-in fade-in zoom-in-95 duration-700">
          
          {/* Header */}
          <div className="text-center space-y-4">
            <div
              className="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center border-2 shadow-2xl relative"
              style={{
                borderColor: 'var(--theme-primary)',
                background: 'linear-gradient(135deg, rgba(var(--theme-primary-rgb), 0.2), rgba(0,0,0,0.5))',
                boxShadow: '0 0 40px rgba(var(--theme-primary-rgb), 0.4)',
              }}
            >
              <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: 'var(--theme-primary)' }} />
              <Trophy
                className="w-10 h-10 sm:w-12 sm:h-12 animate-in slide-in-from-bottom-4"
                style={{ color: 'var(--theme-primary)', filter: 'drop-shadow(0 0 12px var(--theme-primary))' }}
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-white/40 flex items-center justify-center gap-1.5">
                <DiffIcon name={activeDiff.iconName} className="w-3.5 h-3.5" /> Nível {activeDiff.label}
              </p>
              <h2
                className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight"
                style={{ textShadow: '0 4px 20px rgba(var(--theme-primary-rgb), 0.5)' }}
              >
                Você Ganhou! 🎉
              </h2>
              <p className="text-white/60 text-xs sm:text-sm italic font-light px-4">
                "{winMessage ?? 'Você lembra de cada momento nosso! 💕'}"
              </p>
            </div>
          </div>

          {/* Score Card */}
          <div
            className="w-full relative rounded-[1.5rem] border backdrop-blur-xl overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.4) 100%)',
              borderColor: 'rgba(var(--theme-primary-rgb), 0.25)',
              boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)'
            }}
          >
            {/* Top Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-24 opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, var(--theme-primary) 0%, transparent 70%)' }} />

            <div className="px-5 py-5 space-y-3 relative">
              <ScoreRow label="Pontuação base" value={score} />
              <ScoreRow
                label={`Bônus de tempo (${formatTime(elapsed)})`}
                value={timeBonus > 0 ? `+${timeBonus}` : ''}
                accent
              />
              
              <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(var(--theme-primary-rgb), 0.3), transparent)' }} />
              
              <div className="flex justify-between items-end pt-1">
                <span className="text-white/50 text-xs uppercase tracking-widest mb-1">Total Final</span>
                <span
                  className="text-4xl font-bold font-serif"
                  style={{ color: 'var(--theme-primary)', textShadow: '0 0 20px rgba(var(--theme-primary-rgb), 0.5)' }}
                >
                  {finalScore}
                </span>
              </div>
            </div>

            <div
              className="grid grid-cols-3 divide-x divide-white/5 text-center py-3 bg-black/20"
              style={{
                borderTop: '1px solid rgba(var(--theme-primary-rgb), 0.1)',
              }}
            >
              <MiniStat icon={<Zap className="w-4 h-4 text-amber-400" />} label="Jogadas" value={moves} />
              <MiniStat icon={<Sparkles className="w-4 h-4 text-pink-400" />} label="Maior Combo" value={`×${maxCombo}`} />
              <MiniStat icon={<Clock className="w-4 h-4 text-cyan-400" />} label="Tempo Final" value={formatTime(elapsed)} />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col w-full gap-3">
            <button
              onClick={() => {
                if (isStartingRef.current) return;
                void startGame(activeDiff);
              }}
              className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all active:scale-[0.98] hover:scale-[1.02] shadow-lg"
              style={{
                background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary, var(--theme-primary)))',
                color: '#fff',
                boxShadow: '0 8px 25px -5px rgba(var(--theme-primary-rgb), 0.5)',
              }}
            >
              Jogar Novamente
            </button>
            <div className="flex gap-2">
              <button
                onClick={goToDifficulty}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-all active:scale-[0.98]"
              >
                Trocar Nível
              </button>
              <button
                onClick={() => setShowRanking(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-all active:scale-[0.98]"
              >
                <Trophy className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
                Ranking
              </button>
            </div>
          </div>

        </div>

        <RankingModal isOpen={showRanking} onClose={() => setShowRanking(false)} initialGame="memory" />
      </div>
    );
  }

  const { staggerMs, animDurationMs } = getDealAnimationTiming(activeDiff.pairs, cards.length);

  return (
    <div className="flex flex-col h-full max-h-full w-full gap-1 p-1 sm:p-1.5 select-none relative" ref={containerRef}>
      
      {/* ── Ultra-compact HUD ────────────────────────────────────────── */}
      <div
        className="flex flex-col shrink-0 rounded-lg overflow-hidden relative"
        style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)' }}
      >
        <div className="flex items-center justify-between px-2 py-1 w-full">
          {/* Score + combo */}
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3" style={{ color: 'var(--theme-primary)' }} />
            <span className="font-bold text-xs text-white leading-none tabular-nums">{score}</span>
            {combo >= 2 && (
              <span
                className="rounded-full px-1.5 py-px text-[9px] font-bold leading-none"
                style={{ background: 'rgba(var(--theme-primary-rgb),0.25)', color: 'var(--theme-primary)' }}
              >
                ×{getComboMultiplier(combo).toFixed(1)}
              </span>
            )}
          </div>

          {/* Phase label during animation */}
          {phase !== 'playing' && (
            <span className="text-[10px] text-white/50 italic flex items-center gap-1">
              {phase === 'preview' ? (
                <>
                  <Eye className="w-3 h-3 text-[var(--theme-primary)] animate-pulse" />
                  <span>Memorize as fotos…</span>
                </>
              ) : phase === 'gather' ? (
                'Embaralhando…'
              ) : (
                'Distribuindo…'
              )}
            </span>
          )}

          {/* Time + controls */}
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-white/50" />
            <span className="font-mono text-xs text-white/70 leading-none tabular-nums">{formatTime(elapsed)}</span>
            <div className="w-px h-3 mx-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <button onClick={() => setShowRanking(true)} className="p-1 rounded hover:bg-white/10 transition-colors" title="Ranking">
              <Trophy className="w-3 h-3 text-white/40 hover:text-white/80" />
            </button>
            <button
              onClick={handleRestart}
              disabled={!isGameActive}
              className={cn(
                'p-1 rounded transition-all',
                isGameActive
                  ? 'hover:bg-white/10 text-white/40 hover:text-white/80 cursor-pointer'
                  : 'opacity-25 cursor-not-allowed text-white/20 hover:bg-transparent',
              )}
              title={isGameActive ? 'Reiniciar partida' : 'Aguarde o início da partida...'}
              aria-label={isGameActive ? 'Reiniciar partida' : 'Aguarde o início da partida'}
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Barra de contagem regressiva suave durante a fase de memorização */}
        {phase === 'preview' && !isLoading && (
          <div className="w-full h-[2.5px] bg-white/10 overflow-hidden relative">
            <div
              className="h-full animate-preview-drain"
              style={{
                animationDuration: `${activeDiff.id === 'extreme' ? 1500 : 2200}ms`,
                background: 'linear-gradient(90deg, var(--theme-secondary, var(--theme-primary)), var(--theme-primary))',
                boxShadow: '0 0 10px var(--theme-primary)',
              }}
            />
          </div>
        )}
      </div>

      {/* ── Card Grid with gather/deal animation ─────────────────────── */}
      <div className="flex-1 min-h-0 w-full relative">
        {/* Loading overlay — exibido de forma limpa enquanto as fotos são 100% carregadas e decodificadas */}
        {isLoading ? (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-xl animate-in fade-in duration-300"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' }}
          >
            <div className="relative">
              <Heart
                className="w-14 h-14 animate-pulse"
                style={{ color: 'var(--theme-primary)', fill: 'var(--theme-primary)', filter: 'drop-shadow(0 0 20px var(--theme-primary))' }}
              />
            </div>
            <p className="text-white/80 text-sm font-medium">Carregando fotos dos nossos momentos…</p>
            {/* Progress bar */}
            <div className="w-48 h-2 rounded-full overflow-hidden bg-white/10 shadow-inner">
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{ width: `${loadProgress}%`, background: 'var(--theme-primary)', boxShadow: '0 0 10px var(--theme-primary)' }}
              />
            </div>
            <p className="text-white/50 text-xs tabular-nums font-mono">{loadProgress}%</p>
          </div>
        ) : (
          <div
            className={cn('grid w-full h-full animate-in fade-in duration-300', activeDiff.gridClasses)}
            style={{
              gap: '3px',
              // gather phase: grid contracts to center
              transform: phase === 'gather' ? 'scale(0.05)' : 'scale(1)',
              opacity: phase === 'gather' ? 0 : 1,
              transition: phase === 'gather'
                ? 'transform 0.45s cubic-bezier(0.4, 0, 0.6, 1), opacity 0.35s ease'
                : 'opacity 0.3s ease',
            }}
          >
            {cards.map((card, i) => (
              <MemoryCard
                key={card.id}
                card={card}
                imgSrc={getCardSrc(card)}
                onClick={() => handleCardClick(card)}
                dealDelay={phase === 'deal' ? i * staggerMs : 0}
                isDeal={phase === 'deal'}
                animDurationMs={animDurationMs}
                isPlayable={phase === 'playing' && !isLocked}
                isMismatched={mismatchedIds.includes(card.id)}
                cardAspect={activeDiff.cardAspect}
                registerRef={(el) => {
                  if (el) cardRefs.current.set(card.id, el);
                  else cardRefs.current.delete(card.id);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Particle Layer ────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute text-2xl leading-none"
            style={{ left: p.x, top: p.y, opacity: p.life, transform: `scale(${p.life})`, userSelect: 'none' }}
          >
            {p.symbol}
          </span>
        ))}
        {scorePopups.map((popup) => (
          <div
            key={popup.id}
            className="absolute pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200"
            style={{ left: popup.x, top: popup.y - 20, transform: 'translateX(-50%)' }}
          >
            <span className="font-bold text-lg whitespace-nowrap" style={{ color: 'var(--theme-primary)', textShadow: '0 0 8px var(--theme-primary)' }}>
              +{popup.pts}
              {popup.combo >= 2 && <span className="ml-1 opacity-70 text-sm">⚡×{getComboMultiplier(popup.combo).toFixed(1)}</span>}
            </span>
          </div>
        ))}
      </div>

      <RankingModal isOpen={showRanking} onClose={() => setShowRanking(false)} initialGame="memory" />
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

const ScoreRow = memo(function ScoreRow({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between items-center">
      <span className="text-white/50">{label}</span>
      <span className={accent ? 'font-semibold' : 'text-white/70'} style={accent ? { color: 'var(--theme-secondary)' } : {}}>
        {value}
      </span>
    </div>
  );
});

const MiniStat = memo(function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2">
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/5 border border-white/10 text-white/80">
        {icon}
      </div>
      <span className="text-white font-bold text-sm leading-tight">{value}</span>
      <span className="text-white/40 text-[9px] uppercase tracking-wider">{label}</span>
    </div>
  );
});

interface MemoryCardProps {
  card: Card;
  imgSrc: string;
  onClick: () => void;
  registerRef: (el: HTMLDivElement | null) => void;
  dealDelay?: number; // ms — staggered entry during deal phase
  isDeal?: boolean;
  animDurationMs?: number;
  isPlayable?: boolean;
  isMismatched?: boolean; // true durante a animação de erro (par errado)
  cardAspect?: 'square' | 'portrait';
}

const MemoryCard = memo(function MemoryCard({
  card,
  imgSrc,
  onClick,
  registerRef,
  dealDelay = 0,
  isDeal = false,
  animDurationMs = 280,
  isPlayable = false,
  isMismatched = false,
  cardAspect,
}: MemoryCardProps) {
  const isFlipped = card.state !== 'hidden';
  const isMatched = card.state === 'matched';
  const isSquare = cardAspect === 'square';

  return (
    <div
      ref={registerRef}
      onClick={onClick}
      className={cn(
        'group relative w-full h-full select-none',
        isSquare && 'aspect-square max-h-full max-w-full m-auto',
        card.state === 'hidden' && isPlayable && 'cursor-pointer hover:scale-[1.03] active:scale-95 transition-transform duration-150',
        card.state === 'hidden' && !isPlayable && 'cursor-default',
        isFlipped && 'cursor-default',
        // During deal phase: animate in from scale 0
        isDeal && 'animate-in zoom-in-50 fade-in',
        // Feedback ao errar o par: sacudida suave
        isMismatched && 'animate-memory-shake',
      )}
      style={{
        perspective: '800px',
        userSelect: 'none',
        WebkitUserSelect: 'none' as React.CSSProperties['WebkitUserSelect'],
        animationDelay: isDeal ? `${dealDelay}ms` : undefined,
        animationDuration: isDeal ? `${animDurationMs}ms` : undefined,
        animationFillMode: isDeal ? 'both' : undefined,
        ...(isSquare ? { aspectRatio: '1 / 1' } : {}),
      }}
    >
      <div
        className="relative w-full h-full"
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.4s cubic-bezier(0.4, 0.2, 0.2, 1)',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Back (Verso estilizado da carta — aspecto colecionável com micro-gradiente e brilho) */}
        <div
          className="absolute inset-0 rounded-xl flex items-center justify-center border overflow-hidden transition-all duration-300"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            background: 'linear-gradient(145deg, rgba(var(--theme-primary-rgb), 0.16) 0%, var(--theme-card-bg) 55%, rgba(0,0,0,0.65) 100%)',
            borderColor: 'rgba(var(--theme-primary-rgb), 0.3)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          {/* Moldura interna decorativa fina */}
          <div
            className="absolute inset-1.5 rounded-lg border pointer-events-none transition-colors duration-300"
            style={{
              borderColor: 'rgba(var(--theme-primary-rgb), 0.18)',
              background: 'radial-gradient(circle at 50% 50%, rgba(var(--theme-primary-rgb), 0.08) 0%, transparent 80%)',
            }}
          />

          {/* Shimmer luminoso que desliza no hover quando jogável */}
          {isPlayable && (
            <div
              className="absolute -inset-[100%] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)',
                animation: 'memory-shimmer 1.3s ease-in-out infinite',
              }}
            />
          )}

          {/* Coração central com micro-brilho difuso */}
          <div className="relative flex items-center justify-center pointer-events-none">
            <div
              className="absolute w-8 h-8 rounded-full blur-md opacity-25 group-hover:opacity-50 transition-all duration-300 pointer-events-none"
              style={{ background: 'var(--theme-primary)' }}
            />
            <Heart
              className="w-7 h-7 transition-all duration-300 opacity-25 group-hover:opacity-65 group-hover:scale-110"
              style={{
                color: 'var(--theme-primary)',
                fill: 'var(--theme-primary)',
              }}
            />
          </div>
        </div>

        {/* Front (Frente da foto com feedback de match e mismatch) */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden border bg-black/40 transition-all duration-200"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderColor: isMatched
              ? 'var(--theme-primary)'
              : isMismatched
                ? 'rgba(244, 63, 94, 0.9)'
                : 'rgba(var(--theme-primary-rgb), 0.4)',
            boxShadow: isMatched
              ? '0 0 16px rgba(var(--theme-primary-rgb), 0.6)'
              : isMismatched
                ? '0 0 18px rgba(244, 63, 94, 0.5)'
                : '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          <img
            src={imgSrc}
            alt=""
            loading="eager"
            decoding="async"
            draggable={false}
            className="w-full h-full object-cover"
          />
          {isMatched && (
            <div className="absolute inset-0 bg-black/10" />
          )}
        </div>
      </div>
    </div>
  );
});
