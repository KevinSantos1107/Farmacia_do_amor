/**
 * AudioEngine — componente invisível que mantém o player IFrame do YouTube
 * e o elemento de áudio global montados no Shell.
 * Deve ser montado UMA VEZ no Shell.
 */
import { useEffect } from 'react';
import { initYouTubePlayer } from './youtubePlayer';

export function AudioEngine() {
  useEffect(() => {
    initYouTubePlayer('youtube-audio-host');
  }, []);

  return (
    <div
      id="youtube-audio-host-wrapper"
      aria-hidden="true"
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        width: '1px',
        height: '1px',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: -1,
        opacity: 0.01,
      }}
    >
      <div id="youtube-audio-host" />
    </div>
  );
}
