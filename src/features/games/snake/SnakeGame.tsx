import { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX, Pause, Play, Trophy } from 'lucide-react';
import { useThemeStore } from '../../../store/useThemeStore';
import { SNAKE_THEMES } from './snakeTheme';
import { useSnakeGame, COLS, ROWS, calculateSnakeGrid } from './useSnakeGame';
import type { Point, Particle } from './useSnakeGame';
import { RankingModal } from '../ranking/RankingModal';

// ─── Constants ────────────────────────────────────────────────────────────────
const MIN_SWIPE_PX = 12; // Minimum pixels to register a swipe direction change

export function SnakeGame() {
  const {
    g, phase, score, highScore, audioEnabled,
    startGame, setGridDimensions, pauseToggle, goMenu, queueDir, toggleAudio, tick
  } = useSnakeGame();

  const [showRanking, setShowRanking] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const activeTheme = useThemeStore(s => s.activeTheme);
  const theme = SNAKE_THEMES[activeTheme];

  // Grid dimensions (dynamic for mobile portrait ~9:16; 17x15 for desktop/tablet)
  const [grid, setGrid] = useState<{ cols: number; rows: number }>({ cols: COLS, rows: ROWS });
  // cellSize is computed in integers to prevent subpixel rendering issues
  const [cellSize, setCellSize] = useState(22);

  // ─── Resize via ResizeObserver (fires when container actually changes) ─────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const BORDER = 2; // border px on each side of canvas wrapper

    const compute = () => {
      // clientWidth/clientHeight reais do container já descontando header e padding
      const containerW = el.clientWidth || window.innerWidth;
      const containerH = el.clientHeight || (window.innerHeight - 100);

      // Altura do HUD medida dinamicamente
      const hudEl = hudRef.current;
      const hudH = hudEl && hudEl.offsetHeight > 0 ? hudEl.offsetHeight : (containerW < 640 ? 44 : 50);
      const hudMargin = containerW < 640 ? 8 : 10;
      const safety = 4; // margem de segurança contra subpixel drift

      // Área líquida máxima disponível para o canvas
      const maxCanvasW = Math.max(100, containerW - (BORDER * 2) - safety);
      const maxCanvasH = Math.max(100, containerH - hudH - hudMargin - (BORDER * 2) - safety);

      // Grade dinâmica proporcional a qualquer tela de celular, tablet ou desktop
      const newGrid = calculateSnakeGrid(maxCanvasW, maxCanvasH);
      setGrid(newGrid);
      setGridDimensions(newGrid.cols, newGrid.rows);

      // Garante matematicamente que o canvas nunca ultrapasse largura nem altura
      const maxCellW = Math.floor(maxCanvasW / newGrid.cols);
      const maxCellH = Math.floor(maxCanvasH / newGrid.rows);
      let size = Math.min(maxCellW, maxCellH);

      // Limite confortável para cada categoria de dispositivo
      const maxSize = containerW >= 1024 ? 48 : containerW >= 640 ? 42 : 36;
      size = Math.min(size, maxSize);
      size = Math.max(8, size);

      setCellSize(size);
    };

    compute();

    const ro = new ResizeObserver(compute);
    ro.observe(el);
    if (hudRef.current) {
      ro.observe(hudRef.current);
    }
    window.visualViewport?.addEventListener('resize', compute);
    window.addEventListener('resize', compute);
    window.addEventListener('orientationchange', compute);

    return () => {
      ro.disconnect();
      window.visualViewport?.removeEventListener('resize', compute);
      window.removeEventListener('resize', compute);
      window.removeEventListener('orientationchange', compute);
    };
  }, [setGridDimensions]);

  // Canvas dimensions are exact integer multiples of cellSize (no fractions)
  const CANVAS_W = grid.cols * cellSize;
  const CANVAS_H = grid.rows * cellSize;

  // ─── Drawing Loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1:1 pixel mapping — avoids DPR fractional arithmetic that cuts last row/col
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    canvas.style.width = `${CANVAS_W}px`;
    canvas.style.height = `${CANVAS_H}px`;

    const ctx = canvas.getContext('2d')!;

    // Pre-render grid (only once per resize/theme change)
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = CANVAS_W;
    bgCanvas.height = CANVAS_H;
    const bgCtx = bgCanvas.getContext('2d')!;
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        bgCtx.fillStyle = (r + c) % 2 === 0 ? theme.cellA : theme.cellB;
        bgCtx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
      }
    }

    let rafId: number;
    let lastTime = performance.now();

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const spawnParticles = (cx: number, cy: number): Particle[] => {
      const p: Particle[] = [];
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 1.5 + Math.random() * 3.5;
        p.push({
          x: cx, y: cy,
          vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
          alpha: 1, r: 2 + Math.random() * 4,
          color: theme.particles[Math.floor(Math.random() * theme.particles.length)]
        });
      }
      return p;
    };

    const drawApple = (x: number, y: number, scale = 1) => {
      if (scale <= 0) return;
      const fx = x * cellSize + cellSize / 2;
      const fy = y * cellSize + cellSize / 2;
      ctx.save();
      ctx.globalAlpha = Math.max(0, scale);
      // Body
      ctx.beginPath();
      ctx.arc(fx, fy + scale, cellSize * 0.35 * scale, 0, Math.PI * 2);
      ctx.fillStyle = theme.food;
      ctx.fill();
      // Leaf
      ctx.beginPath();
      ctx.ellipse(fx + 2 * scale, fy - cellSize * 0.25 * scale, 4 * scale, 2 * scale, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fillStyle = '#4caf50';
      ctx.fill();
      ctx.restore();
    };

    const draw = (time: number) => {
      let delta = time - lastTime;
      if (delta > 100) delta = 16;
      lastTime = time;

      const s = g.current;

      // Advance game logic
      if (s.phase === 'playing' && !s.isWaiting) {
        s.progress += delta / s.speed;
        while (s.progress >= 1 && s.phase === 'playing') {
          tick();
          s.progress -= 1;
        }
      }

      // 1. Draw cached grid (exact 1:1 blit, no scaling)
      ctx.drawImage(bgCanvas, 0, 0);

      // 2. Food
      drawApple(s.food.x, s.food.y);

      // Eating animation
      if (s.isEating) {
        if (s.progress < 0.6) {
          drawApple(s.snake[0].x, s.snake[0].y, 1 - s.progress / 0.6);
        } else if (!s.spawnedParticlesForThisEat) {
          s.particles.push(...spawnParticles(
            s.snake[0].x * cellSize + cellSize / 2,
            s.snake[0].y * cellSize + cellSize / 2
          ));
          s.spawnedParticlesForThisEat = true;
        }
      }

      // 3. Snake path
      const path: Point[] = [];
      if (s.snake.length > 0) {
        if ((s.phase === 'playing' || s.phase === 'gameOver') && s.prevHead && s.oldTail && !s.isWaiting) {
          const p = s.phase === 'gameOver' ? 1.0 : s.progress;
          const vHead = {
            x: lerp(s.prevHead.x, s.snake[0].x, p),
            y: lerp(s.prevHead.y, s.snake[0].y, p)
          };
          const vTail = s.isEating ? s.snake[s.snake.length - 1] : {
            x: lerp(s.oldTail.x, s.snake[s.snake.length - 1].x, p),
            y: lerp(s.oldTail.y, s.snake[s.snake.length - 1].y, p)
          };
          path.push(vHead, ...s.snake.slice(1), vTail);
        } else {
          path.push(...s.snake);
        }

        const SNAKE_W = cellSize - 4;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Outline
        ctx.lineWidth = SNAKE_W + 4;
        ctx.strokeStyle = theme.snakeOutline;
        ctx.beginPath();
        ctx.moveTo(path[0].x * cellSize + cellSize / 2, path[0].y * cellSize + cellSize / 2);
        for (let i = 1; i < path.length; i++) {
          ctx.lineTo(path[i].x * cellSize + cellSize / 2, path[i].y * cellSize + cellSize / 2);
        }
        ctx.stroke();

        // Body
        ctx.lineWidth = SNAKE_W;
        ctx.strokeStyle = theme.snakeBody;
        ctx.stroke();

        // Shine
        ctx.lineWidth = SNAKE_W * 0.3;
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.translate(-SNAKE_W * 0.15, -SNAKE_W * 0.15);
        ctx.stroke();
        ctx.restore();

        // Eyes
        const hx = path[0].x * cellSize + cellSize / 2;
        const hy = path[0].y * cellSize + cellSize / 2;
        let vx = s.dir.x, vy = s.dir.y;
        if (path.length > 1 && !s.isWaiting) {
          const dx = path[0].x - path[1].x;
          const dy = path[0].y - path[1].y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 0.001) { vx = dx / len; vy = dy / len; }
        }
        const SNAKE_W2 = cellSize - 4;
        const eyeOffset = SNAKE_W2 * 0.25;
        const eyeFwd = SNAKE_W2 * 0.3;
        const eyeRadius = Math.max(2.5, Math.round(cellSize * 0.14));
        const pupilRadius = Math.max(1.2, Math.round(cellSize * 0.08));
        const perp = { x: -vy, y: vx };
        for (const side of [-1, 1]) {
          const ex = hx + vx * eyeFwd + perp.x * eyeOffset * side;
          const ey = hy + vy * eyeFwd + perp.y * eyeOffset * side;
          ctx.beginPath(); ctx.arc(ex, ey, eyeRadius, 0, Math.PI * 2);
          ctx.fillStyle = '#fff'; ctx.fill();
          ctx.beginPath(); ctx.arc(ex + vx * 1.5, ey + vy * 1.5, pupilRadius, 0, Math.PI * 2);
          ctx.fillStyle = '#000'; ctx.fill();
        }
      }

      // 4. Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.alpha -= 0.025;
        if (p.alpha <= 0) { s.particles.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.fill();
        ctx.restore();
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [theme, cellSize, CANVAS_W, CANVAS_H, grid.cols, grid.rows, g, tick]);

  // ─── Keyboard Input ────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'playing') {
        if (e.key === ' ') e.preventDefault();
        return;
      }
      switch (e.key) {
        case 'ArrowUp':    case 'w': case 'W': queueDir({ x: 0, y: -1 }); e.preventDefault(); break;
        case 'ArrowDown':  case 's': case 'S': queueDir({ x: 0, y: 1 });  e.preventDefault(); break;
        case 'ArrowLeft':  case 'a': case 'A': queueDir({ x: -1, y: 0 }); e.preventDefault(); break;
        case 'ArrowRight': case 'd': case 'D': queueDir({ x: 1, y: 0 });  e.preventDefault(); break;
        case ' ': pauseToggle(); e.preventDefault(); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, queueDir, pauseToggle]);

  // ─── Touch Input: Full-screen continuous swipe detection ──────────────────
  // Strategy: Track last registered position. On touchmove, compute direction
  // from that anchor. Once threshold is crossed and direction changes, update
  // anchor. This allows continuous direction changes without lifting the finger.
  const touchAnchor = useRef<{ x: number; y: number } | null>(null);
  const lastDir = useRef<{ x: number; y: number } | null>(null);

  const handleTouchDir = useCallback((dx: number, dy: number) => {
    if (Math.abs(dx) < MIN_SWIPE_PX && Math.abs(dy) < MIN_SWIPE_PX) return;
    let dir: { x: number; y: number };
    if (Math.abs(dx) > Math.abs(dy)) {
      dir = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
    } else {
      dir = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
    }
    // Only dispatch if direction actually changed (avoid spamming the queue)
    if (!lastDir.current || dir.x !== lastDir.current.x || dir.y !== lastDir.current.y) {
      lastDir.current = dir;
      queueDir(dir);
    }
  }, [queueDir]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      // Ignore touches on UI buttons so they can be clicked normally
      const target = e.target as HTMLElement;
      if (target && typeof target.closest === 'function' && target.closest('button, a')) {
        return;
      }

      const t = e.touches[0];
      touchAnchor.current = { x: t.clientX, y: t.clientY };
      lastDir.current = null;
      // Prevent page scroll during game
      if (phase === 'playing') e.preventDefault();
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchAnchor.current) return;
      if (phase !== 'playing') return;
      e.preventDefault();

      const t = e.touches[0];
      const dx = t.clientX - touchAnchor.current.x;
      const dy = t.clientY - touchAnchor.current.y;

      if (Math.abs(dx) >= MIN_SWIPE_PX || Math.abs(dy) >= MIN_SWIPE_PX) {
        handleTouchDir(dx, dy);
        // Reset anchor to current position so next swipe starts fresh from here
        touchAnchor.current = { x: t.clientX, y: t.clientY };
      }
    };

    const onTouchEnd = () => {
      touchAnchor.current = null;
    };

    // Must be on window (passive:false to allow preventDefault on iOS Safari)
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [phase, handleTouchDir]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col items-center justify-center select-none min-h-0 overflow-hidden"
      style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* ── HUD — matches canvas width for clean framing ── */}
      <div
        ref={hudRef}
        className="flex items-center justify-between mb-1.5 sm:mb-2.5 px-1 tracking-wide shrink-0"
        style={{ color: theme.textPrimary, width: Math.max(260, CANVAS_W), maxWidth: '100%' }}
      >
        <div className="flex flex-col min-w-0">
          <span className="text-[9px] sm:text-[10px] uppercase opacity-70">Pontuação</span>
          <span className="text-xl sm:text-2xl font-bold leading-none">{score}</span>
        </div>

        <div className="flex gap-2 sm:gap-3 items-center">
          <button
            onClick={() => setShowRanking(true)}
            className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 transition-colors opacity-70 hover:opacity-100 active:scale-90"
            title="Ranking do Casal"
            style={{ touchAction: 'manipulation' }}
          >
            <Trophy className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
          </button>
          <button
            onClick={toggleAudio}
            className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 transition-colors opacity-70 hover:opacity-100 active:scale-90"
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 sm:w-[18px] sm:h-[18px]" /> : <VolumeX className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />}
          </button>
          <button
            onClick={pauseToggle}
            disabled={phase === 'menu' || phase === 'gameOver'}
            className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 transition-colors opacity-70 hover:opacity-100 active:scale-90 disabled:opacity-30"
          >
            {phase === 'paused' ? <Play className="w-4 h-4 sm:w-[18px] sm:h-[18px]" /> : <Pause className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />}
          </button>
        </div>

        <div className="flex flex-col items-end min-w-0">
          <span className="text-[9px] sm:text-[10px] uppercase opacity-70">Recorde</span>
          <span className="text-xl sm:text-2xl font-bold leading-none" style={{ color: theme.borderNeon }}>{highScore}</span>
        </div>
      </div>

      {/* ── Canvas Area ── */}
      {/* Use exact integer pixel sizes so grid cells are all equal width */}
      <div
        className="relative rounded-lg overflow-hidden shrink-0"
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          maxWidth: '100%',
          boxSizing: 'content-box',
          border: `2px solid ${theme.borderNeon}`,
          boxShadow: `0 0 15px ${theme.borderGlow}, inset 0 0 10px ${theme.borderGlow}`,
          background: theme.boardBg,
          overscrollBehavior: 'none',
        }}
      >
        <canvas
          ref={canvasRef}
          className="block"
          style={{ display: 'block' }}
        />

        {/* ── Overlay: Menu ── */}
        {phase === 'menu' && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-3 animate-in fade-in zoom-in-95 duration-300"
            style={{ background: theme.overlayBg }}
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2 tracking-tighter" style={{ color: theme.textPrimary, textShadow: `0 0 10px ${theme.borderGlow}` }}>
              Snake
            </h1>
            <p className="text-xs sm:text-sm opacity-80 mb-3 sm:mb-6 max-w-[220px] text-center" style={{ color: theme.textPrimary }}>
              Coma, cresça e faça a maior pontuação!
            </p>
            <SmallBtn bg={theme.btnPrimary} onClick={() => startGame(grid)}>JOGAR</SmallBtn>
          </div>
        )}

        {/* ── Overlay: Paused ── */}
        {phase === 'paused' && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-3 animate-in fade-in duration-200"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
          >
            <h2 className="text-xl sm:text-2xl font-bold tracking-widest mb-3 sm:mb-6" style={{ color: theme.textPrimary }}>PAUSADO</h2>
            <SmallBtn bg={theme.btnPrimary} onClick={pauseToggle}>Continuar</SmallBtn>
          </div>
        )}

        {/* ── Overlay: Game Over ── */}
        {phase === 'gameOver' && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-3 animate-in fade-in zoom-in-95 duration-300"
            style={{ background: theme.overlayBg }}
          >
            <div className="text-3xl sm:text-4xl md:text-5xl mb-1 sm:mb-2 animate-bounce">💀</div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3" style={{ color: theme.textPrimary }}>GAME OVER</h2>

            <div className="flex gap-4 sm:gap-6 mb-3 sm:mb-6 text-center" style={{ color: theme.textPrimary }}>
              <div>
                <div className="text-[10px] sm:text-xs uppercase opacity-70">Pontuação</div>
                <div className="text-lg sm:text-xl font-bold">{score}</div>
              </div>
              <div>
                <div className="text-[10px] sm:text-xs uppercase opacity-70">Recorde</div>
                <div className="text-lg sm:text-xl font-bold" style={{ color: theme.borderNeon }}>{highScore}</div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:gap-2.5 w-40 sm:w-44">
              <SmallBtn bg={theme.btnPrimary} onClick={() => startGame(grid)}>JOGAR NOVAMENTE</SmallBtn>
              <SmallBtn bg="rgba(255,255,255,0.1)" onClick={goMenu}>MENU</SmallBtn>
            </div>
          </div>
        )}
      </div>

      <RankingModal
        isOpen={showRanking}
        onClose={() => setShowRanking(false)}
        initialGame="snake"
      />
    </div>
  );
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

function SmallBtn({ bg, onClick, children }: { bg: string; onClick: () => void; children: React.ReactNode }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="px-8 py-2 rounded-full font-semibold text-xs tracking-widest uppercase text-white transition-all active:scale-95"
      style={{
        backgroundColor: bg,
        filter: hover ? 'brightness(1.15)' : 'none',
        boxShadow: hover ? `0 4px 12px ${bg}88` : `0 2px 8px ${bg}55`,
      }}
    >
      {children}
    </button>
  );
}
