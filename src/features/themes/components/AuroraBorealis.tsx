import React, { useState, useEffect, useMemo } from 'react';

// ─── Aurora Borealis ──────────────────────────────────────────────────────────
const AURORA_RAY_PALETTE = [
  { r: 0,   g: 255, b: 180 },
  { r: 0,   g: 220, b: 255 },
  { r: 168, g: 85,  b: 247 },
  { r: 0,   g: 255, b: 150 },
  { r: 100, g: 200, b: 255 },
  { r: 220, g: 80,  b: 255 },
];

function generateCurtains(count: number) {
  return Array.from({ length: count }, (_, i) => { 
    const isAlt = i % 2 === 0;
    return {
      id: i,
      left: `${(i - 1) * 20}%`, 
      width: `${30 + Math.random() * 20}%`, 
      height: `${50 + Math.random() * 40}%`,
      background: isAlt
        ? `linear-gradient(to bottom, rgba(0,255,200,${0.25 + Math.random() * 0.15}) 0%, rgba(34,211,238,${0.1 + Math.random() * 0.1}) 40%, transparent 100%)`
        : `linear-gradient(to bottom, rgba(168,85,247,${0.2 + Math.random() * 0.15}) 0%, rgba(220,80,255,${0.1 + Math.random() * 0.1}) 40%, transparent 100%)`,
      filter: `blur(${15 + Math.random() * 15}px)`, 
      duration: `${25 + Math.random() * 15}s`, 
      delay: `-${Math.random() * 20}s`,
      opacity: 0.6 + Math.random() * 0.4,
    };
  });
}

function generateRays(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const { r, g, b } = AURORA_RAY_PALETTE[i % AURORA_RAY_PALETTE.length];
    const op = parseFloat((0.55 + Math.random() * 0.3).toFixed(2));
    const bl = parseFloat((4 + Math.random() * 5).toFixed(1));
    return {
      id: i,
      left: `${8 + i * 15 + Math.random() * 5}%`,
      width: `${0.8 + Math.random() * 1.5}%`,
      height: `${25 + Math.random() * 45}%`,
      background: `linear-gradient(to top, rgba(${r},${g},${b},${op}) 0%, rgba(${r},${g},${b},${(op * 0.35).toFixed(2)}) 55%, transparent 100%)`,
      filter: `blur(${bl}px)`,
      duration: `${5 + Math.random() * 7}s`,
      delay: `${Math.random() * 12}s`,
      opacity: op,
    };
  });
}

export function AuroraBorealis() {
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const handleVisibility = () => {
      setIsPaused(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const { curtains, rays } = useMemo(() => {
    const cores = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency ?? 4) : 4;
    const densityMultiplier = cores <= 2 ? 0.4 : cores <= 4 ? 0.65 : 1.0;
    const curtainCount = Math.max(3, Math.round(6 * densityMultiplier));
    const rayCount = Math.max(3, Math.round(6 * densityMultiplier));
    return {
      curtains: generateCurtains(curtainCount),
      rays: generateRays(rayCount),
    };
  }, []);

  return (
    <div
      className="aurora-bg"
      style={isPaused ? { animationPlayState: 'paused' } : undefined}
    >
      <div
        className="aurora-glow-base"
        style={isPaused ? { animationPlayState: 'paused' } : undefined}
      />

      {curtains.map((c) => (
        <div
          key={c.id}
          className="aurora-curtain"
          style={{
            left: c.left,
            width: c.width,
            height: c.height,
            background: c.background,
            filter: c.filter,
            animationDuration: c.duration,
            animationDelay: c.delay,
            '--aurora-opacity': c.opacity,
            ...(isPaused ? { animationPlayState: 'paused' } : {}),
          } as React.CSSProperties}
        />
      ))}

      {rays.map((r) => (
        <div
          key={r.id}
          className="aurora-ray"
          style={{
            left: r.left,
            width: r.width,
            height: r.height,
            background: r.background,
            filter: r.filter,
            animationDuration: r.duration,
            animationDelay: r.delay,
            '--aurora-opacity': r.opacity,
            ...(isPaused ? { animationPlayState: 'paused' } : {}),
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
