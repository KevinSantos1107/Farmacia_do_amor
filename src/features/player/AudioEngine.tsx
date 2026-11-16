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
        top: '-9999px',
        left: '-9999px',
        width: '240px',
        height: '240px',
        pointerEvents: 'none',
        zIndex: -9999,
        opacity: 0,
      }}
    >
      <div id="youtube-audio-host" />
    </div>
  );
}
