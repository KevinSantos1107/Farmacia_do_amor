import { useRef, useState, useCallback, useEffect } from 'react';
import { saveRecordIfBetter } from '../../../services/gameRecords';
import { usePlayerIdentityStore } from '../../../store/usePlayerIdentityStore';
import { useSiteConfigStore } from '../../../store/siteConfigStore';

export const COLS = 17;
export const ROWS = 15;

export type Point = { x: number; y: number };
export type Dir = { x: number; y: number };
export type Particle = { x: number; y: number; vx: number; vy: number; alpha: number; r: number; color: string };

type GamePhase = 'menu' | 'playing' | 'paused' | 'gameOver';

export type GameState = {
  snake: Point[];
  dir: Dir;
  queuedDirs: Dir[];
  food: Point;
  score: number;
  highScore: number;
  speed: number;
  phase: GamePhase;
  isWaiting: boolean; // Tells if the game is waiting for the first input
  // Interpolation data
  prevHead: Point | null;
  oldTail: Point | null;
  isEating: boolean;
  progress: number;
  // Visual effects
  particles: Particle[];
  spawnedParticlesForThisEat: boolean;
};

function randomFood(snake: Point[]): Point {
  let p: Point;
  do {
    p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (snake.some(s => s.x === p.x && s.y === p.y));
  return p;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Simple Web Audio API beep generator
function playBeep(freq: number, type: OscillatorType, duration: number, audioEnabled: boolean) {
  if (!audioEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Ignore audio context errors
  }
}

export function useSnakeGame() {
  const [phaseState, setPhaseState] = useState<GamePhase>('menu');
  const [scoreState, setScoreState] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // Ref to current player — avoids stale closures in the game loop
  const playerRef = useRef(usePlayerIdentityStore.getState().player);
  
  const [highScoreState, setHighScoreState] = useState(() => {
    try { return parseInt(localStorage.getItem('snake2-hs') ?? '0') || 0; } catch { return 0; }
  });

  // Sync high score from DB
  useEffect(() => {
    const p = usePlayerIdentityStore.getState().player;
    playerRef.current = p;
    const config = useSiteConfigStore.getState().config;
    
    import('../../../features/auth/playerIds').then(({ getPlayerIds }) => {
      const { p1Id, p2Id } = getPlayerIds(config);
      if (p === p1Id || p === p2Id || p === 'kevin' || p === 'iara') {
        import('../../../services/gameRecords').then(({ getRecord }) => {
          getRecord('snake', p).then(score => {
            if (score !== null) {
              setHighScoreState(score);
              g.current.highScore = score;
              try { localStorage.setItem('snake2-hs', String(score)); } catch {}
            }
          });
        });
      }
    });
  }, []);

  // Single source of truth for the engine loop
  const g = useRef<GameState>({
    snake: [{ x: 6, y: 7 }, { x: 5, y: 7 }, { x: 4, y: 7 }],
    dir: { x: 1, y: 0 },
    queuedDirs: [],
    food: { x: 12, y: 7 },
    score: 0,
    highScore: highScoreState,
    speed: 135,
    phase: 'menu',
    isWaiting: false,
    prevHead: null,
    oldTail: null,
    isEating: false,
    progress: 0,
    particles: [],
    spawnedParticlesForThisEat: false,
  });

  const syncState = useCallback(() => {
    setPhaseState(g.current.phase);
    setScoreState(g.current.score);
    setHighScoreState(g.current.highScore);
  }, []);

  const startGame = useCallback(() => {
    const initialSnake = [{ x: 6, y: 7 }, { x: 5, y: 7 }, { x: 4, y: 7 }];
    g.current.snake = initialSnake;
    g.current.dir = { x: 1, y: 0 }; // Facing right
    g.current.queuedDirs = [];
    g.current.food = randomFood(initialSnake);
    g.current.score = 0;
    g.current.speed = 135;
    g.current.phase = 'playing';
    g.current.isWaiting = true; // Wait for user input to start moving
    g.current.prevHead = null;
    g.current.oldTail = null;
    g.current.isEating = false;
    g.current.progress = 0;
    g.current.particles = [];
    g.current.spawnedParticlesForThisEat = false;
    syncState();
  }, [syncState]);

  const pauseToggle = useCallback(() => {
    if (g.current.phase === 'playing') {
      g.current.phase = 'paused';
    } else if (g.current.phase === 'paused') {
      g.current.phase = 'playing';
    }
    syncState();
  }, [syncState]);

  const goMenu = useCallback(() => {
    g.current.phase = 'menu';
    syncState();
  }, [syncState]);

  const queueDir = useCallback((d: Dir) => {
    const s = g.current;
    if (s.phase !== 'playing') return;
    
    // Start game if waiting
    if (s.isWaiting) {
      // Prevent immediately crashing into its own body on the left
      if (d.x === -1 && d.y === 0) return;
      s.dir = d;
      s.isWaiting = false;
      return;
    }

    // Max 2 buffered inputs
    if (s.queuedDirs.length >= 2) return;

    const lastDir = s.queuedDirs.length > 0 ? s.queuedDirs[s.queuedDirs.length - 1] : s.dir;
    const is180 = (d.x === -lastDir.x && d.y === -lastDir.y);
    const isSame = (d.x === lastDir.x && d.y === lastDir.y);

    if (!is180 && !isSame) {
      s.queuedDirs.push(d);
    }
  }, []);

  const toggleAudio = useCallback(() => setAudioEnabled(a => !a), []);

  const tick = useCallback(() => {
    const s = g.current;
    if (s.phase !== 'playing' || s.isWaiting) return;

    if (s.queuedDirs.length > 0) {
      s.dir = s.queuedDirs.shift()!;
    }

    const head = s.snake[0];
    const newHead = { x: head.x + s.dir.x, y: head.y + s.dir.y };

    // Wall collision
    if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
      s.prevHead = { ...head };
      s.oldTail = { ...s.snake[s.snake.length - 1] };
      s.snake = [newHead, ...s.snake.slice(0, -1)]; 
      s.phase = 'gameOver';
      playBeep(150, 'sawtooth', 0.4, audioEnabled);
      syncState();
      return;
    }

    // Self collision
    const willEat = (newHead.x === s.food.x && newHead.y === s.food.y);
    const bodyToCheck = willEat ? s.snake : s.snake.slice(0, -1);
    if (bodyToCheck.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
      s.prevHead = { ...head };
      s.oldTail = { ...s.snake[s.snake.length - 1] };
      s.snake = [newHead, ...s.snake.slice(0, -1)]; 
      s.phase = 'gameOver';
      playBeep(150, 'sawtooth', 0.4, audioEnabled);
      syncState();
      return;
    }

    s.prevHead = { ...head };
    s.oldTail = { ...s.snake[s.snake.length - 1] };
    s.isEating = willEat;

    const newSnake = [newHead, ...s.snake];
    if (!willEat) newSnake.pop();
    s.snake = newSnake;

    if (willEat) {
      s.score += 10;
      if (s.score > s.highScore) {
        s.highScore = s.score;
        try { localStorage.setItem('snake2-hs', String(s.highScore)); } catch {}
        // Persiste no Firestore só para jogadores identificados
        const player = playerRef.current;
        const config = useSiteConfigStore.getState().config;
        import('../../../features/auth/playerIds').then(({ getPlayerIds }) => {
          const { p1Id, p2Id } = getPlayerIds(config);
          if (player === p1Id || player === p2Id || player === 'kevin' || player === 'iara') {
            saveRecordIfBetter('snake', player, s.highScore);
          }
        });
      }
      s.food = randomFood(s.snake);
      s.spawnedParticlesForThisEat = false;
      playBeep(600, 'sine', 0.1, audioEnabled);
      syncState(); // ONLY sync state when score updates (prevent React lag)
    }
  }, [syncState, audioEnabled]);

  return {
    g,
    phase: phaseState,
    score: scoreState,
    highScore: highScoreState,
    audioEnabled,
    startGame,
    pauseToggle,
    goMenu,
    queueDir,
    toggleAudio,
    tick
  };
}
