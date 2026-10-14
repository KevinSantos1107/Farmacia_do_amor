import { useEffect, type RefObject } from 'react';
import type { StarMapConfig, BackgroundStar, RenderedConstellation } from './types';
import { generateBackgroundStars, placeConstellations } from './starMapPlacer';
import {
  drawBackground,
  drawMilkyWay,
  drawBackgroundStars,
  drawConstellations,
  drawRoute,
  drawEncounterPoint,
} from './starMapRenderer';

interface StarMapAnimationTimings {
  STARS_IN: number;
  CONSTELLATIONS_IN: number;
  ROUTE_IN: number;
  ENCOUNTER_IN: number;
  DELAY_STARS: number;
  DELAY_CONST: number;
  DELAY_ROUTE: number;
  DELAY_ENCOUNTER: number;
}

const T: StarMapAnimationTimings = {
  STARS_IN: 2000,
  CONSTELLATIONS_IN: 2000,
  ROUTE_IN: 3000,
  ENCOUNTER_IN: 1000,
  DELAY_STARS: 0,
  DELAY_CONST: 1200,
  DELAY_ROUTE: 3000,
  DELAY_ENCOUNTER: 5500,
};

export function useStarMapCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  mapConfig: StarMapConfig | null,
  loading: boolean,
) {
  useEffect(() => {
    if (loading || !mapConfig) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    let startTime: number | null = null;

    let bgStars: BackgroundStar[] = [];
    let rendered: RenderedConstellation[] = [];

    const setup = (w: number, h: number) => {
      bgStars = generateBackgroundStars(w, h);
      rendered = placeConstellations(w, h, mapConfig?.constellations);
    };

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      const w = parent.clientWidth;
      const h = window.innerWidth < 768 ? 750 : Math.max(600, window.innerHeight - 130);

      // Prevent unnecessary re-renders on mobile scroll (URL bar hiding/showing fires resize)
      if (canvas.width === w * dpr && canvas.height === h * dpr) {
        return;
      }

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);
      setup(w, h);
    };

    const draw = (ts: number) => {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;

      const w = parseFloat(canvas.style.width);
      const h = parseFloat(canvas.style.height);

      ctx.clearRect(0, 0, w, h);

      drawBackground(ctx, w, h);
      drawMilkyWay(ctx, w, h);

      const pStar = Math.min(Math.max((elapsed - T.DELAY_STARS) / T.STARS_IN, 0), 1);
      const pConst = Math.min(Math.max((elapsed - T.DELAY_CONST) / T.CONSTELLATIONS_IN, 0), 1);
      const pRoute = Math.min(Math.max((elapsed - T.DELAY_ROUTE) / T.ROUTE_IN, 0), 1);
      const pEnc = Math.min(Math.max((elapsed - T.DELAY_ENCOUNTER) / T.ENCOUNTER_IN, 0), 1);

      drawBackgroundStars(ctx, bgStars, pStar);
      drawConstellations(ctx, rendered, pConst, elapsed);
      drawRoute(ctx, w, h, pRoute);
      drawEncounterPoint(ctx, w, h, pEnc, elapsed);

      rafId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    rafId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafId);
    };
  }, [loading, mapConfig, canvasRef]);
}
