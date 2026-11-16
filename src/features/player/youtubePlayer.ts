/**
 * src/features/player/youtubePlayer.ts
 *
 * Gerenciador singleton do player do YouTube (IFrame API).
 * Permite tocar músicas completas do YouTube em segundo plano,
 * sincronizado com o player nativo do site (estilo LovePanda).
 *
 * Módulo puro: não importa useAudioStore diretamente (evita dependência circular).
 */

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

type TimeListener = (time: number) => void;
type DurListener = (dur: number) => void;
type StatusListener = (s: { buffering: boolean; error: string | null }) => void;

// Listeners definidos no topo para garantir inicialização antes de qualquer export
const _ytTimeListeners = new Set<TimeListener>();
const _ytDurListeners = new Set<DurListener>();
const _ytStatusListeners = new Set<StatusListener>();

let _ytPlayer: any = null;
let _isApiReady = false;
let _isPlayerReady = false;
let _pendingVideoId: string | null = null;
let _pendingAutoPlay = false;
let _pollTimer: ReturnType<typeof setInterval> | null = null;
let _activeVideoId: string | null = null;


export interface YouTubePlayerCallbacks {
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onBuffering?: () => void;
  onCued?: () => void;
  onError?: (err: any) => void;
  getInitialState?: () => { volume: number; isMuted: boolean; isPlaying: boolean };
}

let _callbacks: YouTubePlayerCallbacks = {};

export function setYouTubeCallbacks(cbs: YouTubePlayerCallbacks) {
  _callbacks = { ..._callbacks, ...cbs };
}

export function isYouTubeApiReady(): boolean {
  return _isApiReady;
}

export function subscribeYouTubeTime(fn: TimeListener) {
  _ytTimeListeners.add(fn);
  return () => _ytTimeListeners.delete(fn);
}

export function subscribeYouTubeDuration(fn: DurListener) {
  _ytDurListeners.add(fn);
  return () => _ytDurListeners.delete(fn);
}

export function subscribeYouTubeStatus(fn: StatusListener) {
  _ytStatusListeners.add(fn);
  return () => _ytStatusListeners.delete(fn);
}

function startPolling() {
  if (_pollTimer) return;
  _pollTimer = setInterval(() => {
    if (!_ytPlayer || !_isPlayerReady || !_activeVideoId) return;
    try {
      if (typeof _ytPlayer.getCurrentTime === 'function') {
        const time = _ytPlayer.getCurrentTime();
        if (typeof time === 'number' && !isNaN(time)) {
          _ytTimeListeners.forEach((fn) => fn(time));
        }
      }
      if (typeof _ytPlayer.getDuration === 'function') {
        const dur = _ytPlayer.getDuration();
        if (typeof dur === 'number' && !isNaN(dur) && dur > 0) {
          _ytDurListeners.forEach((fn) => fn(dur));
        }
      }
    } catch {
      // ignora leituras transitórias
    }
  }, 250);
}

function stopPolling() {
  if (_pollTimer) {
    clearInterval(_pollTimer);
    _pollTimer = null;
  }
}

/**
 * Carrega a API do IFrame do YouTube sob demanda.
 */
export function ensureYouTubeIframeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();

  if (window.YT && window.YT.Player) {
    _isApiReady = true;
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const existing = document.getElementById('yt-iframe-api-script');
    if (!existing) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    const prevOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      _isApiReady = true;
      if (typeof prevOnReady === 'function') prevOnReady();
      resolve();
    };

    // Fallback caso a API já tenha carregado antes do evento
    const interval = setInterval(() => {
      if (window.YT && window.YT.Player) {
        _isApiReady = true;
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });
}

/**
 * Inicializa o player no elemento HTML host.
 */
export async function initYouTubePlayer(elementId: string) {
  if (typeof window === 'undefined') return;
  await ensureYouTubeIframeApi();

  if (_ytPlayer) return;

  let targetEl = document.getElementById(elementId);
  if (!targetEl) {
    await new Promise((r) => requestAnimationFrame(r));
    targetEl = document.getElementById(elementId);
    if (!targetEl) return;
  }

  _ytPlayer = new window.YT.Player(elementId, {
    height: '240',
    width: '240',
    playerVars: {
      autoplay: 0, // NUNCA tocar automaticamente ao instanciar o iframe
      controls: 0,
      disablekb: 1,
      fs: 0,
      playsinline: 1,
      rel: 0,
      origin: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
    events: {
      onReady: () => {
        _isPlayerReady = true;
        const initial = _callbacks.getInitialState?.() || {
          volume: 0.8,
          isMuted: false,
          isPlaying: false,
        };
        setYouTubeVolume(initial.isMuted ? 0 : initial.volume);

        if (_pendingVideoId) {
          const vId = _pendingVideoId;
          const shouldPlay = _pendingAutoPlay && initial.isPlaying;
          _pendingVideoId = null;
          _pendingAutoPlay = false;

          if (shouldPlay) {
            playYouTubeVideo(vId);
          } else {
            cueYouTubeVideo(vId);
          }
        }
      },
      onStateChange: (event: any) => {
        // -1 = UNSTARTED, 0 = ENDED, 1 = PLAYING, 2 = PAUSED, 3 = BUFFERING, 5 = CUED
        // Se o YouTube não for a faixa ativa atual, ignora qualquer evento de fundo
        if (!_activeVideoId) return;

        if (event.data === 0) {
          // Música terminou
          stopPolling();
          _ytStatusListeners.forEach((fn) => fn({ buffering: false, error: null }));
          _callbacks.onEnded?.();
        } else if (event.data === 1) {
          // Começou a tocar
          startPolling();
          _ytStatusListeners.forEach((fn) => fn({ buffering: false, error: null }));
          _callbacks.onPlay?.();
        } else if (event.data === 2) {
          // Pausado
          // Se a tela foi desligada ou o app foi minimizado (document.hidden === true),
          // mas o usuário quer a música tocando (isPlaying === true),
          // retoma em múltiplas tentativas sem mudar o estado para pausado!
          const state = _callbacks.getInitialState?.();
          if (typeof document !== 'undefined' && document.hidden && state?.isPlaying) {
            // Tenta retomar em vários delays: o iframe pode demorar a acordar
            [0, 150, 400, 900, 1800].forEach((delay) => {
              setTimeout(() => {
                if (_callbacks.getInitialState?.()?.isPlaying && document.hidden) {
                  resumeYouTubeVideo();
                }
              }, delay);
            });
            return;
          }

          stopPolling();
          _ytStatusListeners.forEach((fn) => fn({ buffering: false, error: null }));
          _callbacks.onPause?.();
        } else if (event.data === 3) {
          // Buffering
          _ytStatusListeners.forEach((fn) => fn({ buffering: true, error: null }));
          _callbacks.onBuffering?.();
        } else if (event.data === 5) {
          // Cued
          _ytStatusListeners.forEach((fn) => fn({ buffering: false, error: null }));
          _callbacks.onCued?.();
        }
      },
      onError: (event: any) => {
        if (!_activeVideoId) return;
        stopPolling();
        console.warn('[YouTube Player] Erro no player:', event.data);
        _ytStatusListeners.forEach((fn) =>
          fn({ buffering: false, error: 'Erro ao reproduzir vídeo do YouTube' })
        );
        _callbacks.onError?.(event.data);
      },
    },
  });
}

/**
 * Carrega e inicia a reprodução de um vídeo do YouTube pelo ID, sempre iniciando do zero (0s).
 */
export function playYouTubeVideo(videoId: string) {
  _activeVideoId = videoId;

  if (!_isPlayerReady || !_ytPlayer) {
    _pendingVideoId = videoId;
    _pendingAutoPlay = true;
    return;
  }

  try {
    if (typeof _ytPlayer.loadVideoById === 'function') {
      _ytPlayer.loadVideoById({
        videoId,
        startSeconds: 0,
      });
      _ytPlayer.seekTo(0, true);
      _ytPlayer.playVideo();
      startPolling();
    }
  } catch (err) {
    console.warn('[YouTube Player] Falha ao dar play:', err);
  }
}

/**
 * Prepara (cue) um vídeo do YouTube pelo ID sem tocar automaticamente, sempre no segundo 0.
 */
export function cueYouTubeVideo(videoId: string) {
  _activeVideoId = videoId;

  if (!_isPlayerReady || !_ytPlayer) {
    _pendingVideoId = videoId;
    _pendingAutoPlay = false;
    return;
  }

  try {
    if (typeof _ytPlayer.cueVideoById === 'function') {
      _ytPlayer.cueVideoById({
        videoId,
        startSeconds: 0,
      });
      _ytPlayer.seekTo(0, true);
    }
  } catch (err) {
    console.warn('[YouTube Player] Falha ao dar cue:', err);
  }
}

export function pauseYouTubeVideo() {
  if (!_ytPlayer || !_isPlayerReady) return;
  try {
    _ytPlayer.pauseVideo();
    stopPolling();
  } catch {}
}

export function resumeYouTubeVideo() {
  if (!_ytPlayer || !_isPlayerReady) return;
  try {
    _ytPlayer.playVideo();
    startPolling();
  } catch {}
}

export function stopYouTubeVideo() {
  _activeVideoId = null;
  _pendingVideoId = null;
  _pendingAutoPlay = false;
  stopPolling();
  if (!_ytPlayer || !_isPlayerReady) return;
  try {
    _ytPlayer.seekTo(0, true);
    _ytPlayer.pauseVideo();
  } catch {}
}

export function seekYouTubeVideo(seconds: number) {
  if (!_ytPlayer || !_isPlayerReady) return;
  try {
    _ytPlayer.seekTo(seconds, true);
    _ytTimeListeners.forEach((fn) => fn(seconds));
  } catch {}
}

export function setYouTubeVolume(volume: number) {
  if (!_ytPlayer || !_isPlayerReady) return;
  try {
    const vol100 = Math.round(Math.max(0, Math.min(1, volume)) * 100);
    _ytPlayer.setVolume(vol100);
    if (vol100 === 0) {
      _ytPlayer.mute();
    } else {
      _ytPlayer.unMute();
    }
  } catch {}
}

export function isYouTubeTrackActive(): boolean {
  return !!_activeVideoId;
}

export function getActiveYouTubeVideoId(): string | null {
  return _activeVideoId;
}

/**
 * Extrai o videoId de uma string de URL ou do próprio videoId
 */
export function extractVideoId(urlOrId: string | undefined): string | null {
  if (!urlOrId) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(urlOrId)) return urlOrId;
  const match = urlOrId.match(/(?:v=|youtu\.be\/|embed\/|watch\?v=)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

/**
 * Verifica se a track é originária do YouTube.
 */
export function isYouTubeTrack(
  track: { videoId?: string; source?: string; url?: string; src?: string } | undefined | null
): boolean {
  if (!track) return false;
  if (track.source === 'youtube') return true;
  if (track.videoId && /^[A-Za-z0-9_-]{11}$/.test(track.videoId)) return true;
  const url = track.url || track.src || '';
  return url.includes('youtube.com') || url.includes('youtu.be');
}
