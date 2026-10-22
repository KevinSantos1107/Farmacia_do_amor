import { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { formatAudioTime } from './playlistUtils';

export function TrackPlayer({ src, trackId }: { src: string; trackId: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;
    audio.addEventListener('timeupdate', () => setProgress(audio.currentTime));
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    audio.addEventListener('ended', () => {
      setPlaying(false);
      setProgress(0);
    });
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [src]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      document.querySelectorAll('[data-admin-audio]').forEach((el) => {
        el.dispatchEvent(new CustomEvent('pause-others', { detail: trackId }));
      });
      audio.play().catch(() => {});
      setPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = t;
    setProgress(t);
  };

  const handleRangePointerDown = () => {
    window.addEventListener('pointerup', () => {}, { once: true });
    window.addEventListener('mouseup', () => {}, { once: true });
  };

  return (
    <div
      className="flex items-center gap-2 flex-1 min-w-0"
      data-admin-audio
      data-track-id={trackId}
      onDragStart={(e) => e.stopPropagation()}
    >
      <button
        onClick={togglePlay}
        className="p-1.5 bg-rose-500/20 hover:bg-rose-500/40 rounded-full text-rose-400 transition-colors shrink-0"
      >
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
      </button>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-xs text-slate-500 font-mono w-8 shrink-0">
          {formatAudioTime(progress)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={progress}
          onChange={handleSeek}
          onPointerDown={handleRangePointerDown}
          onMouseDown={handleRangePointerDown}
          onTouchStart={handleRangePointerDown}
          className="flex-1 h-1 accent-rose-500 cursor-pointer"
        />
        <span className="text-xs text-slate-500 font-mono w-8 shrink-0 text-right">
          {formatAudioTime(duration)}
        </span>
      </div>
    </div>
  );
}
