import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Trophy, Crown, Heart, Worm, Gamepad2, MessageCircleHeart, Layers } from 'lucide-react';
import {
  getRanking,
  getWordRanking,
  getQuizRanking,
  getMemoryRanking,
} from '../../../services/gameRecords';
import type { WordRecord, QuizRecord, MemoryRecord } from '../../../services/gameRecords';
import { useSiteConfigStore } from '../../../store/siteConfigStore';
import { lockBodyScroll } from '../../../shared/utils/scrollLock';

export type RankingGame = 'snake' | 'word' | 'quiz' | 'memory';

function renderAvatar(avatarStr: string) {
  if (avatarStr.includes('.')) {
    return <img src={avatarStr} alt="avatar" className="w-full h-full object-cover rounded-full" />;
  }
  return avatarStr;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialGame?: RankingGame;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function PlayerColumn({
  name,
  avatar,
  isWinner,
  children,
}: {
  name: string;
  avatar: React.ReactNode;
  isWinner: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex-1 basis-0 min-w-0 overflow-hidden rounded-2xl p-3 sm:p-4 flex flex-col items-center gap-2 sm:gap-3 transition-all ${
        isWinner
          ? 'bg-white/10 border border-yellow-400/40 shadow-[0_0_20px_rgba(250,204,21,0.15)]'
          : 'bg-white/5 border border-white/10'
      }`}
    >
      <div className="relative">
        {avatar}
        {isWinner && (
          <Crown
            className="absolute -top-3 -right-3 w-4 h-4 sm:w-5 sm:h-5 text-yellow-400"
            fill="currentColor"
          />
        )}
      </div>
      <span className="w-full min-w-0 truncate text-center text-xs sm:text-sm font-semibold text-white/80 tracking-wide">{name}</span>
      {children}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="w-full text-center">
      <div className="text-white/40 text-[9px] sm:text-[10px] uppercase tracking-widest leading-tight mb-0.5 break-words">{label}</div>
      <div className="max-w-full truncate text-xl sm:text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 my-1 w-full">
      <div className="flex-1 h-px bg-white/10" />
      <span className="text-white/30 text-[9px] sm:text-[10px] uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
}

function LoadingRow() {
  return (
    <div className="flex min-w-0 gap-2 sm:gap-3">
      {[0, 1].map(i => (
        <div key={i} className="flex-1 h-24 sm:h-28 rounded-2xl bg-white/5 animate-pulse" />
      ))}
    </div>
  );
}

const MEMORY_LEVELS: { key: 'easy' | 'medium' | 'hard'; label: string; timeLabel: string }[] = [
  { key: 'easy',   label: 'Fácil',   timeLabel: 'Tempo fácil' },
  { key: 'medium', label: 'Médio',   timeLabel: 'Tempo médio' },
  { key: 'hard',   label: 'Difícil', timeLabel: 'Tempo difícil' },
];

function formatMemoryTime(s: number | undefined) {
  if (!s || s === 99999) return '--:--';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/** Pontuação, tempo e rótulo vêm sempre do nível em que a melhor pontuação foi feita. */
function resolveBestMemoryRun(record: MemoryRecord | null) {
  if (!record) {
    return { score: 0, time: undefined as number | undefined, timeLabel: 'Tempo', levelLabel: '' };
  }

  const levels = MEMORY_LEVELS
    .map((l) => ({ ...l, data: record[l.key] }))
    .filter((l) => (l.data?.score ?? 0) > 0);

  if (levels.length === 0) {
    const fallback = MEMORY_LEVELS.find((l) => l.key === record.bestScoreLevel);
    return {
      score: record.score ?? 0,
      time: record.bestTime,
      timeLabel: fallback?.timeLabel ?? 'Tempo',
      levelLabel: fallback?.label ?? '',
    };
  }

  let best = levels[0];
  for (const level of levels) {
    const score = level.data!.score;
    const time = level.data!.bestTime ?? 99999;
    const bestScore = best.data!.score;
    const bestTime = best.data!.bestTime ?? 99999;
    if (score > bestScore || (score === bestScore && time < bestTime)) {
      best = level;
    }
  }

  const pinned = MEMORY_LEVELS.find((l) => l.key === record.bestScoreLevel);
  if (pinned && (record.score ?? 0) >= (best.data?.score ?? 0) && (record.score ?? 0) > 0) {
    const pinnedData = record[pinned.key];
    return {
      score: record.score,
      time: pinnedData?.bestTime ?? record.bestTime,
      timeLabel: pinned.timeLabel,
      levelLabel: pinned.label,
    };
  }

  return {
    score: best.data!.score,
    time: best.data!.bestTime,
    timeLabel: best.timeLabel,
    levelLabel: best.label,
  };
}

// ── Tab Content ───────────────────────────────────────────────────────────────

function SnakeTab() {
  const [data, setData] = useState<{ p1: number | null; p2: number | null } | null>(null);
  const { config } = useSiteConfigStore();
  const partner1Name = config?.couple?.partner1?.name || 'Kevin';
  const partner2Name = config?.couple?.partner2?.name || 'Iara';

  const partner1Avatar = config?.couple?.partner1?.avatar || '👦';
  const partner2Avatar = config?.couple?.partner2?.avatar || '👩';

  useEffect(() => {
    getRanking('snake').then(setData);
  }, []);

  if (!data) return <LoadingRow />;

  const p1Score = data.p1 ?? 0;
  const p2Score = data.p2 ?? 0;
  const p1Wins = p1Score > p2Score;
  const p2Wins = p2Score > p1Score;

  return (
    <div className="flex min-w-0 items-stretch gap-2 sm:gap-3">
      <PlayerColumn
        name={partner1Name}
        isWinner={p1Wins}
        avatar={<div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-xl sm:text-2xl">{renderAvatar(partner1Avatar)}</div>}
      >
        <StatRow label="Recorde" value={p1Score} />
      </PlayerColumn>

      <div className="flex shrink-0 flex-col items-center justify-center gap-1 px-0.5 text-white/30 sm:px-1">
        <span className="text-xs font-bold">VS</span>
      </div>

      <PlayerColumn
        name={partner2Name}
        isWinner={p2Wins}
        avatar={<div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-xl sm:text-2xl">{renderAvatar(partner2Avatar)}</div>}
      >
        <StatRow label="Recorde" value={p2Score} />
      </PlayerColumn>
    </div>
  );
}

function WordTab() {
  const [data, setData] = useState<{ p1: WordRecord | null; p2: WordRecord | null } | null>(null);
  const { config } = useSiteConfigStore();
  const partner1Name = config?.couple?.partner1?.name || 'Kevin';
  const partner2Name = config?.couple?.partner2?.name || 'Iara';

  const partner1Avatar = config?.couple?.partner1?.avatar || '👦';
  const partner2Avatar = config?.couple?.partner2?.avatar || '👩';

  useEffect(() => {
    getWordRanking().then(setData);
  }, []);

  if (!data) return <LoadingRow />;

  const p1 = data.p1;
  const p2 = data.p2;
  const p1Score = p1?.score ?? 0;
  const p2Score = p2?.score ?? 0;
  const p1Wins = p1Score > p2Score;
  const p2Wins = p2Score > p1Score;

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="flex min-w-0 items-stretch gap-2 sm:gap-3">
        <PlayerColumn
          name={partner1Name}
          isWinner={p1Wins}
          avatar={<div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-xl sm:text-2xl">{renderAvatar(partner1Avatar)}</div>}
        >
          <StatRow label="Pontuação" value={p1Score} />
          <Divider label="detalhes" />
          <StatRow label="Vitórias" value={p1?.wins ?? 0} />
          <StatRow label="Sequência" value={`🔥 ${p1?.streak ?? 0}`} />
          <StatRow label="Melhor Seq." value={p1?.bestStreak ?? 0} />
        </PlayerColumn>

        <div className="flex shrink-0 flex-col items-center justify-center gap-1 px-0.5 text-white/30 sm:px-1">
          <span className="text-xs font-bold">VS</span>
        </div>

        <PlayerColumn
          name={partner2Name}
          isWinner={p2Wins}
          avatar={<div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-xl sm:text-2xl">{renderAvatar(partner2Avatar)}</div>}
        >
          <StatRow label="Pontuação" value={p2Score} />
          <Divider label="detalhes" />
          <StatRow label="Vitórias" value={p2?.wins ?? 0} />
          <StatRow label="Sequência" value={`🔥 ${p2?.streak ?? 0}`} />
          <StatRow label="Melhor Seq." value={p2?.bestStreak ?? 0} />
        </PlayerColumn>
      </div>

      {/* Distribuição de tentativas */}
      {(p1?.winsByAttempt || p2?.winsByAttempt) && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4">
          <p className="text-white/40 text-[9px] sm:text-[10px] uppercase tracking-widest text-center mb-2 sm:mb-3">Distribuição de Vitórias</p>
          <div className="flex flex-col gap-1 sm:gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((n, idx) => {
              const p1v = p1?.winsByAttempt?.[idx] ?? 0;
              const p2v = p2?.winsByAttempt?.[idx] ?? 0;
              const maxVal = Math.max(p1v, p2v, 1);
              return (
                <div key={n} className="flex items-center gap-1.5 sm:gap-2 text-xs">
                  <span className="text-white/40 w-3 sm:w-4 text-right shrink-0">{n}</span>
                  {/* P1 bar (left) */}
                  <div className="flex-1 flex justify-end">
                    <div
                      className="h-3.5 sm:h-4 rounded bg-purple-500/60 transition-all duration-500 flex items-center justify-end pr-1"
                      style={{ width: `${(p1v / maxVal) * 100}%`, minWidth: p1v > 0 ? '1.25rem' : '0' }}
                    >
                      {p1v > 0 && <span className="text-white text-[9px] font-bold">{p1v}</span>}
                    </div>
                  </div>
                  <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white/20 flex-shrink-0" />
                  {/* P2 bar (right) */}
                  <div className="flex-1">
                    <div
                      className="h-3.5 sm:h-4 rounded bg-pink-500/60 transition-all duration-500 flex items-center pl-1"
                      style={{ width: `${(p2v / maxVal) * 100}%`, minWidth: p2v > 0 ? '1.25rem' : '0' }}
                    >
                      {p2v > 0 && <span className="text-white text-[9px] font-bold">{p2v}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[9px] sm:text-[10px]">
            <span className="max-w-[48%] truncate text-purple-400">■ {partner1Name}</span>
            <span className="max-w-[48%] truncate text-pink-400">■ {partner2Name}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function QuizTab() {
  const [data, setData] = useState<{ p1: QuizRecord | null; p2: QuizRecord | null } | null>(null);
  const { config } = useSiteConfigStore();
  const partner1Name = config?.couple?.partner1?.name || 'Kevin';
  const partner2Name = config?.couple?.partner2?.name || 'Iara';

  const partner1Avatar = config?.couple?.partner1?.avatar || '👦';
  const partner2Avatar = config?.couple?.partner2?.avatar || '👩';

  useEffect(() => {
    getQuizRanking().then(setData);
  }, []);

  if (!data) return <LoadingRow />;

  const p1 = data.p1;
  const p2 = data.p2;
  const p1Score = p1?.score ?? 0;
  const p2Score = p2?.score ?? 0;
  const p1Wins = p1Score > p2Score;
  const p2Wins = p2Score > p1Score;

  return (
    <div className="flex min-w-0 items-stretch gap-2 sm:gap-3">
      <PlayerColumn
        name={partner1Name}
        isWinner={p1Wins}
        avatar={<div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-xl sm:text-2xl">{renderAvatar(partner1Avatar)}</div>}
      >
        <StatRow label="Recorde" value={p1Score} />
        <Divider label="combo" />
        <StatRow label="Maior Combo" value={`x${p1?.highestCombo ?? 0}`} />
      </PlayerColumn>

      <div className="flex shrink-0 flex-col items-center justify-center gap-1 px-0.5 text-white/30 sm:px-1">
        <span className="text-xs font-bold">VS</span>
      </div>

      <PlayerColumn
        name={partner2Name}
        isWinner={p2Wins}
        avatar={<div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-xl sm:text-2xl">{renderAvatar(partner2Avatar)}</div>}
      >
        <StatRow label="Recorde" value={p2Score} />
        <Divider label="combo" />
        <StatRow label="Maior Combo" value={`x${p2?.highestCombo ?? 0}`} />
      </PlayerColumn>
    </div>
  );
}

function MemoryTab() {
  const [data, setData] = useState<{ p1: MemoryRecord | null; p2: MemoryRecord | null } | null>(null);
  const { config } = useSiteConfigStore();
  const partner1Name = config?.couple?.partner1?.name || 'Kevin';
  const partner2Name = config?.couple?.partner2?.name || 'Iara';

  const partner1Avatar = config?.couple?.partner1?.avatar || '👦';
  const partner2Avatar = config?.couple?.partner2?.avatar || '👩';

  useEffect(() => {
    getMemoryRanking().then(setData);
  }, []);

  if (!data) return <LoadingRow />;

  const p1Best = resolveBestMemoryRun(data.p1);
  const p2Best = resolveBestMemoryRun(data.p2);
  const p1Wins = p1Best.score > p2Best.score;
  const p2Wins = p2Best.score > p1Best.score;

  return (
    <div className="flex min-w-0 items-stretch gap-2 sm:gap-3">
      <PlayerColumn
        name={partner1Name}
        isWinner={p1Wins}
        avatar={<div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-xl sm:text-2xl">{renderAvatar(partner1Avatar)}</div>}
      >
        <StatRow label={p1Best.levelLabel ? `Pontuação · ${p1Best.levelLabel}` : 'Pontuação'} value={p1Best.score} />
        <Divider label="detalhes" />
        <StatRow label="Maior Combo" value={`x${data.p1?.bestCombo ?? 0}`} />
        <StatRow label={p1Best.timeLabel} value={formatMemoryTime(p1Best.time)} />
      </PlayerColumn>

      <div className="flex shrink-0 flex-col items-center justify-center gap-1 px-0.5 text-white/30 sm:px-1">
        <span className="text-xs font-bold">VS</span>
      </div>

      <PlayerColumn
        name={partner2Name}
        isWinner={p2Wins}
        avatar={<div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-xl sm:text-2xl">{renderAvatar(partner2Avatar)}</div>}
      >
        <StatRow label={p2Best.levelLabel ? `Pontuação · ${p2Best.levelLabel}` : 'Pontuação'} value={p2Best.score} />
        <Divider label="detalhes" />
        <StatRow label="Maior Combo" value={`x${data.p2?.bestCombo ?? 0}`} />
        <StatRow label={p2Best.timeLabel} value={formatMemoryTime(p2Best.time)} />
      </PlayerColumn>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────

const TABS: { id: RankingGame; label: string; Icon: React.ElementType }[] = [
  { id: 'snake',  label: 'Cobrinha', Icon: Worm },
  { id: 'word',   label: 'Palavra',  Icon: Gamepad2 },
  { id: 'quiz',   label: 'Quiz',     Icon: MessageCircleHeart },
  { id: 'memory', label: 'Memória',  Icon: Layers },
];

export function RankingModal({ isOpen, onClose, initialGame = 'snake' }: Props) {
  const [activeTab, setActiveTab] = useState<RankingGame>(initialGame);

  useEffect(() => {
    if (isOpen) setActiveTab(initialGame);
  }, [isOpen, initialGame]);

  useEffect(() => {
    if (isOpen) {
      const unlock = lockBodyScroll();
      return () => { unlock(); };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel — fixed height so it NEVER resizes on tab change */}
      <motion.div
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 80 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative z-10 w-full sm:max-w-lg bg-[#0d0d1a] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col"
        style={{
          // Fixed height: 480px mobile, 560px tablet+
          height: 'clamp(480px, 78dvh, 560px)',
          maxHeight: '95dvh',
        }}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 pt-3 sm:pt-5 pb-2 sm:pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">Ranking do Casal</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 sm:px-5 pb-2 sm:pb-3 shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-label={tab.label}
              className={`flex-1 py-2 px-1 sm:px-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-white/15 text-white shadow-inner'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5'
              }`}
            >
              <tab.Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content — fills remaining fixed space, scrolls internally */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-5 sm:px-5 sm:pb-6">
          {activeTab === 'snake' && (
            <motion.div key="snake" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <SnakeTab />
            </motion.div>
          )}
          {activeTab === 'word' && (
            <motion.div key="word" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <WordTab />
            </motion.div>
          )}
          {activeTab === 'quiz' && (
            <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <QuizTab />
            </motion.div>
          )}
          {activeTab === 'memory' && (
            <motion.div key="memory" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <MemoryTab />
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
