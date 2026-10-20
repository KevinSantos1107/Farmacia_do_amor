import { useState, useEffect, useMemo, useCallback, useRef, memo, useEffectEvent } from 'react';
import { Trophy, RotateCcw, Heart, Clock, Zap, Leaf, Star, Flame } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { shuffle } from '../../../shared/utils/shuffle';
import { cloudinaryUrl } from '../../../services/cloudinary/upload';
import { selectPhotosForGame } from './selectPhotosForGame';
import type { AlbumForGame } from './selectPhotosForGame';
import { saveMemoryRecordIfBetter } from '../../../services/gameRecords';
import type { MemoryDifficulty } from '../../../services/gameRecords';
import { usePlayerIdentityStore } from '../../../store/usePlayerIdentityStore';
import { useSiteConfigStore } from '../../../store/siteConfigStore';
import { getPlayerIds } from '../../auth/playerIds';
import { RankingModal } from '../ranking/RankingModal';

// ─── Difficulty Config ────────────────────────────────────────────────────────

export interface DifficultyConfig {
  id: MemoryDifficulty;
  label: string;
  iconName: 'leaf' | 'star' | 'flame';
  pairs: number;
  basePointsPerPair: number;
  timeMultipliers: [number, number][];
  description: string;
  gridClasses: string; // Tailwind grid cols and rows
}

export const DIFFICULTIES: DifficultyConfig[] = [
  {
    id: 'easy',
    label: 'Fácil',
    iconName: 'leaf',
    pairs: 6, // 12 cards → mobile: 4×3 | desktop: 6×2
    basePointsPerPair: 100,
    timeMultipliers: [[30, 2.0], [60, 1.6], [Infinity, 1.2]],
    description: '6 pares · pontuação acessível',
    gridClasses: 'grid-cols-4 grid-rows-3 lg:grid-cols-6 lg:grid-rows-2',
  },
  {
    id: 'medium',
    label: 'Médio',
    iconName: 'star',
    pairs: 8, // 16 cards → mobile: 4×4 | tablet: 8×2 | desktop: 8×2
    basePointsPerPair: 150,
    timeMultipliers: [[40, 2.0], [60, 1.6], [Infinity, 1.2]],
    description: '8 pares · pontuação intermediária',
    gridClasses: 'grid-cols-4 grid-rows-4 sm:grid-cols-8 sm:grid-rows-2',
  },
  {
    id: 'hard',
    label: 'Difícil',
    iconName: 'flame',
    pairs: 12, // 24 cards → mobile: 6×4 | desktop: 8×3
    basePointsPerPair: 200,
    timeMultipliers: [[45, 2.0], [60, 1.6], [Infinity, 1.2]],
    description: '12 pares · pontuação máxima',
    gridClasses: 'grid-cols-6 grid-rows-4 lg:grid-cols-8 lg:grid-rows-3',
  },
];

function DiffIcon({ name, className }: { name: string; className?: string }) {
  if (name === 'leaf') return <Leaf className={className} />;
  if (name === 'star') return <Star className={className} />;
  if (name === 'flame') return <Flame className={className} />;
  return null;
}

// ─── Score & Time Helpers ─────────────────────────────────────────────────────

function getComboMultiplier(combo: number): number {
  if (combo >= 4) return 2.0;
  if (combo === 3) return 1.5;
  if (combo === 2) return 1.2;
  return 1.0;
}

function getTimeMultiplier(elapsed: number, diff: DifficultyConfig): number {
  for (const [threshold, mult] of diff.timeMultipliers) {
    if (elapsed <= threshold) return mult;
  }
  return 1.0;
}

function calcPairScore(diff: DifficultyConfig, combo: number): number {
  return Math.round(diff.basePointsPerPair * getComboMultiplier(combo));
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Card {
  id: string;
  photoId: string;
  src: string;
  publicId?: string;
  state: 'hidden' | 'revealed' | 'matched';
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

  const seenPhotoIds = useRef<Set<string>>(new Set());

  const { particles, burst } = useParticles();
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const player = usePlayerIdentityStore((s) => s.player);
  const { config } = useSiteConfigStore();

  const getCardSrc = (card: Card) => {
    if (card.src) return card.src;
    if (card.publicId) {
      if (card.publicId.startsWith('http')) return card.publicId;
      return cloudinaryUrl(card.publicId, { q: 'auto', f: 'auto' });
    }
    return '';
  };

  const startGame = useCallback(async (diff: DifficultyConfig) => {
    const photos = selectPhotosForGame(albums, diff.pairs);
    if (photos.length === 0) return;

    // Reset all game state up front
    setScore(0); setMoves(0); setElapsed(0); setCombo(0); setMaxCombo(0);
    setIsLocked(true); setActiveDiff(diff);
    seenPhotoIds.current = new Set();
    setScorePopups([]); didSaveRef.current = false;

    // ── Build ordered preview deck (pairs together: A,A,B,B,C,C…) ──
    // User sees WHICH photos were chosen, in a clear ordered layout.
    // We only shuffle AFTER the preview — the real game deck is different.
    const orderedDeck: Card[] = [];
    photos.forEach((photo, idx) => {
      const photoId = `photo-${idx}`;
      orderedDeck.push(
        { id: `${photoId}-a`, photoId, src: photo.src, publicId: photo.publicId, state: 'revealed' },
        { id: `${photoId}-b`, photoId, src: photo.src, publicId: photo.publicId, state: 'revealed' },
      );
    });

    // ── Phase 0: pre-load ALL images before starting animation ──
    // Show a loading overlay on the game screen while images download.
    setCards(orderedDeck); // put cards in DOM early so preload can start
    setPhase('preview');
    setScreen('playing');
    setIsLoading(true);
    setLoadProgress(0);

    const srcs = photos.map((p) =>
      p.src ? p.src : p.publicId ? cloudinaryUrl(p.publicId, { q: 'auto', f: 'auto' }) : ''
    ).filter(Boolean);

    let loaded = 0;
    await Promise.all(
      srcs.map((src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = img.onerror = () => {
            loaded++;
            setLoadProgress(Math.round((loaded / srcs.length) * 100));
            resolve();
          };
          img.src = src;
        })
      )
    );

    // All images ready — remove loader and show preview
    setIsLoading(false);

    // ── Phase 1: show ordered pairs face-up for 2s ──
    // (deck already in state as 'revealed', ordered)

    // ── Phase 2: after 2s, flip all face-down ──
    setTimeout(() => {
      setCards((prev) => prev.map((c) => ({ ...c, state: 'hidden' })));
      setPhase('gather');

      // ── Phase 3: gather anim (CSS scale-out, 450ms) ──
      setTimeout(() => {
        // NOW shuffle the deck for the real game
        const shuffledDeck = shuffle(orderedDeck.map((c) => ({ ...c, state: 'hidden' as const })));
        setCards(shuffledDeck);
        setPhase('deal');

        // ── Phase 4: deal anim (~700ms) then unlock ──
        setTimeout(() => {
          setPhase('playing');
          setIsLocked(false);
        }, 700);
      }, 500);
    }, 2000);
  }, [albums]);

  useEffect(() => {
    if (screen !== 'playing' || phase !== 'playing') return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [screen, phase]);

  const revealed = useMemo(() => cards.filter((c) => c.state === 'revealed'), [cards]);

  const onGameWon = useEffectEvent(() => {
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
    if (screen !== 'playing' || phase !== 'playing') return;
    if (allMatched) {
      onGameWon();
    }
  }, [allMatched, screen, phase]);

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
        prev.map((c) => c.photoId === a.photoId ? { ...c, state: 'matched' } : c),
      );

      setTimeout(() => {
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

      setTimeout(() => {
        setCards((prev) =>
          prev.map((c) => c.state === 'revealed' ? { ...c, state: 'hidden' } : c),
        );
        setIsLocked(false);
      }, 1000);
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

  const handleCardClick = useCallback((card: Card) => {
    if (phase !== 'playing' || isLocked || card.state !== 'hidden' || revealed.length >= 2) return;
    seenPhotoIds.current.add(card.photoId);
    setCards((prev) =>
      prev.map((c) => c.id === card.id ? { ...c, state: 'revealed' } : c),
    );
    setMoves((m) => m + 1);
  }, [phase, isLocked, revealed.length]);

  // ─── Screens ────────────────────────────────────────────────────────────

  if (screen === 'difficulty') {
    return (
      <div className="flex flex-col items-center py-6 px-4 h-full w-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="w-full max-w-[340px] flex flex-col gap-6 sm:gap-8 my-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-2" style={{ background: 'linear-gradient(145deg, rgba(var(--theme-primary-rgb),0.2), rgba(0,0,0,0.4))', border: '1px solid rgba(var(--theme-primary-rgb),0.3)' }}>
              <Heart
                className="w-8 h-8"
                style={{ color: 'var(--theme-primary)', fill: 'var(--theme-primary)', filter: 'drop-shadow(0 0 12px var(--theme-primary))' }}
              />
              <div className="absolute inset-0 rounded-2xl animate-ping opacity-20" style={{ boxShadow: '0 0 20px var(--theme-primary)' }} />
            </div>
            <div>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight" style={{ textShadow: '0 4px 24px rgba(var(--theme-primary-rgb), 0.4)' }}>
                Memória
              </h2>
              <p className="text-white/40 text-sm mt-1">Selecione o nível de desafio</p>
            </div>
          </div>

          {/* Difficulty Cards */}
          <div className="flex flex-col gap-3.5">
            {DIFFICULTIES.map((diff) => (
              <button
                key={diff.id}
                onClick={() => startGame(diff)}
                className="group relative flex flex-col p-4 sm:p-5 rounded-[1.25rem] border transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] text-left overflow-hidden"
                style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.06)' }}
              >
                {/* Hover Glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 120%, rgba(var(--theme-primary-rgb),0.15) 0%, transparent 70%)' }} />
                
                <div className="relative flex items-center justify-between w-full">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 rounded-xl border border-white/5 shadow-inner" style={{ background: 'rgba(var(--theme-primary-rgb),0.15)', color: 'var(--theme-primary)' }}>
                      <DiffIcon name={diff.iconName} className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg sm:text-xl tracking-wide">{diff.label}</h3>
                      <p className="text-white/40 text-[10px] sm:text-xs uppercase tracking-widest mt-0.5">{diff.pairs} Pares</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-white/80 font-mono text-sm sm:text-base font-semibold">{diff.basePointsPerPair} pts</span>
                    <span className="text-white/30 text-[9px] sm:text-[10px] uppercase tracking-wider mt-0.5 whitespace-nowrap">Combo máx ×2</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Footer Action */}
          <button
            onClick={() => setShowRanking(true)}
            className="group flex items-center justify-center gap-2 text-sm text-white/40 hover:text-white/90 transition-all py-2"
          >
            <Trophy className="w-4 h-4 group-hover:scale-110 transition-transform" style={{ color: 'var(--theme-primary)', opacity: 0.8 }} />
            <span>Ver Ranking Global</span>
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
              <MiniStat icon="⚡" label="Jogadas" value={moves} />
              <MiniStat icon="🔥" label="Combo" value={`×${maxCombo}`} />
              <MiniStat icon="🕐" label="Tempo" value={formatTime(elapsed)} />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col w-full gap-3">
            <button
              onClick={() => startGame(activeDiff)}
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
                onClick={() => setScreen('difficulty')}
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

  return (
    <div className="flex flex-col h-full max-h-full w-full gap-1 p-1 sm:p-1.5 select-none relative" ref={containerRef}>
      
      {/* ── Ultra-compact HUD ────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-2 py-1 shrink-0 rounded-lg"
        style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)' }}
      >
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
          <span className="text-[10px] text-white/40 italic">
            {phase === 'preview' ? 'Memorize as fotos…' : phase === 'gather' ? '…' : 'Distribuindo…'}
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
          <button onClick={() => startGame(activeDiff)} className="p-1 rounded hover:bg-white/10 transition-colors" title="Reiniciar">
            <RotateCcw className="w-3 h-3 text-white/40 hover:text-white/80" />
          </button>
        </div>
      </div>

      {/* ── Card Grid with gather/deal animation ─────────────────────── */}
      <div className="flex-1 min-h-0 w-full relative">
        {/* Loading overlay — covers grid while images preload */}
        {isLoading && (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-lg"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
          >
            <div className="relative">
              <Heart
                className="w-12 h-12 animate-pulse"
                style={{ color: 'var(--theme-primary)', fill: 'var(--theme-primary)', filter: 'drop-shadow(0 0 16px var(--theme-primary))' }}
              />
            </div>
            <p className="text-white/60 text-xs">Carregando fotos…</p>
            {/* Progress bar */}
            <div className="w-32 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{ width: `${loadProgress}%`, background: 'var(--theme-primary)', boxShadow: '0 0 8px var(--theme-primary)' }}
              />
            </div>
            <p className="text-white/30 text-[10px] tabular-nums">{loadProgress}%</p>
          </div>
        )}

        <div
          className={cn('grid w-full h-full', activeDiff.gridClasses)}
          style={{
            gap: '3px',
            // gather phase: grid contracts to center
            transform: phase === 'gather' ? 'scale(0.05)' : 'scale(1)',
            opacity: isLoading ? 0 : phase === 'gather' ? 0 : 1,
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
              dealDelay={phase === 'deal' ? i * 28 : 0}
              isDeal={phase === 'deal'}
              registerRef={(el) => {
                if (el) cardRefs.current.set(card.id, el);
                else cardRefs.current.delete(card.id);
              }}
            />
          ))}
        </div>
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

const MiniStat = memo(function MiniStat({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-2">
      <span className="text-base">{icon}</span>
      <span className="text-white font-bold text-sm">{value}</span>
      <span className="text-white/30 text-[9px] uppercase tracking-wider">{label}</span>
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
}

const MemoryCard = memo(function MemoryCard({ card, imgSrc, onClick, registerRef, dealDelay = 0, isDeal = false }: MemoryCardProps) {
  const isFlipped = card.state !== 'hidden';
  const isMatched = card.state === 'matched';

  return (
    <div
      ref={registerRef}
      onClick={onClick}
      className={cn(
        'relative w-full h-full cursor-pointer transition-transform duration-150 active:scale-95',
        card.state === 'hidden' && 'hover:scale-105',
        isFlipped && 'cursor-default',
        // During deal phase: animate in from scale 0
        isDeal && 'animate-in zoom-in-50 fade-in'
      )}
      style={{
        perspective: '800px',
        userSelect: 'none',
        WebkitUserSelect: 'none' as React.CSSProperties['WebkitUserSelect'],
        animationDelay: isDeal ? `${dealDelay}ms` : undefined,
        animationDuration: isDeal ? '300ms' : undefined,
        animationFillMode: isDeal ? 'both' : undefined,
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
        {/* Back */}
        <div
          className="absolute inset-0 rounded-xl flex items-center justify-center border overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            background: 'var(--theme-card-bg)',
            borderColor: 'rgba(var(--theme-primary-rgb), 0.25)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <div className="relative">
            <Heart
              className="w-8 h-8 opacity-20"
              style={{
                color: 'var(--theme-primary)',
                fill: 'var(--theme-primary)',
              }}
            />
          </div>
        </div>

        {/* Front */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden border bg-black/40"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderColor: isMatched ? 'var(--theme-primary)' : 'rgba(var(--theme-primary-rgb), 0.4)',
            boxShadow: isMatched
              ? '0 0 16px rgba(var(--theme-primary-rgb), 0.6)'
              : '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          <img
            src={imgSrc}
            alt=""
            loading="eager"
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
