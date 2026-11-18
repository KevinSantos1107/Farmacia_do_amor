import { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX, Pause, Play, Trophy } from 'lucide-react';
import { useThemeStore } from '../../../store/useThemeStore';
import { SNAKE_THEMES } from './snakeTheme';
import { useSnakeGame, COLS, ROWS, calculateSnakeGrid } from './useSnakeGame';
import type { Point, Particle, Ring, Popup } from './useSnakeGame';
import { RankingModal } from '../ranking/RankingModal';

// ─── Constants ────────────────────────────────────────────────────────────────
const MIN_SWIPE_PX = 12; // Minimum pixels to register a swipe direction change

export function SnakeGame() {
  const {
    g, phase, score, highScore, audioEnabled,
    startGame, setGridDimensions, pauseToggle, goMenu, queueDir, toggleAudio, tick
  } = useSnakeGame();

  const [showRanking, setShowRanking] = useState(false);

  // [novo] Estado de bump de pontuação para animação de escala
  const [scoreBump, setScoreBump] = useState(false);
  const [highScoreBump, setHighScoreBump] = useState(false);
  const prevScoreRef = useRef(score);
  const prevHighScoreRef = useRef(highScore);
  const isFirstRenderRef = useRef(true);

  // [novo] Detecta mudança de score e dispara bump
  useEffect(() => {
    if (isFirstRenderRef.current) { isFirstRenderRef.current = false; return; }
    if (score !== prevScoreRef.current) {
      prevScoreRef.current = score;
      setScoreBump(true);
      setTimeout(() => setScoreBump(false), 220);
    }
  }, [score]);

  // [novo] Detecta mudança de highScore e dispara bump
  useEffect(() => {
    if (highScore !== prevHighScoreRef.current && prevHighScoreRef.current > 0) {
      prevHighScoreRef.current = highScore;
      setHighScoreBump(true);
      setTimeout(() => setHighScoreBump(false), 220);
    } else {
      prevHighScoreRef.current = highScore;
    }
  }, [highScore]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const activeTheme = useThemeStore(s => s.activeTheme);
  const theme = SNAKE_THEMES[activeTheme];

  // Grid dimensions (dynamic for mobile portrait ~9:16; 17x15 for desktop/tablet)
  const [grid, setGrid] = useState<{ cols: number; rows: number }>({ cols: COLS, rows: ROWS });
  // cellSize is computed in integers to prevent subpixel rendering issues
  const [cellSize, setCellSize] = useState(22);

  // [novo] Refs para animações cosméticas da cabeça (piscar, língua)
  const blinkTime = useRef(performance.now() + 2500 + Math.random() * 3500);
  const blinkUntil = useRef(0);
  const tongueTime = useRef(performance.now() + 1500 + Math.random() * 3000);
  const tongueUntil = useRef(0);

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

    // [novo] Vinheta pré-renderizada no bgCanvas: radial gradient do centro às bordas
    {
      const vgr = bgCtx.createRadialGradient(
        CANVAS_W / 2, CANVAS_H / 2, 0,
        CANVAS_W / 2, CANVAS_H / 2, Math.sqrt(CANVAS_W * CANVAS_W + CANVAS_H * CANVAS_H) / 2
      );
      vgr.addColorStop(0, 'rgba(0,0,0,0)');
      vgr.addColorStop(1, 'rgba(0,0,0,0.38)');
      bgCtx.fillStyle = vgr;
      bgCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);
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

      // ── [novo] MELHORIA 7: Shake de câmera no game over ──────────────────
      const SHAKE_DUR = 350;
      const sinceGameOver = s.gameOverTime > 0 ? time - s.gameOverTime : 999999;
      const shakeActive = s.phase === 'gameOver' && sinceGameOver < SHAKE_DUR;
      if (shakeActive) {
        const shakeFade = 1 - sinceGameOver / SHAKE_DUR;
        const amp = 6 * shakeFade;
        const sx = (Math.random() - 0.5) * 2 * amp;
        const sy = (Math.random() - 0.5) * 2 * amp;
        ctx.save();
        ctx.translate(sx, sy);
      }

      // 1. Draw cached grid (exact 1:1 blit, no scaling)
      ctx.drawImage(bgCanvas, 0, 0);

      // ── [novo] MELHORIA 3: Glow da cabeça (radial gradient centrado na cabeça) ──
      if (s.snake.length > 0) {
        let hxGlow: number, hyGlow: number;
        if ((s.phase === 'playing' || s.phase === 'gameOver') && s.prevHead && !s.isWaiting) {
          const pGlow = s.phase === 'gameOver' ? 1.0 : s.progress;
          hxGlow = lerp(s.prevHead.x, s.snake[0].x, pGlow) * cellSize + cellSize / 2;
          hyGlow = lerp(s.prevHead.y, s.snake[0].y, pGlow) * cellSize + cellSize / 2;
        } else {
          hxGlow = s.snake[0].x * cellSize + cellSize / 2;
          hyGlow = s.snake[0].y * cellSize + cellSize / 2;
        }
        const glowRadius = cellSize * 2.5;
        const glowGr = ctx.createRadialGradient(hxGlow, hyGlow, 0, hxGlow, hyGlow, glowRadius);
        glowGr.addColorStop(0, theme.borderGlow);
        glowGr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = glowGr;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.restore();
      }

      // ── [novo] MELHORIA 4: Efeito de nascimento (birth effect) ────────────
      // Função local que encapsula todo o conteúdo do jogo (cobra, comida, partículas, rings, popups)
      const drawGameContent = () => {
        // 2. Food
        drawApple(s.food.x, s.food.y);

        // Eating animation + spawn de rings/popups
        if (s.isEating) {
          if (s.progress < 0.6) {
            drawApple(s.snake[0].x, s.snake[0].y, 1 - s.progress / 0.6);
          } else if (!s.spawnedParticlesForThisEat) {
            const headX = s.snake[0].x * cellSize + cellSize / 2;
            const headY = s.snake[0].y * cellSize + cellSize / 2;
            s.particles.push(...spawnParticles(headX, headY));
            // [novo] Ring de expansão ao comer
            (s.rings as Ring[]).push({ x: headX, y: headY, r: cellSize * 0.3, alpha: 1 });
            s.spawnedParticlesForThisEat = true;
          }

          // [novo] MELHORIA 6: Broto na cauda durante crescimento
          const tailX = s.snake[s.snake.length - 1].x * cellSize + cellSize / 2;
          const tailY = s.snake[s.snake.length - 1].y * cellSize + cellSize / 2;
          const SNAKE_W_TAIL = cellSize - 4;
          const growRadius = (SNAKE_W_TAIL / 2) * Math.min(s.progress, 0.8) / 0.8;
          ctx.save();
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          ctx.arc(tailX, tailY, growRadius, 0, Math.PI * 2);
          ctx.fillStyle = theme.snakeBody;
          ctx.fill();
          ctx.restore();
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
          const now = performance.now();

          // Em Game Over: mostra a cobrinha realmente virando na direção da batida (s.dir) e recuando
          if (s.phase === 'gameOver' && path.length > 0) {
            const hitTime = s.gameOverTime > 0 ? now - s.gameOverTime : 0;
            // No momento do impacto atinge a colisão e recua elasticamente para trás
            const tRecoil = Math.min(hitTime / 240, 1);
            // Recuo elástico suave com desaceleração (bate e volta)
            const bounce = Math.cos(tRecoil * Math.PI * 0.5); // de 1.0 (impacto) a 0.0 (estável)
            const headOffset = 0.10 + bounce * 0.28;
            const collisionHead: Point = {
              x: path[0].x + s.dir.x * headOffset,
              y: path[0].y + s.dir.y * headOffset
            };
            // Insere o pescoço virado na ponta para mostrar claramente que virou e bateu
            path.unshift(collisionHead);
          }

          ctx.save();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          // 1. Sombra suave de contato projetada no tabuleiro (profundidade realista)
          ctx.lineWidth = SNAKE_W;
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
          ctx.beginPath();
          ctx.moveTo(path[0].x * cellSize + cellSize / 2 + 1.5, path[0].y * cellSize + cellSize / 2 + 2.5);
          for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x * cellSize + cellSize / 2 + 1.5, path[i].y * cellSize + cellSize / 2 + 2.5);
          }
          ctx.stroke();

          // 2. Contorno limpo e elegante
          ctx.lineWidth = SNAKE_W + 3;
          ctx.strokeStyle = theme.snakeOutline;
          ctx.beginPath();
          ctx.moveTo(path[0].x * cellSize + cellSize / 2, path[0].y * cellSize + cellSize / 2);
          for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x * cellSize + cellSize / 2, path[i].y * cellSize + cellSize / 2);
          }
          ctx.stroke();

          // 3. Corpo principal com gradiente suave contínuo e uniforme (cabeça → cauda)
          if (path.length >= 2) {
            const gx0 = path[0].x * cellSize + cellSize / 2;
            const gy0 = path[0].y * cellSize + cellSize / 2;
            const gxN = path[path.length - 1].x * cellSize + cellSize / 2;
            const gyN = path[path.length - 1].y * cellSize + cellSize / 2;
            const bodyGrad = ctx.createLinearGradient(gx0, gy0, gxN, gyN);
            bodyGrad.addColorStop(0, theme.snakeBody);
            bodyGrad.addColorStop(1, theme.snakeShade);
            ctx.lineWidth = SNAKE_W;
            ctx.strokeStyle = bodyGrad;
            ctx.stroke();
          } else {
            ctx.lineWidth = SNAKE_W;
            ctx.strokeStyle = theme.snakeBody;
            ctx.stroke();
          }

          // 4. Luz dorsal acetinada contínua (volume 3D cilíndrico suave, sem pontos piscando)
          ctx.lineWidth = Math.max(1.5, SNAKE_W * 0.26);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
          ctx.stroke();

          // 5. Sulcos segmentares discretos (anéis ultra sutis nas vértebras para textura natural)
          if (path.length >= 2) {
            for (let i = 1; i < path.length; i++) {
              const ax = path[i - 1].x * cellSize + cellSize / 2;
              const ay = path[i - 1].y * cellSize + cellSize / 2;
              const bx = path[i].x * cellSize + cellSize / 2;
              const by = path[i].y * cellSize + cellSize / 2;
              const dx = bx - ax;
              const dy = by - ay;
              const len = Math.sqrt(dx * dx + dy * dy);
              if (len < 0.001) continue;
              const perpX = -dy / len;
              const perpY = dx / len;
              const ringHalf = SNAKE_W * 0.38;

              ctx.beginPath();
              ctx.moveTo(bx - perpX * ringHalf, by - perpY * ringHalf);
              ctx.lineTo(bx + perpX * ringHalf, by + perpY * ringHalf);
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
              ctx.lineWidth = 1.2;
              ctx.stroke();
            }
          }
          ctx.restore();

          // ── CABEÇA EXPRESSIVA & CARA DE DERROTA NA BATIDA ─────────────────
          const hx = path[0].x * cellSize + cellSize / 2;
          const hy = path[0].y * cellSize + cellSize / 2;
          let vx = s.dir.x, vy = s.dir.y;
          if (s.phase === 'gameOver') {
            // Em Game Over, a cabeça e o rosto ficam 100% virados para a direção em que virou e bateu (s.dir)
            vx = s.dir.x;
            vy = s.dir.y;
          } else if (path.length > 1 && !s.isWaiting) {
            const dx = path[0].x - path[1].x;
            const dy = path[0].y - path[1].y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0.001) { vx = dx / len; vy = dy / len; }
          }
          const SNAKE_W2 = cellSize - 4;
          const eyeOffset = SNAKE_W2 * 0.26;
          const eyeFwd = SNAKE_W2 * 0.30;
          const eyeRadius = Math.max(3, Math.round(cellSize * 0.16));
          const pupilRadius = Math.max(1.5, Math.round(cellSize * 0.09));
          const perp = { x: -vy, y: vx };

          // ─── CENÁRIO DE GAME OVER: CARA DE DERROTA COMPLETA (BATIDA) ─────
          if (s.phase === 'gameOver') {
            const hitTime = s.gameOverTime > 0 ? now - s.gameOverTime : 0;

            // 1. Boca de derrota: aberta em choque com a língua caída para o lado ("bleh")
            const mouthX = hx + vx * (eyeFwd + SNAKE_W2 * 0.28);
            const mouthY = hy + vy * (eyeFwd + SNAKE_W2 * 0.28);

            // Boquinha aberta (arco escuro triste)
            ctx.save();
            ctx.fillStyle = '#1c1917';
            ctx.beginPath();
            ctx.arc(mouthX, mouthY, eyeRadius * 0.9, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Língua desmaiada caída para o lado (flácida)
            const tongueHangX = mouthX + perp.x * (cellSize * 0.28) + vx * (cellSize * 0.15);
            const tongueHangY = mouthY + perp.y * (cellSize * 0.28) + vy * (cellSize * 0.15);
            ctx.beginPath();
            ctx.moveTo(mouthX, mouthY);
            ctx.quadraticCurveTo(mouthX + perp.x * (cellSize * 0.18), mouthY + perp.y * (cellSize * 0.18), tongueHangX, tongueHangY);
            ctx.strokeStyle = '#ff2d55';
            ctx.lineWidth = Math.max(2, cellSize * 0.09);
            ctx.lineCap = 'round';
            ctx.stroke();
            // Pontinha bífida mole
            ctx.beginPath();
            ctx.moveTo(tongueHangX, tongueHangY);
            ctx.lineTo(tongueHangX + perp.x * 3 + vx * 2, tongueHangY + perp.y * 3 + vy * 2);
            ctx.moveTo(tongueHangX, tongueHangY);
            ctx.lineTo(tongueHangX + perp.x * 2 - vx * 3, tongueHangY + perp.y * 2 - vy * 3);
            ctx.stroke();
            ctx.restore();

            // 2. Olhos de Nocaute: Um em Espiral girando contínua, o outro em "X" dolorido
            // Olho esquerdo (Espiral de tontura girando continuamente)
            const e1x = hx + vx * eyeFwd + perp.x * eyeOffset;
            const e1y = hy + vy * eyeFwd + perp.y * eyeOffset;
            ctx.save();
            ctx.beginPath();
            ctx.arc(e1x, e1y, eyeRadius * 1.15, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Espiral de tontura girando
            ctx.beginPath();
            const spiralAngle = now * 0.007;
            const maxR = eyeRadius * 0.85;
            for (let a = 0; a < Math.PI * 4; a += 0.25) {
              const r = (a / (Math.PI * 4)) * maxR;
              const sx = e1x + Math.cos(a + spiralAngle) * r;
              const sy = e1y + Math.sin(a + spiralAngle) * r;
              if (a === 0) ctx.moveTo(sx, sy);
              else ctx.lineTo(sx, sy);
            }
            ctx.strokeStyle = '#1e1b4b';
            ctx.lineWidth = Math.max(1.5, cellSize * 0.06);
            ctx.stroke();
            ctx.restore();

            // Olho direito (X estilizado com pálpebra dolorida)
            const e2x = hx + vx * eyeFwd - perp.x * eyeOffset;
            const e2y = hy + vy * eyeFwd - perp.y * eyeOffset;
            ctx.save();
            ctx.beginPath();
            ctx.arc(e2x, e2y, eyeRadius * 1.15, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // "X" de impacto no olho
            const xr = eyeRadius * 0.65;
            ctx.strokeStyle = '#dc2626';
            ctx.lineWidth = Math.max(2, cellSize * 0.08);
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(e2x - xr, e2y - xr); ctx.lineTo(e2x + xr, e2y + xr);
            ctx.moveTo(e2x + xr, e2y - xr); ctx.lineTo(e2x - xr, e2y + xr);
            ctx.stroke();
            ctx.restore();

            // Sobrancelhas de sofrimento/derrota caídas em ângulo (\ /)
            ctx.save();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1.5, cellSize * 0.07);
            ctx.lineCap = 'round';
            // Sobrancelha esquerda
            ctx.beginPath();
            ctx.moveTo(e1x - perp.x * (eyeRadius * 0.9) - vx * (eyeRadius * 0.4), e1y - perp.y * (eyeRadius * 0.9) - vy * (eyeRadius * 0.4));
            ctx.lineTo(e1x + perp.x * (eyeRadius * 0.7) + vx * (eyeRadius * 0.5), e1y + perp.y * (eyeRadius * 0.7) + vy * (eyeRadius * 0.5));
            ctx.stroke();
            // Sobrancelha direita
            ctx.beginPath();
            ctx.moveTo(e2x + perp.x * (eyeRadius * 0.9) - vx * (eyeRadius * 0.4), e2y + perp.y * (eyeRadius * 0.9) - vy * (eyeRadius * 0.4));
            ctx.lineTo(e2x - perp.x * (eyeRadius * 0.7) + vx * (eyeRadius * 0.5), e2y - perp.y * (eyeRadius * 0.7) + vy * (eyeRadius * 0.5));
            ctx.stroke();
            ctx.restore();

            // 3. Gotinha de Lágrima / Suor animada (Cartoon Sweat / Tear drop)
            const tearX = e2x - perp.x * (eyeRadius * 1.2);
            const tearY = e2y - perp.y * (eyeRadius * 1.2) + Math.sin(now * 0.008) * 1.5;
            ctx.save();
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(tearX, tearY, eyeRadius * 0.45, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(tearX - eyeRadius * 0.4, tearY);
            ctx.lineTo(tearX, tearY - eyeRadius * 0.9);
            ctx.lineTo(tearX + eyeRadius * 0.4, tearY);
            ctx.closePath();
            ctx.fill();
            // Brilho na lágrima
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(tearX - eyeRadius * 0.15, tearY - eyeRadius * 0.15, eyeRadius * 0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // 4. Estrelinhas de Atordoamento Orbitando ("Dizzy Stars")
            // 3 estrelas brilhantes girando em órbita elíptica em torno da cabeça
            const numStars = 3;
            const orbitRx = cellSize * 0.75;
            const orbitRy = cellSize * 0.38;
            for (let st = 0; st < numStars; st++) {
              const starAngle = now * 0.005 + (st * Math.PI * 2) / numStars;
              const starX = hx + Math.cos(starAngle) * orbitRx;
              const starY = hy - cellSize * 0.45 + Math.sin(starAngle) * orbitRy;

              ctx.save();
              ctx.translate(starX, starY);
              ctx.rotate(now * 0.008 + st);
              const starSize = Math.max(3.5, cellSize * 0.16);

              // Desenha estrela de 4 pontas fofa dourada
              ctx.fillStyle = '#facc15';
              ctx.beginPath();
              for (let pt = 0; pt < 8; pt++) {
                const a = (pt * Math.PI) / 4;
                const r = pt % 2 === 0 ? starSize : starSize * 0.38;
                const px = Math.cos(a) * r;
                const py = Math.sin(a) * r;
                if (pt === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
              }
              ctx.closePath();
              ctx.fill();
              ctx.strokeStyle = '#ca8a04';
              ctx.lineWidth = 1;
              ctx.stroke();

              // Ponto brilhante central
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(0, 0, starSize * 0.28, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }

          } else {
            // ─── CENÁRIO NORMAL / JOGANDO: CABEÇA VIVA, PISCAR E LÍNGUA ─────
            // Atualizar estado de piscar
            if (now >= blinkTime.current) {
              blinkUntil.current = now + 120;
              blinkTime.current = now + 2500 + Math.random() * 3500;
            }
            const isBlinking = now < blinkUntil.current;

            // Atualizar estado de língua
            if (now >= tongueTime.current) {
              tongueUntil.current = now + 300;
              tongueTime.current = now + 1500 + Math.random() * 3000;
            }
            const showTongue = now < tongueUntil.current && s.phase === 'playing' && !s.isWaiting;

            // Desenhar língua bífida
            if (showTongue) {
              const tongueLen = cellSize * 0.45;
              const forkLen = cellSize * 0.18;
              const tx = hx + vx * (eyeFwd + SNAKE_W2 * 0.5);
              const ty = hy + vy * (eyeFwd + SNAKE_W2 * 0.5);
              ctx.save();
              ctx.strokeStyle = '#ff2d55';
              ctx.lineWidth = Math.max(1.5, cellSize * 0.07);
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(tx, ty);
              const mx = tx + vx * tongueLen * 0.6;
              const my = ty + vy * tongueLen * 0.6;
              ctx.lineTo(mx, my);
              // Fork esquerdo
              ctx.moveTo(mx, my);
              ctx.lineTo(mx + vx * forkLen - vy * forkLen * 0.5, my + vy * forkLen + vx * forkLen * 0.5);
              // Fork direito
              ctx.moveTo(mx, my);
              ctx.lineTo(mx + vx * forkLen + vy * forkLen * 0.5, my + vy * forkLen - vx * forkLen * 0.5);
              ctx.stroke();
              ctx.restore();
            }

            if (isBlinking) {
              // Linha fina fechada ao piscar
              for (const side of [-1, 1]) {
                const ex = hx + vx * eyeFwd + perp.x * eyeOffset * side;
                const ey = hy + vy * eyeFwd + perp.y * eyeOffset * side;
                ctx.save();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = Math.max(1.8, eyeRadius * 0.55);
                ctx.lineCap = 'round';
                const r2 = eyeRadius * 0.75;
                ctx.beginPath();
                ctx.moveTo(ex - r2, ey); ctx.lineTo(ex + r2, ey);
                ctx.stroke();
                ctx.restore();
              }
            } else {
              // Olhos normais com reflexo expressivo
              for (const side of [-1, 1]) {
                const ex = hx + vx * eyeFwd + perp.x * eyeOffset * side;
                const ey = hy + vy * eyeFwd + perp.y * eyeOffset * side;
                // Globo ocular branco com contorno fino escuro
                ctx.beginPath();
                ctx.arc(ex, ey, eyeRadius, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Pupila olhando na direção do movimento
                const pupX = ex + vx * (eyeRadius * 0.35);
                const pupY = ey + vy * (eyeRadius * 0.35);
                ctx.beginPath();
                ctx.arc(pupX, pupY, pupilRadius, 0, Math.PI * 2);
                ctx.fillStyle = '#0f172a';
                ctx.fill();

                // Ponto de brilho de luz na pupila (olhar vivo)
                ctx.beginPath();
                ctx.arc(pupX - 1, pupY - 1, Math.max(1, pupilRadius * 0.4), 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
              }
            }
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

        // [novo] MELHORIA 5: Rings expandindo ao comer
        for (let i = (s.rings as Ring[]).length - 1; i >= 0; i--) {
          const ring = (s.rings as Ring[])[i];
          ring.r += cellSize * 0.04;
          ring.alpha -= 0.035;
          if (ring.alpha <= 0 || ring.r > cellSize * 1.5) { (s.rings as Ring[]).splice(i, 1); continue; }
          ctx.save();
          ctx.globalAlpha = ring.alpha;
          ctx.beginPath();
          ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
          ctx.strokeStyle = theme.food;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        }
      }; // fim drawGameContent

      // [novo] MELHORIA 4: Birth effect — escala e fade ao iniciar partida
      const sinceStart = s.gameStartTime > 0 ? time - s.gameStartTime : 999999;
      const BIRTH_DUR = 350;
      if (s.phase === 'playing' && sinceStart < BIRTH_DUR) {
        const t = sinceStart / BIRTH_DUR;
        const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
        const sc = 0.7 + 0.3 * ease;
        const alpha = ease;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(CANVAS_W / 2, CANVAS_H / 2);
        ctx.scale(sc, sc);
        ctx.translate(-CANVAS_W / 2, -CANVAS_H / 2);
        drawGameContent();
        ctx.restore();
      } else {
        drawGameContent();
      }

      // ── [novo] Fechar shake translate ────────────────────────────────────
      if (shakeActive) {
        ctx.restore();
      }

      // ── [novo] MELHORIA 7: Flash vermelho FORA do shake ──────────────────
      const FLASH_DUR = 250;
      if (s.phase === 'gameOver' && sinceGameOver < FLASH_DUR) {
        const flashAlpha = 0.35 * (1 - sinceGameOver / FLASH_DUR);
        ctx.save();
        ctx.globalAlpha = flashAlpha;
        ctx.fillStyle = '#ff2d55';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
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
          {/* [novo] MELHORIA 9: Bump de escala ao pontuar */}
          <span
            className={`text-xl sm:text-2xl font-bold leading-none inline-block transition-transform duration-200 ${scoreBump ? 'scale-125' : 'scale-100'}`}
          >
            {score}
          </span>
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
          {/* [novo] MELHORIA 9: Bump de escala + glow ao bater recorde */}
          <span
            className={`text-xl sm:text-2xl font-bold leading-none inline-block transition-transform duration-200 ${highScoreBump ? 'scale-125' : 'scale-100'}`}
            style={{
              color: theme.borderNeon,
              filter: highScoreBump ? `drop-shadow(0 0 6px ${theme.borderNeon})` : 'none'
            }}
          >
            {highScore}
          </span>
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

        {/* ── [novo] MELHORIA 8: Overlay Menu com animações de entrada ── */}
        {phase === 'menu' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-3" style={{ background: theme.overlayBg }}>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2 tracking-tighter animate-in fade-in slide-in-from-top-4 duration-500"
                style={{ color: theme.textPrimary, textShadow: `0 0 10px ${theme.borderGlow}` }}>
              Snake
            </h1>
            <p className="text-xs sm:text-sm opacity-80 mb-3 sm:mb-6 max-w-[220px] text-center animate-in fade-in duration-500 delay-150"
               style={{ color: theme.textPrimary }}>
              Coma, cresça e faça a maior pontuação!
            </p>
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
              <SmallBtn bg={theme.btnPrimary} onClick={() => startGame(grid)}>JOGAR</SmallBtn>
            </div>
          </div>
        )}

        {/* ── [novo] MELHORIA 8: Overlay Paused com animações de entrada ── */}
        {phase === 'paused' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-3 animate-in fade-in duration-200"
               style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}>
            <h2 className="text-xl sm:text-2xl font-bold tracking-widest mb-3 sm:mb-6 animate-in fade-in slide-in-from-top-4 duration-300"
                style={{ color: theme.textPrimary }}>PAUSADO</h2>
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-150">
              <SmallBtn bg={theme.btnPrimary} onClick={pauseToggle}>Continuar</SmallBtn>
            </div>
          </div>
        )}

        {/* ── [novo] MELHORIA 8: Overlay Game Over com animações de entrada ── */}
        {phase === 'gameOver' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-3"
               style={{ background: theme.overlayBg }}>
            <div className="text-3xl sm:text-4xl md:text-5xl mb-1 sm:mb-2 animate-in zoom-in-95 duration-300">💀</div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 animate-in fade-in duration-300 delay-150"
                style={{ color: theme.textPrimary }}>GAME OVER</h2>
            <div className="flex gap-4 sm:gap-6 mb-3 sm:mb-6 text-center animate-in fade-in duration-300 delay-300"
                 style={{ color: theme.textPrimary }}>
              <div>
                <div className="text-[10px] sm:text-xs uppercase opacity-70">Pontuação</div>
                <div className="text-lg sm:text-xl font-bold">{score}</div>
              </div>
              <div>
                <div className="text-[10px] sm:text-xs uppercase opacity-70">Recorde</div>
                <div className="text-lg sm:text-xl font-bold" style={{ color: theme.borderNeon }}>{highScore}</div>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:gap-2.5 w-40 sm:w-44 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
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
