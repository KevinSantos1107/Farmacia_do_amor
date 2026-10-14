import type { BackgroundStar, RenderedConstellation } from './types';
import { bezier3 } from './starMapMath';

export function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const bg = ctx.createRadialGradient(w / 2, h * 0.4, 0, w / 2, h / 2, w * 0.8);
  bg.addColorStop(0, '#0c1833');
  bg.addColorStop(0.5, '#060c1a');
  bg.addColorStop(1, '#020509');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
}

export function drawMilkyWay(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const mw = ctx.createLinearGradient(w * 0.15, 0, w * 0.85, h);
  mw.addColorStop(0, 'rgba(120,160,220,0)');
  mw.addColorStop(0.3, 'rgba(120,160,220,0.04)');
  mw.addColorStop(0.5, 'rgba(150,185,235,0.06)');
  mw.addColorStop(0.7, 'rgba(120,160,220,0.04)');
  mw.addColorStop(1, 'rgba(120,160,220,0)');
  ctx.fillStyle = mw;
  ctx.fillRect(0, 0, w, h);
}

export function drawBackgroundStars(
  ctx: CanvasRenderingContext2D,
  bgStars: BackgroundStar[],
  pStar: number,
) {
  if (pStar <= 0) return;
  bgStars.forEach((s) => {
    s.phase += s.speed;
    const a = s.a + Math.sin(s.phase) * 0.12;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${a * pStar})`;
    ctx.fill();
  });
}

export function drawConstellations(
  ctx: CanvasRenderingContext2D,
  rendered: RenderedConstellation[],
  pConst: number,
  elapsed: number,
) {
  if (pConst <= 0) return;

  rendered.forEach((c) => {
    if (c.stars.length === 0) return;

    // Draw connecting lines
    ctx.save();
    ctx.strokeStyle = `rgba(223,206,168,${0.45 * pConst})`;
    ctx.lineWidth = 0.8;
    c.lines.forEach(([i, j]) => {
      const a = c.stars[i];
      const b = c.stars[j];
      if (!a || !b) return;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });
    ctx.restore();

    // Draw stars
    c.stars.forEach((s, idx) => {
      const twinkle = 1 + Math.sin(elapsed * 0.0015 + (s.x * 0.01 + s.y * 0.01 + idx)) * 0.3;

      // Glow
      const glowR = s.r * 5 * twinkle;
      const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR);
      glow.addColorStop(0, `rgba(223,206,168,${0.35 * pConst * twinkle})`);
      glow.addColorStop(1, 'rgba(223,206,168,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(s.x, s.y, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * (0.8 + 0.2 * twinkle), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.95 * pConst})`;
      ctx.fill();
    });

    // Draw label below the lowest star
    if (pConst > 0.6) {
      const bottomY = Math.max(...c.stars.map((s) => s.y));
      const centerX = c.cx;
      const alpha = (pConst - 0.6) / 0.4;
      ctx.save();
      ctx.font = '700 10px sans-serif';
      ctx.fillStyle = `rgba(223,206,168,${0.75 * alpha})`;
      ctx.textAlign = 'center';
      ctx.letterSpacing = '2px';
      ctx.fillText(c.name, centerX, bottomY + 18);
      ctx.restore();
    }
  });
}

export function drawRoute(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pRoute: number,
) {
  if (pRoute <= 0) return;

  const encX = w * 0.50;
  const encY = h * 0.52;
  const isMobile = w < 768;
  const startX = isMobile ? w * 0.20 : w * 0.08;
  const startY = isMobile ? h * 0.78 : h * 0.88;
  const endX = isMobile ? w * 0.80 : w * 0.87;
  const endY = isMobile ? h * 0.28 : h * 0.18;
  const cp1x = isMobile ? encX - w * 0.25 : encX - w * 0.12;
  const cp1y = isMobile ? encY + h * 0.15 : encY + h * 0.12;
  const cp2x = isMobile ? encX + w * 0.25 : encX + w * 0.10;
  const cp2y = isMobile ? encY - h * 0.15 : encY - h * 0.12;

  const STEPS = 200;
  const drawTo = Math.floor(STEPS * pRoute);

  ctx.save();
  ctx.strokeStyle = `rgba(223,206,168,${0.65 * pRoute})`;
  ctx.lineWidth = 1.2;
  ctx.shadowColor = `rgba(223,206,168,0.4)`;
  ctx.shadowBlur = 4;
  ctx.beginPath();

  for (let i = 0; i <= drawTo; i++) {
    const t = i / STEPS;
    let x: number;
    let y: number;
    if (t < 0.5) {
      const t1 = t * 2;
      x = bezier3(t1, startX, cp1x, encX);
      y = bezier3(t1, startY, cp1y, encY);
    } else {
      const t2 = (t - 0.5) * 2;
      x = bezier3(t2, encX, cp2x, endX);
      y = bezier3(t2, encY, cp2y, endY);
    }
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  ctx.restore();

  // Dot at start + label ANTES
  if (pRoute > 0.04) {
    ctx.beginPath();
    ctx.arc(startX, startY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(223,206,168,${0.8 * pRoute})`;
    ctx.fill();
    ctx.font = '700 9px sans-serif';
    ctx.fillStyle = `rgba(223,206,168,${0.6 * pRoute})`;
    ctx.textAlign = 'center';
    ctx.letterSpacing = '2px';
    ctx.fillText('ANTES', startX + 16, startY + 16);
  }

  // Arrow tip + DEPOIS label
  if (pRoute > 0.92) {
    const alpha = (pRoute - 0.92) / 0.08;
    ctx.fillStyle = `rgba(223,206,168,${0.8 * alpha})`;
    ctx.save();
    const tEnd = (STEPS - 1) / STEPS;
    const t2Pre = (tEnd - 0.5) * 2;
    const px = bezier3(t2Pre, encX, cp2x, endX);
    const py = bezier3(t2Pre, encY, cp2y, endY);
    const angle = Math.atan2(endY - py, endX - px);
    ctx.translate(endX, endY);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-8, 3.5);
    ctx.lineTo(-8, -3.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.font = '700 9px sans-serif';
    ctx.fillStyle = `rgba(223,206,168,${0.6 * alpha})`;
    ctx.textAlign = 'center';
    ctx.letterSpacing = '2px';
    ctx.fillText('DEPOIS', endX + 16, endY - 12);
  }
}

export function drawEncounterPoint(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pEnc: number,
  elapsed: number,
) {
  if (pEnc <= 0) return;

  const encX = w * 0.50;
  const encY = h * 0.52;
  const pulse = 1 + Math.sin(elapsed * 0.0025) * 0.08;

  // Outer rings
  [40, 22].forEach((r, idx) => {
    ctx.beginPath();
    ctx.arc(encX, encY, r * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(223,206,168,${(0.18 - idx * 0.06) * pEnc})`;
    ctx.lineWidth = 0.7;
    ctx.stroke();
  });

  // Glow halo
  const halo = ctx.createRadialGradient(encX, encY, 0, encX, encY, 50 * pulse);
  halo.addColorStop(0, `rgba(223,206,168,${0.35 * pEnc})`);
  halo.addColorStop(0.4, `rgba(223,206,168,${0.12 * pEnc})`);
  halo.addColorStop(1, 'rgba(223,206,168,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(encX, encY, 50 * pulse, 0, Math.PI * 2);
  ctx.fill();

  // Cross hair lines
  ctx.strokeStyle = `rgba(223,206,168,${0.45 * pEnc})`;
  ctx.lineWidth = 0.8;
  const lineLen = 30;
  ctx.beginPath();
  ctx.moveTo(encX - lineLen, encY);
  ctx.lineTo(encX + lineLen, encY);
  ctx.moveTo(encX, encY - lineLen);
  ctx.lineTo(encX, encY + lineLen);
  ctx.stroke();

  // Core dot (bright white)
  const coreGlow = ctx.createRadialGradient(encX, encY, 0, encX, encY, 8);
  coreGlow.addColorStop(0, `rgba(255,255,255,${pEnc})`);
  coreGlow.addColorStop(0.4, `rgba(255,245,220,${0.8 * pEnc})`);
  coreGlow.addColorStop(1, 'rgba(223,206,168,0)');
  ctx.fillStyle = coreGlow;
  ctx.beginPath();
  ctx.arc(encX, encY, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(encX, encY, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${pEnc})`;
  ctx.fill();

  // Label O ENCONTRO
  if (pEnc > 0.5) {
    const la = (pEnc - 0.5) / 0.5;
    ctx.font = '700 10px sans-serif';
    ctx.fillStyle = `rgba(223,206,168,${0.85 * la})`;
    ctx.textAlign = 'center';
    ctx.letterSpacing = '2px';
    ctx.fillText('O ENCONTRO', encX, encY - 52);
  }
}
