/**
 * useAudio — Singleton de áudio global com suporte híbrido unificado (HTMLAudio + YouTube IFrame).
 *
 * Músicas MP3 (Cloudinary/Upload manual) tocam via HTMLAudioElement.
 * Músicas pesquisadas (YouTube) tocam via player do YouTube em segundo plano.
 * O player visual e os controles (play, pause, seek, volume, barra de progresso)
 * são 100% idênticos, síncronos e integrados para ambos os tipos de faixa.
 */
import { useEffect, useState } from 'react';
import { useAudioStore, type Track } from '../../store/useAudioStore';
import { getPlayableAudioUrl } from '../../services/mp3/audioService';
import { isSameAudioUrl, describeMediaError, shouldReloadTrack } from './playerLogic';
import {
  extractVideoId,
  isYouTubeTrack,
  playYouTubeVideo,
  cueYouTubeVideo,
  pauseYouTubeVideo,
  resumeYouTubeVideo,
  stopYouTubeVideo,
  seekYouTubeVideo,
  setYouTubeVolume,
  isYouTubeTrackActive,
  getActiveYouTubeVideoId,
  subscribeYouTubeTime,
  subscribeYouTubeDuration,
  subscribeYouTubeStatus,
  setYouTubeCallbacks,
} from './youtubePlayer';

// ── Singleton HTMLAudioElement — criado uma única vez ─────────────────────────
const _audio = typeof window !== 'undefined' ? new Audio() : null;

// Callbacks de "timeupdate" / "durationchange" unificados
type TimeListener = (time: number) => void;
type DurListener = (dur: number) => void;
type StatusListener = (s: { buffering: boolean; error: string | null; loading?: boolean }) => void;

const _timeListeners = new Set<TimeListener>();
const _durListeners = new Set<DurListener>();
const _statusListeners = new Set<StatusListener>();

let _currentTime = 0;
let _duration = 0;
let _isBuffering = false;
let _isLoadingTrack = false;
let _currentError: string | null = null;

function _emitTime(t: number) {
  _currentTime = t;
  _timeListeners.forEach((fn) => fn(t));
}

function _emitDuration(d: number) {
  _duration = d;
  _durListeners.forEach((fn) => fn(d));
}

function _emitStatus(buffering: boolean, error: string | null = null, loading?: boolean) {
  _isBuffering = buffering;
  _currentError = error;
  if (loading !== undefined) {
    _isLoadingTrack = loading;
  }
  _statusListeners.forEach((fn) => fn({ buffering, error, loading: _isLoadingTrack }));
}

let _activeTrackUrl = '';
let _loadGeneration = 0;
let _isAudioSilenced = false;

// Áudio silencioso em base64 (WAV puro de 86 bytes) usado para manter a sessão de áudio do sistema operacional ativa
const SILENT_AUDIO_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

/**
 * Ativa o áudio silencioso em loop no HTMLAudioElement para garantir que o sistema operacional
 * (Android, iOS) reconheça uma sessão de áudio nativa ativa, permitindo:
 * 1. Reprodução em segundo plano mesmo ao minimizar o navegador ou desligar a tela.
 * 2. Controle completo pela central de notificações e tela de bloqueio com barra de progresso.
 */
export function startSilentAudioKeepalive() {
  if (!_audio) return;
  try {
    _isAudioSilenced = true;
    _audio.loop = true;
    if (_audio.src !== SILENT_AUDIO_URI) {
      _audio.src = SILENT_AUDIO_URI;
    }
    _audio.play().catch(() => {});
  } catch {}
  setTimeout(() => {
    _isAudioSilenced = false;
  }, 50);
}

let _lastMediaSessionPositionUpdate = 0;

/**
 * Atualiza a barra de progresso e o tempo decorrido na central de notificações / tela de bloqueio.
 */
export function updateMediaSessionPositionState(
  currentTime: number,
  duration: number,
  force = false
) {
  if (
    typeof navigator === 'undefined' ||
    !('mediaSession' in navigator) ||
    !('setPositionState' in navigator.mediaSession)
  ) {
    return;
  }
  if (!isFinite(duration) || duration <= 0 || !isFinite(currentTime) || currentTime < 0) {
    return;
  }
  const now = Date.now();
  // Se não for forçado (ex: seek ou play), limita a 1 atualização a cada 2000ms para evitar que o Android trave a barra
  if (!force && now - _lastMediaSessionPositionUpdate < 2000) {
    return;
  }
  _lastMediaSessionPositionUpdate = now;

  try {
    const pos = Math.min(Math.max(0, currentTime), duration);
    navigator.mediaSession.setPositionState({
      duration: Math.round(duration),
      playbackRate: useAudioStore.getState().isPlaying ? 1 : 0,
      position: Math.round(pos),
    });
  } catch {
    // Ignora pequenos desvios transitórios durante busca rápida
  }
}

// ── Configuração de eventos do HTMLAudioElement ───────────────────────────────
if (_audio) {
  _audio.preload = 'auto';

  _audio.addEventListener('timeupdate', () => {
    if (_isAudioSilenced || isYouTubeTrackActive()) return;
    _emitTime(_audio!.currentTime);
    updateMediaSessionPositionState(_audio!.currentTime, _audio!.duration);
  });

  _audio.addEventListener('durationchange', () => {
    if (_isAudioSilenced || isYouTubeTrackActive()) return;
    if (!isNaN(_audio!.duration) && isFinite(_audio!.duration)) {
      _emitDuration(_audio!.duration);
      updateMediaSessionPositionState(_audio!.currentTime, _audio!.duration);
    }
  });

  _audio.addEventListener('loadedmetadata', () => {
    if (_isAudioSilenced || isYouTubeTrackActive()) return;
    if (!isNaN(_audio!.duration) && isFinite(_audio!.duration)) {
      _emitDuration(_audio!.duration);
      updateMediaSessionPositionState(_audio!.currentTime, _audio!.duration);
    }
  });

  _audio.addEventListener('loadstart', () => {
    if (_isAudioSilenced || isYouTubeTrackActive()) return;
    if (_audio!.src) _emitStatus(true, null, true);
  });

  _audio.addEventListener('waiting', () => {
    if (_isAudioSilenced || isYouTubeTrackActive()) return;
    _emitStatus(true);
  });

  _audio.addEventListener('stalled', () => {
    if (_isAudioSilenced || isYouTubeTrackActive()) return;
    if (!_audio!.paused) _emitStatus(true);
  });

  _audio.addEventListener('canplay', () => {
    if (_isAudioSilenced || isYouTubeTrackActive()) return;
    _emitStatus(false, null, false);
  });

  _audio.addEventListener('playing', () => {
    if (_isAudioSilenced) return;
    if (isYouTubeTrackActive()) {
      // Deixa o áudio silencioso rodar para manter a sessão de mídia e o segundo plano ativos no Android/iOS
      return;
    }
    _emitStatus(false, null, false);
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
      const state = useAudioStore.getState();
      const currentTrack = state.playlist[state.currentTrackIndex];
      if (currentTrack) {
        updateMediaSession(currentTrack, true);
      }
    }
  });

  _audio.addEventListener('pause', () => {
    if (_isAudioSilenced || isYouTubeTrackActive()) return;
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
  });

  _audio.addEventListener('error', () => {
    // Ignora se o áudio foi resetado/silenciado propositalmente ou se a fonte está vazia
    if (_isAudioSilenced || isYouTubeTrackActive()) return;
    if (!_audio!.getAttribute('src')) return;

    _emitStatus(false, describeMediaError(_audio!.error?.code), false);
    if (useAudioStore.getState().isPlaying) {
      useAudioStore.setState({ isPlaying: false });
    }
  });

  _audio.addEventListener('ended', () => {
    if (_isAudioSilenced || isYouTubeTrackActive()) return;
    const { isRepeat, nextTrack } = useAudioStore.getState();
    if (isRepeat) {
      _audio!.currentTime = 0;
      _emitTime(0);
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
      window.removeEventListener('touchstart', unlockAudio, true);
      window.removeEventListener('click', unlockAudio, true);
    };
    window.addEventListener('touchstart', unlockAudio, { passive: true, capture: true });
    window.addEventListener('click', unlockAudio, { passive: true, capture: true });
  }

  // Registra os handlers de controle na tela de bloqueio e central de mídia (MediaSession API)
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('play', () => {
        useAudioStore.getState().resumeTrack();
        updateMediaSessionPositionState(_currentTime, _duration, true);
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        useAudioStore.getState().pauseTrack();
        updateMediaSessionPositionState(_currentTime, _duration, true);
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        useAudioStore.getState().nextTrack();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        useAudioStore.getState().previousTrack();
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && isFinite(details.seekTime)) {
          seekUnifiedAudio(details.seekTime);
          updateMediaSessionPositionState(details.seekTime, _duration, true);
        }
      });
      try {
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          const skip = details.seekOffset || 10;
          const target = Math.max(0, _currentTime - skip);
          seekUnifiedAudio(target);
          updateMediaSessionPositionState(target, _duration, true);
        });
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
          const skip = details.seekOffset || 10;
          const target = Math.min(isFinite(_duration) ? _duration : Infinity, _currentTime + skip);
          seekUnifiedAudio(target);
          updateMediaSessionPositionState(target, _duration, true);
        });
        navigator.mediaSession.setActionHandler('stop', () => {
          stopUnifiedAudio();
          useAudioStore.setState({ isPlaying: false });
        });
      } catch {
        // Ignora ações não suportadas por navegadores legados
      }
    } catch (e) {
      console.warn('Erro ao configurar MediaSession handlers:', e);
    }
  }
}

let _youtubeBackgroundInterval: number | null = null;

// ── Listener de visibilidade: mantém o áudio tocando ao apagar a tela ou minimizar ─────
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    const state = useAudioStore.getState();
    const currentTrack = state.playlist[state.currentTrackIndex];

    if (document.hidden) {
      // Página foi para background (tela desligada / app minimizado)
      if (isYouTubeTrack(currentTrack) && state.isPlaying) {
        // 1. Garantir que o áudio silencioso está tocando (mantém o processo principal vivo)
        if (_audio && _audio.paused) {
          _audio.play().catch(() => {});
        }
        // 2. Tentativa imediata de retomada
        setTimeout(() => {
          if (useAudioStore.getState().isPlaying) resumeYouTubeVideo();
        }, 80);
        // 3. Intervalo periódico: acorda o iframe do YouTube a cada 2s enquanto em background.
        //    O iframe roda em processo separado (Site Isolation) e pode ser suspenso pelo SO
        //    independente do nosso processo. Enviar playVideo() via postMessage o acorda.
        if (!_youtubeBackgroundInterval) {
          _youtubeBackgroundInterval = window.setInterval(() => {
            const st = useAudioStore.getState();
            const track = st.playlist[st.currentTrackIndex];
            if (!st.isPlaying || !isYouTubeTrack(track)) {
              clearInterval(_youtubeBackgroundInterval!);
              _youtubeBackgroundInterval = null;
              return;
            }
            // Manter o silent audio ativo
            if (_audio && _audio.paused) _audio.play().catch(() => {});
            // Acordar o iframe com o comando de play (postMessage interno do IFrame API)
            resumeYouTubeVideo();
          }, 2000);
        }
      }
    } else {
      // Página voltou ao foreground
      if (_youtubeBackgroundInterval !== null) {
        clearInterval(_youtubeBackgroundInterval);
        _youtubeBackgroundInterval = null;
      }
      if (state.isPlaying && isYouTubeTrack(currentTrack)) {
        setTimeout(() => {
          if (useAudioStore.getState().isPlaying) resumeYouTubeVideo();
        }, 50);
      }
    }
  });
}

// ── Conexão dos eventos do YouTube aos listeners unificados ───────────────────
subscribeYouTubeTime((t) => {
  if (isYouTubeTrackActive()) {
    _emitTime(t);
    updateMediaSessionPositionState(t, _duration);
  }
});

subscribeYouTubeDuration((d) => {
  if (isYouTubeTrackActive()) {
    _emitDuration(d);
    updateMediaSessionPositionState(_currentTime, d, true);
  }
});

subscribeYouTubeStatus(({ buffering, error }) => {
  if (isYouTubeTrackActive()) {
    _emitStatus(buffering, error, false);
  }
});

setYouTubeCallbacks({
  onEnded: () => {
    const state = useAudioStore.getState();
    const currentTrack = state.playlist[state.currentTrackIndex];
    if (!isYouTubeTrack(currentTrack)) return;
    if (state.isRepeat) {
      replayCurrentAudio();
    } else {
      state.nextTrack();
    }
  },
  onPlay: () => {
    const state = useAudioStore.getState();
    if (!state.isPlaying) {
      useAudioStore.setState({ isPlaying: true });
    }
    const currentTrack = state.playlist[state.currentTrackIndex];
    if (currentTrack) {
      updateMediaSession(currentTrack, true);
    }
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
      updateMediaSessionPositionState(_currentTime, _duration, true);
    }
  },
  onPause: () => {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
      updateMediaSessionPositionState(_currentTime, _duration, true);
    }
  },
  onCued: () => {
    const state = useAudioStore.getState();
    if (state.isPlaying) {
      resumeYouTubeVideo();
    }
  },
  getInitialState: () => {
    const state = useAudioStore.getState();
    return {
      volume: state.volume,
      isMuted: state.isMuted,
      isPlaying: state.isPlaying,
    };
  },
  onError: (code: any) => {
    console.warn('[useAudio] Erro no player do YouTube (código):', code);
    const state = useAudioStore.getState();
    // Se o vídeo estiver com restrição de incorporação (101/150) ou removido (100),
    // avança para a próxima música para não travar a experiência do usuário
    if (state.isPlaying && state.playlist.length > 1) {
      setTimeout(() => {
        const curr = useAudioStore.getState();
        if (curr.isPlaying) {
          curr.nextTrack();
        }
      }, 1200);
    }
  },
});

/**
 * Para e silencia com segurança o elemento <audio> HTML5 sem disparar eventos de erro espúrios.
 */
export function stopAudioElement() {
  if (!_audio) return;
  _isAudioSilenced = true;
  _activeTrackUrl = '';
  _isLoadingTrack = false;
  try {
    _audio.pause();
    _audio.currentTime = 0;
    _audio.loop = false;
    _audio.removeAttribute('src');
    _audio.load();
  } catch {}
  setTimeout(() => {
    _isAudioSilenced = false;
  }, 50);
}

export function updateMediaSession(
  track:
    | {
        title: string;
        artist: string;
        coverUrl?: string;
        cover?: string;
        image?: string;
        photoUrl?: string;
      }
    | undefined,
  isPlaying?: boolean
) {
  if (typeof window === 'undefined' || !('mediaSession' in navigator) || !track) {
    return;
  }

  try {
    const artwork: { src: string; sizes?: string; type?: string }[] = [];
    const directCover = track.coverUrl || track.cover || track.image || track.photoUrl;

    if (directCover && (directCover.startsWith('http://') || directCover.startsWith('https://'))) {
      artwork.push({ src: directCover });
    } else {
      const icon192 = `${window.location.origin}/icon-192.png`;
      const icon512 = `${window.location.origin}/icon-512.png`;
      artwork.push(
        { src: icon192, sizes: '192x192', type: 'image/png' },
        { src: icon512, sizes: '512x512', type: 'image/png' }
      );
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title?.trim() || 'Música',
      artist: track.artist?.trim() || 'Kevin & Iara',
      album: 'Farmácia do Amor',
      artwork,
    });

    if (isPlaying !== undefined) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  } catch (err) {
    console.warn('Erro ao atualizar MediaSession:', err);
  }
}

export function getActiveTrackUrl(): string {
  return _activeTrackUrl;
}

export function getAudioElement(): HTMLAudioElement | null {
  return _audio;
}

/**
 * Carrega e executa uma faixa de forma unificada (seja ela MP3 ou YouTube).
 */
export async function loadAndPlayUnifiedTrack(track: Track | undefined, autoPlay: boolean) {
  if (!track) {
    stopAudioElement();
    stopYouTubeVideo();
    _activeTrackUrl = '';
    _isLoadingTrack = false;
    _emitTime(0);
    _emitDuration(0);
    return;
  }

  const isYt = isYouTubeTrack(track);
  const ytId = extractVideoId(track.videoId || track.url);

  // ── Caso 1: Faixa do YouTube ──────────────────────────────────────────────
  if (isYt && ytId) {
    _activeTrackUrl = ytId;
    _isLoadingTrack = false;
    _emitTime(0);
    const initialDur = track.duration && track.duration > 0 ? track.duration : 0;
    _emitDuration(initialDur);
    updateMediaSessionPositionState(0, initialDur, true);

    if (autoPlay) {
      startSilentAudioKeepalive();
      playYouTubeVideo(ytId);
    } else {
      cueYouTubeVideo(ytId);
    }
    return;
  }

  // ── Caso 2: Faixa de MP3 normal ───────────────────────────────────────────
  // 1. Para o YouTube com segurança
  stopYouTubeVideo();

  if (!_audio) return;
  _audio.loop = false;

  if (!shouldReloadTrack(_activeTrackUrl, track.url, !!_audio.src)) {
    if (autoPlay && _audio.paused) {
      _audio.play().catch(console.error);
    }
    return;
  }

  const isDirectUrlTrack = track.url && (track.url.startsWith('http://') || track.url.startsWith('https://'));
  const sameUrl = isDirectUrlTrack && isSameAudioUrl(_audio.src, track.url);

  if (!sameUrl) {
    _audio.pause();
    _audio.currentTime = 0;
  }

  _emitTime(0);
  const initialDur = track.duration && track.duration > 0 ? track.duration : 0;
  _emitDuration(initialDur);
  updateMediaSessionPositionState(0, initialDur, true);

  _activeTrackUrl = track.url || '';
  _isLoadingTrack = true;
  _emitStatus(true, null, true);
  const myGeneration = ++_loadGeneration;

  try {
    const isDirectUrl = track.url && (track.url.startsWith('http://') || track.url.startsWith('https://'));
    const url = isDirectUrl ? track.url : await getPlayableAudioUrl(track.url);

    if (myGeneration !== _loadGeneration) return;

    if (!isSameAudioUrl(_audio.src, url)) {
      _audio.src = url;
    }

    if (autoPlay) {
      if (_audio.paused) {
        _audio.play().catch((e) => {
          console.warn('Audio play deferred by browser policy:', e);
        });
      }
    } else {
      _audio.pause();
    }
  } catch (err: unknown) {
    if (myGeneration === _loadGeneration) {
      _activeTrackUrl = '';
      const msg = err instanceof Error ? err.message || 'Erro ao carregar áudio' : 'Erro ao carregar áudio';
      _emitStatus(false, msg, false);
    }
  } finally {
    if (myGeneration === _loadGeneration) {
      _isLoadingTrack = false;
      _emitStatus(false, null, false);
    }
  }
}

/**
 * Retoma a reprodução do áudio ativo (MP3 ou YouTube).
 */
export function resumeUnifiedAudio(track?: Track) {
  const state = useAudioStore.getState();
  const current = track || state.playlist[state.currentTrackIndex];
  if (!current) return;

  if (isYouTubeTrack(current)) {
    startSilentAudioKeepalive();
    const ytId = extractVideoId(current.videoId || current.url);
    if (ytId && !getActiveYouTubeVideoId()) {
      playYouTubeVideo(ytId);
    } else {
      resumeYouTubeVideo();
    }
    return;
  }

  if (_audio) {
    _audio.loop = false;
    if (
      current.url &&
      !_audio.src &&
      (current.url.startsWith('http://') || current.url.startsWith('https://'))
    ) {
      _audio.src = current.url;
    }
    _audio.play().catch(console.error);
  }
}

/**
 * Pausa a reprodução do áudio ativo (MP3 ou YouTube).
 */
export function pauseUnifiedAudio() {
  // Cancelar o keep-alive de background ao pausar manualmente
  if (_youtubeBackgroundInterval !== null) {
    clearInterval(_youtubeBackgroundInterval);
    _youtubeBackgroundInterval = null;
  }

  const state = useAudioStore.getState();
  const current = state.playlist[state.currentTrackIndex];

  if (isYouTubeTrack(current) || isYouTubeTrackActive()) {
    pauseYouTubeVideo();
  }

  if (_audio && !_audio.paused) {
    _audio.pause();
  }
}

/**
 * Reinicia a faixa atual do início (replay).
 */
export function replayCurrentAudio() {
  const state = useAudioStore.getState();
  const current = state.playlist[state.currentTrackIndex];
  if (!current) return;

  if (isYouTubeTrack(current)) {
    seekYouTubeVideo(0);
    resumeYouTubeVideo();
    _emitTime(0);
    return;
  }

  if (_audio) {
    _audio.currentTime = 0;
    _emitTime(0);
    _audio.play().catch(console.error);
  }
}

/**
 * Pula para determinado tempo na faixa ativa (seek).
 */
export function seekUnifiedAudio(seconds: number) {
  const state = useAudioStore.getState();
  const current = state.playlist[state.currentTrackIndex];

  if (isYouTubeTrack(current) || isYouTubeTrackActive()) {
    seekYouTubeVideo(seconds);
    _emitTime(seconds);
    return;
  }

  if (_audio && isFinite(seconds)) {
    _audio.currentTime = seconds;
    _emitTime(seconds);
  }
}

/**
 * Ajusta o volume e o mudo para todos os backends.
 */
export function setUnifiedVolume(volume: number, isMuted: boolean) {
  setYouTubeVolume(isMuted ? 0 : volume);
  if (_audio) {
    try {
      _audio.volume = volume;
      _audio.muted = isMuted;
    } catch {}
  }
}

/**
 * Para completamente a reprodução em ambos os backends.
 */
export function stopUnifiedAudio() {
  // Cancelar o keep-alive de background ao parar
  if (_youtubeBackgroundInterval !== null) {
    clearInterval(_youtubeBackgroundInterval);
    _youtubeBackgroundInterval = null;
  }
  stopAudioElement();
  stopYouTubeVideo();
  _activeTrackUrl = '';
  _isLoadingTrack = false;
  _emitTime(0);
  _emitDuration(0);
}

// ── Hook de UI (Consumido por AudioPlayer, PlaylistTabs, etc.) ─────────────────
export function useAudio() {
  const [currentTime, setCurrentTime] = useState(_currentTime);
  const [duration, setDuration] = useState(_duration);
  const [isLoading, setIsLoading] = useState(_isLoadingTrack);
  const [isBuffering, setIsBuffering] = useState(_isBuffering);
  const [error, setError] = useState<string | null>(_currentError);

  useEffect(() => {
    const onTime: TimeListener = (t) => setCurrentTime(t);
    const onDur: DurListener = (d) => setDuration(d);
    const onStatus: StatusListener = ({ buffering, error: err, loading }) => {
      setIsBuffering(buffering);
      setError(err);
      if (loading !== undefined) setIsLoading(loading);
    };

    _timeListeners.add(onTime);
    _durListeners.add(onDur);
    _statusListeners.add(onStatus);

    // Sync inicial com o estado singleton
    setCurrentTime(_currentTime);
    setDuration(_duration);
    setIsBuffering(_isBuffering);
    setIsLoading(_isLoadingTrack);
    setError(_currentError);

    return () => {
      _timeListeners.delete(onTime);
      _durListeners.delete(onDur);
      _statusListeners.delete(onStatus);
    };
  }, []);

  return {
    currentTime,
    duration,
    isLoading,
    isBuffering,
    error,
    seek: seekUnifiedAudio,
  };
}
