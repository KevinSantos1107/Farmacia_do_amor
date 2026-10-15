/**
 * useAudio — Singleton de áudio global.
 *
 * O HTMLAudioElement é criado UMA vez no nível do módulo e compartilhado
 * por todos os componentes que chamarem este hook. Isso garante que a
 * música continua tocando ao navegar entre páginas/abas.
 */
import { useEffect, useState } from 'react';
import { useAudioStore } from '../../store/useAudioStore';
import { getPlayableAudioUrl } from '../../services/mp3/audioService';
import { shouldReloadTrack } from './playerLogic';

// ── Singleton — criado uma única vez quando o módulo é importado ─────────────
const _audio = typeof window !== 'undefined' ? new Audio() : null;

// Callbacks de "timeupdate" / "durationchange" podem ser subscritos de fora
type TimeListener = (time: number) => void;
type DurListener = (dur: number) => void;
const _timeListeners = new Set<TimeListener>();
const _durListeners = new Set<DurListener>();

let _activeTrackUrl = '';
let _isLoadingTrack = false;

if (_audio) {
  _audio.preload = 'auto';

  _audio.addEventListener('timeupdate', () => {
    _timeListeners.forEach((fn) => fn(_audio!.currentTime));
  });
  _audio.addEventListener('durationchange', () => {
    if (!isNaN(_audio!.duration) && isFinite(_audio!.duration)) {
      _durListeners.forEach((fn) => fn(_audio!.duration));
    }
  });
  _audio.addEventListener('loadedmetadata', () => {
    if (!isNaN(_audio!.duration) && isFinite(_audio!.duration)) {
      _durListeners.forEach((fn) => fn(_audio!.duration));
    }
  });
  _audio.addEventListener('ended', () => {
    const { isRepeat, nextTrack } = useAudioStore.getState();
    if (isRepeat) {
      _audio!.currentTime = 0;
      _timeListeners.forEach((fn) => fn(0));
      _audio!.play().catch(console.error);
      return;
    }
    nextTrack();
  });
}

export function replayCurrentAudio() {
  if (_isLoadingTrack) return;
  if (_audio) {
    _audio.currentTime = 0;
    _timeListeners.forEach((fn) => fn(0));
    _audio.play().catch(console.error);
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAudio() {
  const { playlist, currentTrackIndex, isPlaying, volume, isMuted } = useAudioStore();

  const [currentTime, setCurrentTime] = useState(_audio ? _audio.currentTime : 0);
  const [duration, setDuration] = useState(_audio && !isNaN(_audio.duration) ? _audio.duration : 0);
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

    const track = playlist[currentTrackIndex];
    if (!track) {
      _audio.pause();
      _audio.src = '';
      _activeTrackUrl = '';
      _isLoadingTrack = false;
      setCurrentTime(0);
      setDuration(0);
      _timeListeners.forEach((fn) => fn(0));
      _durListeners.forEach((fn) => fn(0));
      return;
    }

    // Se já está carregando ou tocando esta faixa com a mesma URL, não duplica requisições
    if (!shouldReloadTrack(_activeTrackUrl, track.url, !!_audio.src)) {
      return;
    }

    _activeTrackUrl = track.url;
    _isLoadingTrack = true;

    // 1. ZERA IMEDIATAMENTE a barra e áudio anterior de forma síncrona
    _audio.pause();
    _audio.currentTime = 0;
    setCurrentTime(0);
    _timeListeners.forEach((fn) => fn(0));
    const initialDur = track.duration && track.duration > 0 ? track.duration : 0;
    setDuration(initialDur);
    _durListeners.forEach((fn) => fn(initialDur));

    let isCancelled = false;

    const loadTrack = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const url = await getPlayableAudioUrl(track.url);
        if (isCancelled) return;

        if (_audio.src !== url) {
          _audio.src = url;
        }

        if (useAudioStore.getState().isPlaying) {
          _audio.play().catch((e) => {
            console.error('Autoplay prevented:', e);
            if (e.name === 'NotAllowedError') {
              useAudioStore.getState().togglePlayPause();
            }
          });
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          _activeTrackUrl = '';
          const msg = err instanceof Error ? err.message || 'Erro ao carregar áudio' : 'Erro ao carregar áudio';
          setError(msg);
        }
      } finally {
        _isLoadingTrack = false;
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadTrack();

    return () => {
      isCancelled = true;
      _isLoadingTrack = false;
    };
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
    if (_audio && isFinite(time)) {
      _audio.currentTime = time;
      setCurrentTime(time);
      _timeListeners.forEach((fn) => fn(time));
    }
  };

  return { currentTime, duration, isLoading, error, seek };
}
