import { useRef } from 'react';
import { Card } from '../../shared/ui/Card';
import { Spinner } from '../../shared/ui/Spinner';
import { useStarMapConfig } from './starmap/useStarMapConfig';
import { useStarMapCanvas } from './starmap/useStarMapCanvas';
import { StarMapOverlays } from './starmap/StarMapOverlays';
import { StarMapInfoBar } from './starmap/StarMapInfoBar';
import type { StarMapConfig } from './starmap/types';

export type { StarMapConfig };

export function StarMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { mapConfig, loading } = useStarMapConfig();

  useStarMapCanvas(canvasRef, mapConfig, loading);

  if (loading) {
    return (
      <Card className="w-full max-w-5xl mx-auto overflow-hidden bg-[#02040A] border-white/5 min-h-[520px] flex items-center justify-center">
        <Spinner />
      </Card>
    );
  }

  return (
    <Card className="w-full h-full overflow-hidden bg-[#02040A] shadow-2xl border-0 rounded-none flex flex-col font-sans">
      {/* ── CANVAS ZONE ── */}
      <div className="relative w-full">
        <canvas ref={canvasRef} className="w-full block" />
        <StarMapOverlays romanticQuote={mapConfig?.romanticQuote} />
      </div>

      {/* ── INFO BAR (Desktop) / GRID (Mobile) ── */}
      {mapConfig && <StarMapInfoBar mapConfig={mapConfig} />}
    </Card>
  );
}
