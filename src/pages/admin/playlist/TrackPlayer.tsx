import { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { updateDoc } from 'firebase/firestore';
import { siteDoc } from '../../../services/firestore/paths';
import { isYouTubeTrack } from '../../../features/player/youtubePlayer';
import { formatAudioTime } from './playlistUtils';
import {
  playPreview,
  pausePreview,
  resumePreview,
  seekPreview,
  subscribePreviewTrackId,
  getActivePreviewTrackId,
} from './adminAudioPreview';
import type { Track } from './types';

export interface TrackPlayerProps {
  track: Track;
  trackId: string;
  siteId?: string;
}

export function TrackPlayer({ track, trackId, siteId }: TrackPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(track.duration || 0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Sincroniza a duração caso ela seja atualizada na prop track
  useEffect(() => {
    if (track.duration && track.duration > 0) {
      setDuration(track.duration);
    }
  }, [track.duration]);

  // Se a faixa for MP3 e não tiver duration salva no Firestore, carrega metadata em background para exibir a duração real
  useEffect(() => {
    if (duration > 0) return;
    const audioSrc = track.src || track.url;
    if (!audioSrc || isYouTubeTrack(track)) return;

    let active = true;
    const tempAudio = new Audio();
    tempAudio.preload = 'metadata';
    tempAudio.onloadedmetadata = () => {
      if (active && isFinite(tempAudio.duration) && tempAudio.duration > 0) {
        const rounded = Math.round(tempAudio.duration);
        setDuration(rounded);
        if (trackId && (!track.duration || track.duration <= 0)) {
          try {
            updateDoc(siteDoc('playlist_tracks', trackId, siteId), { duration: rounded }).catch(() => {});
          } catch {}
        }
      }
    };
    tempAudio.src = audioSrc;

    return () => {
      active = false;
      tempAudio.src = '';
    };
  }, [track.src, track.url, duration, trackId, siteId, track.duration]);

  // Se outra faixa do painel começou a tocar, desativa o botão desta
  useEffect(() => {
    const unsub = subscribePreviewTrackId((activeId) => {
      if (activeId !== trackId) {
        setPlaying(false);
        setProgress(0);
      }
    });
    return unsub;
  }, [trackId]);

  const togglePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (playing) {
      pausePreview();
      setPlaying(false);
    } else {
      const activeId = getActivePreviewTrackId();
      if (activeId === trackId) {
        resumePreview();
        setPlaying(true);
      } else {
        setPlaying(true);
        await playPreview(track, trackId, {
          onProgress: (p) => { if (mountedRef.current) setProgress(p); },
          onDuration: (d) => {
            if (mountedRef.current) {
              const rounded = Math.round(d);
              setDuration(rounded);
              if (trackId && (!track.duration || track.duration <= 0)) {
                try {
                  updateDoc(siteDoc('playlist_tracks', trackId, siteId), { duration: rounded }).catch(() => {});
                } catch {}
              }
            }
          },
          onEnded: () => {
            if (mountedRef.current) {
              setPlaying(false);
              setProgress(0);
            }
          },
        });
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value);
    seekPreview(t);
    setProgress(t);
  };

  const handleRangePointerDown = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="flex items-center gap-2 flex-1 min-w-0"
      data-admin-audio
      data-track-id={trackId}
      onDragStart={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={togglePlay}
        className="p-1.5 bg-rose-500/20 hover:bg-rose-500/40 rounded-full text-rose-400 transition-colors shrink-0 cursor-pointer"
        title={playing ? 'Pausar prévia' : 'Tocar prévia'}
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
          max={duration > 0 ? duration : 100}
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
