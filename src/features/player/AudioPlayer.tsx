import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  ListMusic,
  Home,
  Map,
  Gamepad2,
  Heart,
  type LucideIcon,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAudioStore } from '../../store/useAudioStore';
import { useAudio } from './useAudio';
import { cn } from '../../shared/utils/cn';
import { Spinner } from '../../shared/ui/Spinner';
import { Modal } from '../../shared/ui/Modal';
import { PlaylistManager } from '../playlist/PlaylistManager';

function NavLink({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      title={label}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
        isActive
          ? 'bg-theme-primary/20 text-theme-primary'
          : 'text-theme-text-secondary hover:text-theme-text hover:bg-white/5'
      )}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

export function AudioPlayer() {
  const location = useLocation();
  const {
    playlist,
    currentTrackIndex,
    isPlaying,
    volume,
    isMuted,
    isShuffle,
    isRepeat,
    togglePlayPause,
    nextTrack,
    previousTrack,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
  } = useAudioStore();

  const { currentTime, duration, isLoading, isBuffering, error, seek } = useAudio();
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

  useEffect(() => {
    if (!isSeeking) setSeekValue(currentTime);
  }, [currentTime, isSeeking]);

  useEffect(() => {
    setIsSeeking(false);
    setSeekValue(0);
  }, [currentTrackIndex]);

  const currentTrack = playlist[currentTrackIndex];

  if (!currentTrack) {
    // Sem música: mostrar apenas mini navbar de navegação
    return (
      <div
        className="fixed bottom-0 left-0 w-full bg-theme-bg/95 backdrop-blur border-t border-theme-card-border z-50 animate-in slide-in-from-bottom-full duration-500"
        style={{
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 h-14 px-4">
          <NavLink to="/" icon={Heart} label="Início" />
          <NavLink to="/mapa" icon={Map} label="Nosso Mundo" />
          <NavLink to="/jogos" icon={Gamepad2} label="Jogos" />
        </div>
      </div>
    );
  }

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value));
  };

  return (
    <div
      className="fixed bottom-0 left-0 w-full bg-[#05050A]/70 backdrop-blur-2xl border-t border-[var(--theme-primary)]/30 p-3 px-4 z-50 animate-in slide-in-from-bottom-full duration-500 shadow-[0_-10px_40px_rgba(var(--theme-primary-rgb),0.15)]"
      style={{
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Track Info + Mobile Nav */}
        <div className="flex items-center gap-3 w-full md:w-1/3 overflow-hidden">
          {currentTrack.coverUrl ? (
            <img
              src={currentTrack.coverUrl}
              alt="Capa"
              loading="lazy"
              decoding="async"
              className="w-10 h-10 rounded-md object-cover flex-shrink-0 bg-theme-card-bg border border-theme-card-border"
            />
          ) : (
            <div className="w-10 h-10 rounded-md bg-theme-primary/20 flex items-center justify-center flex-shrink-0 text-base">
              🎵
            </div>
          )}
          <div className="truncate flex-1 min-w-0">
            <h4 className="text-theme-text font-medium text-sm truncate">{currentTrack.title}</h4>
            <p className="text-theme-text-secondary text-xs truncate">{currentTrack.artist}</p>
          </div>
          {/* Nav icons — mobile only */}
          <div className="flex md:hidden items-center gap-1 ml-auto flex-shrink-0">
            <NavLink to="/" icon={Home} label="Início" />
            <NavLink to="/mapa" icon={Map} label="Mapa" />
            <NavLink to="/jogos" icon={Gamepad2} label="Jogos" />
          </div>
        </div>

        {/* Controls & Progress */}
        <div className="flex flex-col items-center gap-2 w-full md:w-1/3">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleShuffle}
              aria-label={isShuffle ? 'Desativar aleatório' : 'Ativar aleatório'}
              className={cn(
                'text-theme-text-secondary hover:text-theme-text transition',
                isShuffle && 'text-theme-primary'
              )}
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button
              onClick={previousTrack}
              aria-label="Faixa anterior"
              className="text-theme-text-secondary hover:text-theme-text transition"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>
            <button
              onClick={togglePlayPause}
              aria-label={isPlaying ? 'Pausar música' : 'Reproduzir música'}
              className="w-10 h-10 rounded-full bg-[var(--theme-primary)] text-white flex items-center justify-center hover:bg-[var(--theme-secondary)] transition-transform hover:scale-105 active:scale-95 shadow-[0_0_15px_var(--theme-primary)]"
              disabled={isLoading}
            >
              {isLoading || (isPlaying && isBuffering) ? (
                <Spinner size="sm" className="text-white" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>
            <button
              onClick={nextTrack}
              aria-label="Próxima faixa"
              className="text-theme-text-secondary hover:text-theme-text transition"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
            <button
              onClick={toggleRepeat}
              aria-label={isRepeat ? 'Desativar repetição' : 'Ativar repetição'}
              className={cn(
                'text-theme-text-secondary hover:text-theme-text transition',
                isRepeat && 'text-theme-primary'
              )}
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 w-full text-xs text-theme-text-secondary font-mono">
            <span>{formatTime(seekValue)}</span>
            <input
              type="range"
              min={0}
              max={duration > 0 ? duration : (currentTrack?.duration || 100)}
              value={seekValue}
              onMouseDown={() => setIsSeeking(true)}
              onTouchStart={() => setIsSeeking(true)}
              onChange={(e) => setSeekValue(Number(e.target.value))}
              onMouseUp={(e) => {
                setIsSeeking(false);
                seek(Number((e.target as HTMLInputElement).value));
              }}
              onTouchEnd={(e) => {
                setIsSeeking(false);
                seek(Number((e.target as HTMLInputElement).value));
              }}
              aria-label="Progresso da música"
              className="flex-1 h-1.5 bg-theme-card-border rounded-lg appearance-none cursor-pointer accent-theme-primary"
            />
            <span>{formatTime(duration || currentTrack?.duration || 0)}</span>
          </div>

          {error && <span className="text-red-500 text-xs absolute -top-6">{error}</span>}
        </div>

        {/* Volume, Nav & Extras */}
        <div className="flex items-center justify-end gap-2 w-full md:w-1/3">
          {/* Nav icons — desktop */}
          <div className="hidden md:flex items-center gap-1 mr-2 border-r border-theme-card-border pr-3">
            <Link
              to="/"
              title="Início"
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                location.pathname === '/'
                  ? 'bg-theme-primary/20 text-theme-primary'
                  : 'text-theme-text-secondary hover:text-theme-text hover:bg-white/5'
              )}
            >
              <Home className="w-4 h-4" />
            </Link>
            <Link
              to="/mapa"
              title="Nosso Mundo"
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                location.pathname === '/mapa'
                  ? 'bg-theme-primary/20 text-theme-primary'
                  : 'text-theme-text-secondary hover:text-theme-text hover:bg-white/5'
              )}
            >
              <Map className="w-4 h-4" />
            </Link>
            <Link
              to="/jogos"
              title="Jogos"
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                location.pathname === '/jogos'
                  ? 'bg-theme-primary/20 text-theme-primary'
                  : 'text-theme-text-secondary hover:text-theme-text hover:bg-white/5'
              )}
            >
              <Gamepad2 className="w-4 h-4" />
            </Link>
          </div>

          <button
            onClick={() => setIsPlaylistOpen(true)}
            aria-label="Abrir lista de reprodução"
            className="text-theme-text-secondary hover:text-theme-text transition"
          >
            <ListMusic className="w-5 h-5" />
          </button>
          <button
            onClick={toggleMute}
            aria-label={isMuted || volume === 0 ? 'Ativar som' : 'Silenciar'}
            className="text-theme-text-secondary hover:text-theme-text transition"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            aria-label="Volume"
            className="w-20 h-1.5 bg-theme-card-border rounded-lg appearance-none cursor-pointer accent-theme-primary hidden md:block"
          />
        </div>
      </div>

      <Modal
        isOpen={isPlaylistOpen}
        onClose={() => setIsPlaylistOpen(false)}
        title="Fila de Reprodução"
      >
        <PlaylistManager />
      </Modal>
    </div>
  );
}
