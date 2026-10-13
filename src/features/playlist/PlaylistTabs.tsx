import { useEffect, useRef, useState } from 'react';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import { useAudioStore } from '../../store/useAudioStore';
import type { Track } from '../../store/useAudioStore';
import { useAudio } from '../player/useAudio';
import { Play, Pause, Music, SkipBack, SkipForward, Shuffle, Repeat } from 'lucide-react';
import { cn } from '../../shared/utils/cn';

interface PlaylistData {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  tracks: Track[];
}

// ── Formata segundos → "m:ss"
function fmt(t: number) {
  if (!t || isNaN(t)) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PlaylistTabs() {
  const { config } = useSiteConfigStore();
  const [playlists, setPlaylists] = useState<PlaylistData[]>([]);
  const [loading, setLoading] = useState(true);
  // Tab ativa (qual playlist o usuário está vendo)
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const {
    playlist: currentTracks,
    isPlaying,
    setPlaylist,
    togglePlayPause,
    nextTrack,
    previousTrack,
    isShuffle,
    toggleShuffle,
    isRepeat,
    toggleRepeat,
    currentTrackIndex,
    playTrack,
  } = useAudioStore();

  // Hook de áudio — mantém um único elemento <audio> global
  const { currentTime, duration, seek } = useAudio();

  // Drag na barra de progresso
  const isSeeking = useRef(false);
  const [seekValue, setSeekValue] = useState(0);

  // ── Sync seekValue com currentTime quando não estiver arrastando
  useEffect(() => {
    if (!isSeeking.current) setSeekValue(currentTime);
  }, [currentTime]);

  // ── Carregar playlists do Firestore ────────────────────────────────────────
  useEffect(() => {
    if (!config?.id) return;
    const fetchPlaylists = async () => {
      try {
        const snapshot = await getDocs(
          query(collection(db, 'custom_playlists'), orderBy('orderIndex', 'asc'))
        );
        const loaded: PlaylistData[] = [];
        snapshot.forEach((doc) => {
          if (doc.id === '_placeholder') return;
          const data = doc.data();
          loaded.push({
            id: doc.id,
            name: data.name || data.title || '',
            description: data.description || '',
            coverUrl: data.cover || data.coverUrl || '',
            tracks: [],
          });
        });

        // Carregar tracks individuais de cada playlist
        for (const p of loaded) {
          const tSnap = await getDocs(
            query(collection(db, 'playlist_tracks'), where('playlistId', '==', p.id))
          );
          const allTracks: Track[] = [];
          tSnap.forEach((tDoc) => {
            const data = tDoc.data();
            if (data.title) {
              allTracks.push({
                ...data,
                id: tDoc.id,
                url: data.url || data.src,
                coverUrl: data.coverUrl || data.cover,
              } as Track);
            }
          });
          // Ordenar por orderIndex (legado)
          allTracks.sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
          p.tracks = allTracks;
        }

        setPlaylists(loaded);
        if (loaded.length > 0) setActiveTabId(loaded[0].id);
      } catch (err) {
        console.error('Erro ao carregar playlists:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlaylists();
  }, [config?.id]);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-rose-300/40 animate-pulse text-sm">
        Carregando playlists...
      </div>
    );
  }

  if (playlists.length === 0) return null;

  const activeTabPlaylist = playlists.find((p) => p.id === activeTabId) || playlists[0];

  // A playlist carregada no store (pode ser qualquer uma, não necessariamente a tab ativa)
  // Verificamos se o store está tocando a mesma playlist da tab ativa
  const isCurrentTabLoaded =
    currentTracks.length > 0 &&
    activeTabPlaylist.tracks.length > 0 &&
    currentTracks.some((t) => t.url === activeTabPlaylist.tracks[0]?.url);

  // Qual playlist está de fato ativa no player (qualquer tab que tenha tracks no store)
  const loadedPlaylist =
    playlists.find(
      (p) =>
        p.tracks.length > 0 &&
        currentTracks.length > 0 &&
        currentTracks.some((t) => t.url === p.tracks[0]?.url)
    ) || null;

  // Track sendo mostrado no card:
  // - Se a tab ativa é a que está tocando → mostra a track atual do store
  // - Se não → mostra a primeira track da tab ativa (preview)
  const displayTrack =
    isCurrentTabLoaded && currentTracks[currentTrackIndex]
      ? currentTracks[currentTrackIndex]
      : activeTabPlaylist.tracks[0];

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handlePlayPause = () => {
    if (isCurrentTabLoaded) {
      // A playlist da tab ativa já está no store → apenas toggle
      togglePlayPause();
    } else {
      // Carregar a playlist da tab ativa e dar play
      setPlaylist(activeTabPlaylist.tracks);
      // isPlaying será true após setPlaylist + useAudio reagir
      // Mas precisamos de um tick para o store atualizar — usamos setTimeout 0
      setTimeout(() => useAudioStore.getState().playTrack(0), 50);
    }
  };

  const handleTrackClick = (idx: number) => {
    if (!isCurrentTabLoaded) {
      setPlaylist(activeTabPlaylist.tracks);
      setTimeout(() => useAudioStore.getState().playTrack(idx), 50);
    } else {
      playTrack(idx);
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeekValue(Number(e.target.value));
  };
  const handleSeekCommit = (e: any) => {
    isSeeking.current = false;
    seek(Number(e.target.value));
  };

  const progressPercent = duration > 0 ? (seekValue / duration) * 100 : 0;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-8 px-4">
      {/* ── Tabs ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 w-full justify-start sm:justify-center px-1 md:px-4 no-scrollbar">
        {playlists.map((p) => {
          const isTabPlaying = loadedPlaylist?.id === p.id && isPlaying;
          return (
            <button
              key={p.id}
              onClick={() => setActiveTabId(p.id)}
              className={cn(
                'relative px-5 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all duration-300 border flex items-center gap-2',
                activeTabId === p.id
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(225,29,72,0.15)]'
                  : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-slate-200'
              )}
            >
              {/* Indicador de tocando */}
              {isTabPlaying && (
                <span className="flex gap-0.5 items-end h-3">
                  <span
                    className="w-0.5 bg-rose-400 animate-[bounce_0.8s_ease-in-out_infinite]"
                    style={{ height: '100%', animationDelay: '0s' }}
                  />
                  <span
                    className="w-0.5 bg-rose-400 animate-[bounce_0.8s_ease-in-out_infinite]"
                    style={{ height: '60%', animationDelay: '0.15s' }}
                  />
                  <span
                    className="w-0.5 bg-rose-400 animate-[bounce_0.8s_ease-in-out_infinite]"
                    style={{ height: '80%', animationDelay: '0.3s' }}
                  />
                </span>
              )}
              {p.name}
            </button>
          );
        })}
      </div>

      {/* ── Player Card ── */}
      <div className="relative w-full max-w-sm">
        {/* Glow */}
        <div className="absolute inset-0 bg-[var(--theme-primary)]/20 blur-[60px] rounded-full scale-90 opacity-80 pointer-events-none" />

        <div className="relative rounded-[2.5rem] bg-white/[0.03] backdrop-blur-3xl border border-[var(--theme-primary)]/30 p-6 md:p-8 shadow-[0_0_40px_rgba(var(--theme-primary-rgb),0.2),inset_0_0_20px_rgba(var(--theme-primary-rgb),0.05)] overflow-hidden transition-all duration-500 hover:border-[var(--theme-primary)]/50 flex flex-col w-full">
          
          {/* ── Capa ── */}
          <div
            className={cn(
              'relative w-full aspect-square mb-8 rounded-2xl overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.6)]',
              isCurrentTabLoaded && isPlaying
                ? 'ring-1 ring-[var(--theme-primary)]/50 ring-offset-4 ring-offset-[#05050A]'
                : ''
            )}
          >
            {displayTrack?.coverUrl || activeTabPlaylist.coverUrl ? (
              <img
                src={displayTrack?.coverUrl || activeTabPlaylist.coverUrl}
                alt={displayTrack?.title || activeTabPlaylist.name}
                className={cn(
                  'w-full h-full object-cover transition-transform duration-1000',
                  isCurrentTabLoaded && isPlaying ? 'scale-105' : 'hover:scale-105'
                )}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-800 to-rose-950 flex items-center justify-center">
                <Music className="w-20 h-20 text-white/20" />
              </div>
            )}
            {/* Overlay escuro quando tocando */}
            <div
              className={cn(
                'absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none transition-opacity duration-500',
                isCurrentTabLoaded && isPlaying ? 'opacity-100' : 'opacity-0'
              )}
            />
          </div>

          {/* ── Info ── */}
          <div className="text-left mb-6 flex justify-between items-end">
            <div className="min-w-0 pr-4">
              <h3 className="text-xl md:text-2xl font-bold text-white mb-1 truncate leading-tight">
                {displayTrack?.title || 'Sem faixas'}
              </h3>
              <p className="text-sm text-slate-400 truncate">
                {displayTrack?.artist || activeTabPlaylist.name}
              </p>
            </div>
            {isCurrentTabLoaded && isPlaying && (
              <div className="flex gap-1 items-end h-4 pb-1 shrink-0">
                <div className="w-1 bg-[var(--theme-primary)] rounded-full animate-[bounce_0.9s_ease-in-out_infinite]" style={{ height: '100%', animationDelay: '0.0s' }} />
                <div className="w-1 bg-[var(--theme-primary)] rounded-full animate-[bounce_0.9s_ease-in-out_infinite]" style={{ height: '60%', animationDelay: '0.2s' }} />
                <div className="w-1 bg-[var(--theme-primary)] rounded-full animate-[bounce_0.9s_ease-in-out_infinite]" style={{ height: '80%', animationDelay: '0.1s' }} />
              </div>
            )}
          </div>

          {/* ── Barra de Progresso (Spotify Style) ── */}
          <div className="mb-6 w-full">
            <div className="relative group w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden cursor-pointer"
                 onMouseDown={() => { isSeeking.current = true; }}
                 onTouchStart={() => { isSeeking.current = true; }}
                 onMouseUp={handleSeekCommit}
                 onTouchEnd={handleSeekCommit}>
              
              {/* Barra Preenchida */}
              <div
                className="absolute top-0 left-0 h-full bg-[var(--theme-primary)] rounded-full transition-all duration-100"
                style={{ width: isCurrentTabLoaded ? `${progressPercent}%` : '0%' }}
              />
              
              {/* Input range invisível por cima para fluidez */}
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={isCurrentTabLoaded ? seekValue : 0}
                disabled={!isCurrentTabLoaded}
                onChange={handleSeekChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
              />
            </div>
            
            <div className="flex justify-between items-center mt-2 px-0.5">
              <span className="text-[11px] text-slate-400 font-medium tracking-wide">
                {isCurrentTabLoaded ? fmt(seekValue) : '0:00'}
              </span>
              <span className="text-[11px] text-slate-400 font-medium tracking-wide">
                {isCurrentTabLoaded ? fmt(duration) : fmt((displayTrack as any)?.duration || 0)}
              </span>
            </div>
          </div>

          {/* ── Controles ── */}
          <div className="flex items-center justify-between w-full px-2">
            <button
              onClick={toggleShuffle}
              className={cn(
                'transition-colors p-2 rounded-full shrink-0',
                isShuffle ? 'text-[var(--theme-primary)]' : 'text-slate-500 hover:text-slate-300'
              )}
              disabled={!isCurrentTabLoaded}
            >
              <Shuffle className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            <button
              onClick={() => {
                if (!isCurrentTabLoaded) {
                  setPlaylist(activeTabPlaylist.tracks);
                  setTimeout(() => useAudioStore.getState().previousTrack(), 50);
                } else previousTrack();
              }}
              className="text-slate-200 hover:text-white transition-colors p-2 shrink-0"
            >
              <SkipBack className="w-8 h-8 md:w-10 md:h-10 fill-current" />
            </button>

            {/* Play/Pause principal */}
            <button
              onClick={handlePlayPause}
              className="w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-full bg-[var(--theme-primary)] text-white flex items-center justify-center hover:bg-[var(--theme-secondary)] hover:scale-105 active:scale-95 transition-all shadow-[0_0_25px_rgba(var(--theme-primary-rgb),0.6)]"
            >
              {isCurrentTabLoaded && isPlaying ? (
                <Pause className="w-7 h-7 md:w-8 md:h-8 fill-current" />
              ) : (
                <Play className="w-7 h-7 md:w-8 md:h-8 fill-current ml-1" />
              )}
            </button>

            <button
              onClick={() => {
                if (!isCurrentTabLoaded) {
                  setPlaylist(activeTabPlaylist.tracks);
                  setTimeout(() => useAudioStore.getState().nextTrack(), 50);
                } else nextTrack();
              }}
              className="text-slate-200 hover:text-white transition-colors p-2 shrink-0"
            >
              <SkipForward className="w-8 h-8 md:w-10 md:h-10 fill-current" />
            </button>

            <button
              onClick={toggleRepeat}
              className={cn(
                'transition-colors p-2 rounded-full shrink-0',
                isRepeat ? 'text-[var(--theme-primary)]' : 'text-slate-500 hover:text-slate-300'
              )}
              disabled={!isCurrentTabLoaded}
            >
              <Repeat className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Lista de faixas ── */}
      {activeTabPlaylist.tracks.length > 0 && (
        <div className="w-full max-w-sm space-y-1">
          <p className="text-xs text-slate-500 mb-2 px-1">
            {activeTabPlaylist.tracks.length} faixa
            {activeTabPlaylist.tracks.length !== 1 ? 's' : ''}
          </p>
          {activeTabPlaylist.tracks.map((track, idx) => {
            // Índice na playlist do store (caso a tab ativa seja a carregada)
            const storeIdx = isCurrentTabLoaded
              ? currentTracks.findIndex((t) => t.url === track.url)
              : -1;
            const isThisPlaying = isCurrentTabLoaded && storeIdx === currentTrackIndex;

            return (
              <button
                key={track.id || idx}
                onClick={() => handleTrackClick(idx)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group',
                  isThisPlaying
                    ? 'bg-rose-500/10 border border-rose-500/20'
                    : 'hover:bg-white/5 border border-transparent'
                )}
              >
                {/* Número / Equalizer */}
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  {isThisPlaying && isPlaying ? (
                    <span className="flex gap-0.5 items-end h-4">
                      <span
                        className="w-0.5 bg-rose-400 animate-[bounce_0.8s_ease-in-out_infinite] block"
                        style={{ height: '100%' }}
                      />
                      <span
                        className="w-0.5 bg-rose-400 animate-[bounce_0.8s_ease-in-out_infinite] block"
                        style={{ height: '60%', animationDelay: '0.15s' }}
                      />
                      <span
                        className="w-0.5 bg-rose-400 animate-[bounce_0.8s_ease-in-out_infinite] block"
                        style={{ height: '80%', animationDelay: '0.3s' }}
                      />
                    </span>
                  ) : (
                    <span
                      className={cn(
                        'text-xs font-mono',
                        isThisPlaying
                          ? 'text-rose-400'
                          : 'text-slate-600 group-hover:text-slate-400'
                      )}
                    >
                      {idx + 1}
                    </span>
                  )}
                </div>

                {/* Capa pequena */}
                {track.coverUrl ? (
                  <img
                    src={track.coverUrl}
                    alt=""
                    className="w-8 h-8 rounded-md object-cover flex-shrink-0 bg-slate-800"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-md bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <Music className="w-3 h-3 text-slate-600" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm font-medium truncate',
                      isThisPlaying ? 'text-rose-300' : 'text-slate-200 group-hover:text-white'
                    )}
                  >
                    {track.title}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{track.artist}</p>
                </div>

                {/* Duração */}
                {(track as any).duration && (
                  <span className="text-xs text-slate-600 font-mono flex-shrink-0">
                    {fmt((track as any).duration)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
