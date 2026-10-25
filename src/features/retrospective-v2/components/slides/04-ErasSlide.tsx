import { useState, useEffect } from 'react';
import { useRetroV2Store } from '../../store/useRetroV2Store';

export function ErasSlide() {
  const { photos } = useRetroV2Store();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (photos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, 800);
    return () => clearInterval(interval);
  }, [photos.length]);

  if (!photos || photos.length === 0) {
    return (
      <div className="flex-1 bg-black flex flex-col items-center justify-center text-center p-4">
        <h2 className="text-3xl font-bold mb-4 text-white">Nossas Eras</h2>
        <p className="text-white/50">Adicione fotos aos álbuns.</p>
      </div>
    );
  }

  const safeIndex = Math.min(Math.max(0, currentIndex), photos.length - 1);
  const currentPhoto = photos[safeIndex] || photos[0];
  if (!currentPhoto) return null;

  let eraYear = '2025';
  try {
    if (currentPhoto.date instanceof Date && !isNaN(currentPhoto.date.getTime())) {
      eraYear = String(currentPhoto.date.getFullYear());
    } else if (currentPhoto.date) {
      const parsed = new Date(currentPhoto.date as unknown as string | number);
      if (!isNaN(parsed.getTime())) {
        eraYear = String(parsed.getFullYear());
      }
    }
  } catch {
    eraYear = '2025';
  }

  return (
    <div className="flex-1 bg-black relative flex flex-col items-center justify-center overflow-hidden">

      {/* Fundo desfocado (Spotify-style) */}
      <div
        className="absolute inset-0 bg-cover bg-center scale-110"
        style={{
          backgroundImage: currentPhoto.url ? `url(${currentPhoto.url})` : 'none',
          filter: 'blur(28px) brightness(0.30) saturate(1.3)',
          transition: 'background-image 0.6s ease',
        }}
      />

      {/* Overlay escuro para garantir legibilidade */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Ano decorativo na vertical — lado esquerdo */}
      <h2
        className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 text-white font-black pointer-events-none select-none"
        style={{
          fontSize: 'clamp(4rem, 18vw, 8rem)',
          lineHeight: 1,
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          opacity: 0.08,
          letterSpacing: '-0.04em',
          transform: 'translateY(-50%) rotate(180deg)',
        }}
      >
        {eraYear}
      </h2>

      {/* Conteúdo central */}
      <div className="z-10 flex flex-col items-center gap-6 sm:gap-8 px-6 sm:px-10 w-full">

        {/* Moldura da foto */}
        <div
          className="relative"
          style={{
            width: 'clamp(180px, 50vw, 280px)',
            aspectRatio: '3/4',
          }}
        >
          {/* Glow neon atrás da foto */}
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              boxShadow: '0 0 50px 10px rgba(236, 72, 153, 0.25), 0 0 120px 20px rgba(139, 92, 246, 0.15)',
              borderRadius: '1rem',
            }}
          />

          {/* Borda dupla: fina branca opaca + brilho */}
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              border: '1.5px solid rgba(255,255,255,0.18)',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06), 0 30px 60px rgba(0,0,0,0.7)',
              borderRadius: '1rem',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          />

          {/* Fotos com crossfade */}
          <div className="w-full h-full rounded-2xl overflow-hidden relative shadow-2xl">
            {photos.map((p, i) => (
              <img
                key={i}
                src={p.url}
                alt=""
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  opacity: i === currentIndex ? 1 : 0,
                  transition: 'opacity 0.5s ease',
                }}
              />
            ))}
          </div>
        </div>

        {/* Label "Nossas Eras" */}
        <div className="text-center">
          <p
            className="text-white/40 font-semibold uppercase tracking-[0.35em] text-[10px] sm:text-xs mb-1"
          >
            nossa galeria
          </p>
          <p
            className="font-black uppercase leading-none tracking-tight"
            style={{
              fontSize: 'clamp(1.8rem, 8vw, 3rem)',
              background: 'linear-gradient(to right, #f9a8d4, #c084fc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 20px rgba(192,132,252,0.4))',
            }}
          >
            Nossas Eras
          </p>
        </div>

      </div>

      {/* Indicadores de foto (pontinhos embaixo) */}
      {photos.length > 1 && photos.length <= 20 && (
        <div className="absolute bottom-6 sm:bottom-8 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
          {photos.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === currentIndex ? 16 : 5,
                height: 5,
                background: i === currentIndex ? 'rgba(249,168,212,0.9)' : 'rgba(255,255,255,0.25)',
              }}
            />
          ))}
        </div>
      )}

    </div>
  );
}
