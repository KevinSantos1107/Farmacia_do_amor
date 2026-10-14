/**
 * useAudio — Singleton de áudio global.
 *
 * O HTMLAudioElement é criado UMA vez no nível do módulo e compartilhado
 * por todos os componentes que chamarem este hook.  Isso garante que a
 * música continua tocando ao navegar entre páginas/abas.
 */
import { useEffect, useState } from 'react';
import { useAudioStore } from '../../store/useAudioStore';
import { getPlayableAudioUrl } from '../../services/mp3/audioService';

// ── Singleton — criado uma única vez quando o módulo é importado ─────────────
const _audio = typeof window !== 'undefined' ? new Audio() : null;

// Callbacks de "timeupdate" / "durationchange" podem ser subscritos de fora
type TimeListener = (time: number) => void;
type DurListener = (dur: number) => void;
const _timeListeners = new Set<TimeListener>();
const _durListeners = new Set<DurListener>();

if (_audio) {
  _audio.addEventListener('timeupdate', () => {
    _timeListeners.forEach((fn) => fn(_audio!.currentTime));
  });
  _audio.addEventListener('durationchange', () => {
    _durListeners.forEach((fn) => fn(_audio!.duration));
  });
  _audio.addEventListener('loadedmetadata', () => {
    _durListeners.forEach((fn) => fn(_audio!.duration));
  });
  _audio.addEventListener('ended', () => {
    useAudioStore.getState().nextTrack();
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAudio() {
  const { playlist, currentTrackIndex, isPlaying, volume, isMuted } = useAudioStore();

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Subscrever/desinscrever listeners de tempo ────────────────────────────
  useEffect(() => {
    const onTime: TimeListener = (t) => setCurrentTime(t);
    const onDur: DurListener = (d) => setDuration(d);
    _timeListeners.add(onTime);
    _durListeners.add(onDur);
    return () => {
      _timeListeners.delete(onTime);
      _durListeners.delete(onDur);
    };
  }, []);

  // ── Carregar track quando index/playlist mudar ────────────────────────────
  useEffect(() => {
    if (!_audio) return;

    const loadTrack = async () => {
      const track = playlist[currentTrackIndex];
      if (!track) {
        _audio.pause();
        _audio.src = '';
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const url = await getPlayableAudioUrl(track.url);

        if (_audio.src !== url) {
          _audio.src = url;
          _audio.load();
        }

        if (isPlaying) {
          _audio.play().catch((e) => {
            console.error('Autoplay prevented:', e);
            if (e.name === 'NotAllowedError') {
              useAudioStore.getState().togglePlayPause();
            }
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message || 'Erro ao carregar áudio' : 'Erro ao carregar áudio';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentTrackIndex >= 0) {
      loadTrack();
    } else {
      _audio.pause();
      _audio.src = '';
      setCurrentTime(0);
      setDuration(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrackIndex, playlist]);

  // ── Play / Pause ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!_audio || !_audio.src) return;
    if (isPlaying && _audio.paused) {
      _audio.play().catch((e) => console.error(e));
    } else if (!isPlaying && !_audio.paused) {
      _audio.pause();
    }
  }, [isPlaying]);

  // ── Volume / Mute ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!_audio) return;
    _audio.volume = volume;
    _audio.muted = isMuted;
  }, [volume, isMuted]);

  // ── Seek ──────────────────────────────────────────────────────────────────
  const seek = (time: number) => {
    if (_audio) {
      _audio.currentTime = time;
      setCurrentTime(time);
    }
  };

  return { currentTime, duration, isLoading, error, seek };
}
