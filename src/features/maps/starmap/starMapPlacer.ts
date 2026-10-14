import type { RenderedConstellation, BackgroundStar } from './types';
import { lookupConstellation } from './constellationAliases';
import { bezier3, rectIntersect } from './starMapMath';

export function generateBackgroundStars(w: number, h: number): BackgroundStar[] {
  const bgStars: BackgroundStar[] = [];
  const n = w < 600 ? 300 : 600;
  for (let i = 0; i < n; i++) {
    bgStars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 0.8 + 0.1,
      a: Math.random() * 0.45 + 0.05,
      speed: Math.random() * 0.015 + 0.003,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return bgStars;
}

export function placeConstellations(
  w: number,
  h: number,
  constellations: string[] = [],
): RenderedConstellation[] {
  const rendered: RenderedConstellation[] = [];
  const encX = w * 0.50;
  const encY = h * 0.52;

  // Calculate curve points for collision detection
  const isMobile = w < 768;
  const startX = isMobile ? w * 0.20 : w * 0.08;
  const startY = isMobile ? h * 0.78 : h * 0.88;
  const endX = isMobile ? w * 0.80 : w * 0.87;
  const endY = isMobile ? h * 0.28 : h * 0.18;
  const cp1x = isMobile ? encX - w * 0.25 : encX - w * 0.12;
  const cp1y = isMobile ? encY + h * 0.15 : encY + h * 0.12;
  const cp2x = isMobile ? encX + w * 0.25 : encX + w * 0.10;
  const cp2y = isMobile ? encY - h * 0.15 : encY - h * 0.12;

  const curvePts: { x: number; y: number }[] = [];
  for (let t = 0; t <= 1; t += 0.02) {
    curvePts.push({ x: bezier3(t, startX, cp1x, encX), y: bezier3(t, startY, cp1y, encY) });
    curvePts.push({ x: bezier3(t, encX, cp2x, endX), y: bezier3(t, encY, cp2y, endY) });
  }

  // We only want to draw up to 5 constellations to keep it elegant
  const constellationsToDraw = constellations.slice(0, 5);

  constellationsToDraw.forEach((name) => {
    const shape = lookupConstellation(name);
    if (!shape) return;

    // Base scale for the constellation
    const baseW = Math.min(w, 1000);
    // Reduced mobile scale so 5 can actually fit on a narrow screen
    const scale = baseW * (isMobile ? 0.16 : 0.14) * (0.8 + Math.random() * 0.4);

    // Approximate radius of the constellation bounding box
    const reqRadius = scale * 0.6 + 20;

    let bestPos: { cx: number; cy: number } | null = null;
    let bestScore = -Infinity;

    const constSize = reqRadius * 2;

    const titleBoxW = isMobile ? 320 : 500;
    const titleBoxH = isMobile ? 180 : 150;
    const titleBoxX = (w - titleBoxW) / 2;

    const quoteBoxW = isMobile ? 360 : 650;
    const quoteBoxH = isMobile ? 130 : 110;
    const quoteBoxX = (w - quoteBoxW) / 2;
    const quoteBoxY = h - quoteBoxH;

    // Try 3 passes with decreasing strictness to guarantee it finds a spot
    for (let pass = 0; pass < 3; pass++) {
      const padConst = pass === 0 ? (isMobile ? 10 : 20) : (pass === 1 ? 0 : -20);
      const padCurve = pass === 0 ? (isMobile ? 10 : 20) : (pass === 1 ? 0 : -15);
      const padCenter = pass === 0 ? (isMobile ? w * 0.25 : w * 0.15) : (isMobile ? w * 0.15 : w * 0.10);

      for (let attempt = 0; attempt < 800; attempt++) {
        const cx = Math.random() * w;
        const cy = Math.random() * h;
        const constLeft = cx - reqRadius;
        const constTop = cy - reqRadius;

        // 1. BOUNDARY (HARD)
        if (cx < reqRadius || cx > w - reqRadius || cy < reqRadius || cy > h - (reqRadius + 20)) continue;

        // 2. TEXT BOXES (HARD)
        if (rectIntersect(titleBoxX, 0, titleBoxW, titleBoxH, constLeft, constTop, constSize, constSize)) continue;
        if (rectIntersect(quoteBoxX, quoteBoxY, quoteBoxW, quoteBoxH, constLeft, constTop, constSize, constSize)) continue;

        // 3. CENTER (RELAXABLE)
        const distToCenter = Math.hypot(cx - encX, cy - encY);
        if (distToCenter < padCenter) continue;

        // 4. CURVE (RELAXABLE)
        let distToCurve = Infinity;
        for (const pt of curvePts) {
          const d = Math.hypot(cx - pt.x, cy - pt.y);
          if (d < distToCurve) distToCurve = d;
        }
        if (distToCurve < reqRadius + padCurve) continue;

        // 5. OTHER CONSTELLATIONS (RELAXABLE)
        let distToOthers = Infinity;
        for (const other of rendered) {
          const d = Math.hypot(cx - other.cx, cy - other.cy);
          if (d < distToOthers) distToOthers = d - (other.reqRadius ?? 0);
        }
        if (distToOthers < reqRadius + padConst) continue;

        // Score position
        const score = Math.min(distToCurve, distToOthers !== Infinity ? distToOthers : w);
        if (score > bestScore) {
          bestScore = score;
          bestPos = { cx, cy };
        }
      }

      if (bestPos) break; // found a spot in this pass!
    }

    if (bestPos) {
      const finalCx = bestPos.cx;
      const finalCy = bestPos.cy;

      const stars = shape.stars.map((s) => ({
        x: finalCx + s.x * scale * 0.5,
        y: finalCy + s.y * scale * 0.5,
        r: s.mag === 3 ? 2.8 : s.mag === 2 ? 1.8 : 0.9,
      }));

      rendered.push({
        cx: finalCx,
        cy: finalCy,
        scale,
        name: name.toUpperCase(),
        stars,
        lines: shape.lines,
        shape,
        reqRadius,
      });
    }
  });

  return rendered;
}
