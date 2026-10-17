import { useAudioStore } from '../../store/useAudioStore';
import { Play, Pause, Music } from 'lucide-react';
import { cn } from '../../shared/utils/cn';

export function PlaylistManager() {
  const { playlist, currentTrackIndex, isPlaying, playTrack, togglePlayPause } = useAudioStore();

  if (playlist.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-theme-text-secondary">
        <Music className="w-12 h-12 mb-4 opacity-50" />
        <p>A playlist está vazia.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-2 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
      {playlist.map((track, index) => {
        const isCurrent = index === currentTrackIndex;

        return (
          <button
            key={track.id || index}
            onClick={() => {
              if (isCurrent) {
                togglePlayPause();
              } else {
                playTrack(index);
              }
            }}
            className={cn(
              'flex items-center gap-4 w-full p-3 rounded-xl transition-all text-left group',
              isCurrent
                ? 'bg-theme-primary/10 border border-theme-primary/30'
                : 'hover:bg-theme-bg border border-transparent'
            )}
          >
            <div className="relative w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-theme-card-bg">
              {track.coverUrl ? (
                <img
                  src={track.coverUrl}
                  alt={track.title}
                  className={cn(
                    'w-full h-full object-cover',
                    isCurrent && isPlaying ? 'opacity-50' : ''
                  )}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-theme-text-secondary">
                  <Music className="w-5 h-5" />
                </div>
              )}

              {/* Overlay Icon */}
              <div
                className={cn(
                  'absolute inset-0 flex items-center justify-center bg-black/40 text-white transition-opacity',
                  isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                )}
              >
                {isCurrent && isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <h4
                className={cn(
                  'text-sm font-semibold truncate transition-colors',
                  isCurrent ? 'text-theme-primary' : 'text-theme-text'
                )}
              >
                {track.title}
              </h4>
              <p className="text-xs text-theme-text-secondary truncate">{track.artist}</p>
            </div>

            {isCurrent && isPlaying && (
              <div className="flex gap-0.5 h-4 items-end px-2">
                <div
                  className="w-1 bg-theme-primary animate-pulse h-full"
                  style={{ animationDelay: '0.1s' }}
                />
                <div
                  className="w-1 bg-theme-primary animate-pulse h-2/3"
                  style={{ animationDelay: '0.3s' }}
                />
                <div
                  className="w-1 bg-theme-primary animate-pulse h-4/5"
                  style={{ animationDelay: '0.2s' }}
                />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
