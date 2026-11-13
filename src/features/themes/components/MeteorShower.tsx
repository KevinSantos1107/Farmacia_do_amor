import React, { useState, useEffect, useMemo } from 'react';

// ─── Meteor Shower ──────────────────────────────────────────────────────────

/** 4 tipos de meteoro inspirados na referência visual */
const METEOR_TYPES = [
  { color: 'rgba(255, 90,  30, 0.9)',   tail: 'rgba(255, 50,  0,  0.15)', glow: 'rgba(255, 100, 20, 0.6)'  }, // 🔴 Fogo
  { color: 'rgba(255, 165,  0, 0.85)',  tail: 'rgba(255, 120,  0, 0.12)', glow: 'rgba(255, 180, 30, 0.5)'  }, // 🟠 Brasa
  { color: 'rgba(0,   230, 255, 0.9)',  tail: 'rgba(0,   180, 255, 0.15)', glow: 'rgba(50, 200, 255, 0.6)' }, // 🩵 Gelo
  { color: 'rgba(255, 255, 255, 0.95)', tail: 'rgba(200, 220, 255, 0.12)', glow: 'rgba(200, 220, 255, 0.5)' }, // ⭐ Estelar
];

type MeteorLayer = 'large' | 'mid' | 'small';

const BASE_LAYER_CONFIG: Record<MeteorLayer, {
  count: number; len: string; thick: string; head: number;
  speedMin: number; speedMax: number;
}> = {
  large: { count: 8,  len: '220px', thick: '3px', head: 11, speedMin: 4,  speedMax: 8  },
  mid:   { count: 16, len: '140px', thick: '2px', head: 6,  speedMin: 7,  speedMax: 13 },
  small: { count: 12, len: '70px',  thick: '1px', head: 3,  speedMin: 11, speedMax: 19 },
};

function makeMeteor(layer: MeteorLayer, id: number) {
  const cfg   = BASE_LAYER_CONFIG[layer];
  const type  = METEOR_TYPES[Math.floor(Math.random() * METEOR_TYPES.length)];
  const speed = cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin);
  const delay = -(Math.random() * speed);
  const angle = 45;
  const top   = `${-20 + Math.random() * 120}%`;
  const left  = `${-20 + Math.random() * 120}%`;

  return {
    id, layer, top, left,
    style: {
      '--len':          cfg.len,
      '--thick':        cfg.thick,
      '--head':         `${cfg.head}px`,
      '--meteor-color': type.color,
      '--tail-color':   type.tail,
      '--glow-color':   type.glow,
      '--angle':        `${angle}deg`,
      '--speed':        `${speed}s`,
      '--delay':        `${delay}s`,
    } as React.CSSProperties,
  };
}

export function MeteorShower() {
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const handleVisibility = () => {
      setIsPaused(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const meteors = useMemo(() => {
    const cores = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency ?? 4) : 4;
    const densityMultiplier = cores <= 2 ? 0.4 : cores <= 4 ? 0.65 : 1.0;

    return (Object.keys(BASE_LAYER_CONFIG) as MeteorLayer[]).flatMap((layer) => {
      const scaledCount = Math.max(2, Math.round(BASE_LAYER_CONFIG[layer].count * densityMultiplier));
      return Array.from({ length: scaledCount }, (_, i) => makeMeteor(layer, i));
    });
  }, []);

  return (
    <div
      className="meteor-shower"
      style={isPaused ? { animationPlayState: 'paused' } : undefined}
    >
      {meteors.map((m, idx) => (
        <div
          key={`${m.layer}-${m.id}-${idx}`}
          className={`meteor meteor-${m.layer}`}
          style={{
            top: m.top,
            left: m.left,
            ...m.style,
            ...(isPaused ? { animationPlayState: 'paused' } : {}),
          }}
        />
      ))}
    </div>
  );
}
