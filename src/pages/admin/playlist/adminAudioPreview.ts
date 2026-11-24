/**
 * adminAudioPreview.ts
 *
 * Gerenciador singleton para prévia de áudio no painel administrativo.
 * Suporta tanto arquivos MP3 (via HTMLAudioElement) quanto faixas do YouTube (via IFrame API).
 * Garante que apenas uma faixa toque por vez no painel.
 */

import { ensureYouTubeIframeApi, extractVideoId, isYouTubeTrack } from '../../../features/player/youtubePlayer';
import type { Track } from './types';

type ProgressCallback = (progress: number) => void;
type DurationCallback = (duration: number) => void;
type EndedCallback = () => void;

interface PreviewCallbacks {
  onProgress: ProgressCallback;
  onDuration: DurationCallback;
  onEnded: EndedCallback;
}

let _activeTrackId: string | null = null;
let _currentAudio: HTMLAudioElement | null = null;
let _adminYtPlayer: {
  playVideo?: () => void;
  pauseVideo?: () => void;
  destroy?: () => void;
  [key: string]: unknown;
} | null = null;
let _adminYtPollTimer: ReturnType<typeof setInterval> | null = null;
let _currentCallbacks: PreviewCallbacks | null = null;
const _subscribers = new Set<(activeId: string | null) => void>();

function notifySubscribers() {
  _subscribers.forEach((cb) => cb(_activeTrackId));
}

export function subscribePreviewTrackId(cb: (activeId: string | null) => void) {
  _subscribers.add(cb);
  cb(_activeTrackId);
  return () => {
    _subscribers.delete(cb);
  };
}

export function getActivePreviewTrackId(): string | null {
  return _activeTrackId;
}

function stopYtPolling() {
  if (_adminYtPollTimer) {
    clearInterval(_adminYtPollTimer);
    _adminYtPollTimer = null;
  }
}

function startYtPolling() {
  stopYtPolling();
  _adminYtPollTimer = setInterval(() => {
    if (!_adminYtPlayer || typeof _adminYtPlayer.getCurrentTime !== 'function') return;
    try {
      const time = _adminYtPlayer.getCurrentTime();
      if (typeof time === 'number' && !isNaN(time)) {
        _currentCallbacks?.onProgress(time);
      }
      const dur = _adminYtPlayer.getDuration();
      if (typeof dur === 'number' && !isNaN(dur) && dur > 0) {
        _currentCallbacks?.onDuration(dur);
      }
    } catch {
      // Ignora leituras transitórias
    }
  }, 250);
}

function ensureAdminYtHost(): HTMLElement {
  let host = document.getElementById('admin-yt-preview-host');
  if (!host) {
    const wrap = document.createElement('div');
    wrap.id = 'admin-yt-preview-wrap';
    wrap.style.cssText =
      'position:fixed;top:-9999px;left:-9999px;width:240px;height:240px;pointer-events:none;z-index:-9999;opacity:0;';
    host = document.createElement('div');
    host.id = 'admin-yt-preview-host';
    wrap.appendChild(host);
    document.body.appendChild(wrap);
  }
  return host;
}

export async function playPreview(
  track: Track,
  trackId: string,
  callbacks: PreviewCallbacks
): Promise<void> {
  // Para qualquer áudio anterior
  stopPreview(false);

  _activeTrackId = trackId;
  _currentCallbacks = callbacks;
  notifySubscribers();

  const isYt = isYouTubeTrack(track);

  if (isYt) {
    const ytId = extractVideoId(track.videoId || track.src || track.url);
    if (!ytId) {
      console.warn('[adminAudioPreview] VideoId não encontrado:', track);
      stopPreview();
      return;
    }

    // Se a faixa já tiver duração registrada no Firestore, emite logo
    if (track.duration && track.duration > 0) {
      callbacks.onDuration(track.duration);
    }

    await ensureYouTubeIframeApi();
    ensureAdminYtHost();

    if (_adminYtPlayer && typeof _adminYtPlayer.loadVideoById === 'function') {
      try {
        _adminYtPlayer.loadVideoById(ytId);
        _adminYtPlayer.playVideo();
        startYtPolling();
      } catch (err) {
        console.warn('[adminAudioPreview] Erro ao carregar vídeo:', err);
      }
      return;
    }

    _adminYtPlayer = new window.YT.Player('admin-yt-preview-host', {
      height: '240',
      width: '240',
      videoId: ytId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        playsinline: 1,
        rel: 0,
        origin: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
      events: {
        onReady: (e: { target: { playVideo: () => void } }) => {
          e.target.playVideo();
          startYtPolling();
        },
        onStateChange: (e: { data: number }) => {
          // 0 = ENDED, 1 = PLAYING, 2 = PAUSED
          if (e.data === 0) {
            stopYtPolling();
            _currentCallbacks?.onEnded();
            _activeTrackId = null;
            notifySubscribers();
          } else if (e.data === 1) {
            startYtPolling();
          } else if (e.data === 2) {
            stopYtPolling();
          }
        },
        onError: () => {
          stopYtPolling();
          _currentCallbacks?.onEnded();
          _activeTrackId = null;
          notifySubscribers();
        },
      },
    });
  } else {
    // ── MP3 Track ──
    const audioSrc = track.src || track.url;
    if (!audioSrc) return;

    if (track.duration && track.duration > 0) {
      callbacks.onDuration(track.duration);
    }

    const audio = new Audio(audioSrc);
    _currentAudio = audio;

    audio.addEventListener('timeupdate', () => {
      callbacks.onProgress(audio.currentTime);
    });

    audio.addEventListener('loadedmetadata', () => {
      if (!isNaN(audio.duration) && isFinite(audio.duration)) {
        callbacks.onDuration(audio.duration);
      }
    });

    audio.addEventListener('ended', () => {
      callbacks.onEnded();
      _activeTrackId = null;
      notifySubscribers();
    });

    audio.addEventListener('error', () => {
      callbacks.onEnded();
      _activeTrackId = null;
      notifySubscribers();
    });

    try {
      await audio.play();
    } catch (err) {
      console.warn('[adminAudioPreview] Falha ao tocar MP3:', err);
      callbacks.onEnded();
      _activeTrackId = null;
      notifySubscribers();
    }
  }
}

export function pausePreview(): void {
  if (_currentAudio) {
    _currentAudio.pause();
  }
  if (_adminYtPlayer && typeof _adminYtPlayer.pauseVideo === 'function') {
    try {
      _adminYtPlayer.pauseVideo();
    } catch {}
  }
  stopYtPolling();
}

export function resumePreview(): void {
  if (_currentAudio) {
    _currentAudio.play().catch(() => {});
  }
  if (_adminYtPlayer && typeof _adminYtPlayer.playVideo === 'function') {
    try {
      _adminYtPlayer.playVideo();
      startYtPolling();
    } catch {}
  }
}

export function seekPreview(seconds: number): void {
  if (_currentAudio && isFinite(seconds)) {
    _currentAudio.currentTime = seconds;
  }
  if (_adminYtPlayer && typeof _adminYtPlayer.seekTo === 'function') {
    try {
      _adminYtPlayer.seekTo(seconds, true);
    } catch {}
  }
}

export function stopPreview(notify = true): void {
  if (_currentAudio) {
    _currentAudio.pause();
    _currentAudio.src = '';
    _currentAudio = null;
  }
  if (_adminYtPlayer && typeof _adminYtPlayer.stopVideo === 'function') {
    try {
      _adminYtPlayer.stopVideo();
    } catch {}
  }
  stopYtPolling();
  _currentCallbacks = null;
  _activeTrackId = null;
  if (notify) notifySubscribers();
}
