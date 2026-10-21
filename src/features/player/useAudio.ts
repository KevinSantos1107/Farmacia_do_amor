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
import { shouldReloadTrack, isSameAudioUrl, describeMediaError } from './playerLogic';

// ── Singleton — criado uma única vez quando o módulo é importado ─────────────
const _audio = typeof window !== 'undefined' ? new Audio() : null;

// Callbacks de "timeupdate" / "durationchange" podem ser subscritos de fora
type TimeListener = (time: number) => void;
type DurListener = (dur: number) => void;
const _timeListeners = new Set<TimeListener>();
const _durListeners = new Set<DurListener>();

// Estado de buffering / erro do elemento <audio> (para a UI mostrar feedback)
type StatusListener = (s: { buffering: boolean; error: string | null }) => void;
const _statusListeners = new Set<StatusListener>();
const _emitStatus = (buffering: boolean, error: string | null = null) => {
  _statusListeners.forEach((fn) => fn({ buffering, error }));
};

let _activeTrackUrl = '';
let _isLoadingTrack = false;
let _loadGeneration = 0; // incremented on every new load; each async fn captures its own snapshot

if (_audio) {
  _audio.preload = 'metadata';

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
  // Feedback de carregamento: antes, se o MP3 demorasse ou falhasse, a UI ficava
  // "tocando" sem nenhuma indicação.
  _audio.addEventListener('loadstart', () => { if (_audio!.src) _emitStatus(true); });
  _audio.addEventListener('waiting', () => _emitStatus(true));
  _audio.addEventListener('stalled', () => { if (!_audio!.paused) _emitStatus(true); });
  _audio.addEventListener('canplay', () => _emitStatus(false));
  _audio.addEventListener('playing', () => _emitStatus(false));
  _audio.addEventListener('error', () => {
    // src vazio (ao limpar a faixa) também dispara 'error' — ignorar
    if (!_audio!.src) return;
    _emitStatus(false, describeMediaError(_audio!.error?.code));
    if (useAudioStore.getState().isPlaying) useAudioStore.setState({ isPlaying: false });
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

  // Desbloqueia o elemento de áudio na primeira interação do usuário no iOS Safari
  if (typeof window !== 'undefined') {
    const unlockAudio = () => {
      if (_audio && _audio.paused && !_audio.src) {
        _audio.load();
      }
      // O flag de capture precisa ser o mesmo do addEventListener, senão não remove
      window.removeEventListener('touchstart', unlockAudio, true);
      window.removeEventListener('click', unlockAudio, true);
    };
    window.addEventListener('touchstart', unlockAudio, { passive: true, capture: true });
    window.addEventListener('click', unlockAudio, { passive: true, capture: true });
  }
}

export function getAudioElement(): HTMLAudioElement | null {
  return _audio;
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
  const [isBuffering, setIsBuffering] = useState(false);
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

  // ── Buffering / erro do elemento <audio> ──────────────────────────────────
  useEffect(() => {
    const onStatus: StatusListener = ({ buffering, error: err }) => {
      setIsBuffering(buffering);
      if (err) setError(err);
      else if (!buffering) setError(null);
    };
    _statusListeners.add(onStatus);
    return () => { _statusListeners.delete(onStatus); };
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
    const myGeneration = ++_loadGeneration;

    // O store já define `audio.src` e chama play() de forma síncrona dentro do toque
    // (exigência do iOS). Se o src já é o desta faixa, NÃO pausa/zera de novo —
    // isso abortaria o play() recém-iniciado e atrasaria o começo da música.
    const isDirectUrlTrack = track.url.startsWith('http://') || track.url.startsWith('https://');
    const alreadyLoadedByStore = isDirectUrlTrack && isSameAudioUrl(_audio.src, track.url);

    // 1. ZERA IMEDIATAMENTE a barra e áudio anterior de forma síncrona
    if (!alreadyLoadedByStore) {
      _audio.pause();
      _audio.currentTime = 0;
    }
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

        const isDirectUrl = track.url.startsWith('http://') || track.url.startsWith('https://');
        const url = isDirectUrl ? track.url : await getPlayableAudioUrl(track.url);
        if (isCancelled) return;

        if (!isSameAudioUrl(_audio.src, url)) {
          _audio.src = url;
        }

        if (useAudioStore.getState().isPlaying && _audio.paused) {
          _audio.play().catch((e) => {
            console.warn('Audio play deferred by browser policy:', e);
          });
        }
      } catch (err: unknown) {
        if (!isCancelled && myGeneration === _loadGeneration) {
          _activeTrackUrl = '';
          const msg = err instanceof Error ? err.message || 'Erro ao carregar áudio' : 'Erro ao carregar áudio';
          setError(msg);
        }
      } finally {
        if (myGeneration === _loadGeneration) {
          _isLoadingTrack = false;
        }
        if (!isCancelled && myGeneration === _loadGeneration) {
          setIsLoading(false);
        }
      }
    };

    loadTrack();

    return () => {
      isCancelled = true;
      if (myGeneration === _loadGeneration) {
        _isLoadingTrack = false;
      }
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
    try {
      _audio.volume = volume;
    } catch {
      // Ignora erro no iOS onde volume é controlado apenas por botões físicos
    }
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

  return { currentTime, duration, isLoading, isBuffering, error, seek };
}
