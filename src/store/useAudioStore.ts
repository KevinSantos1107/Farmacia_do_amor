import { create } from 'zustand';
import { replayCurrentAudio, getAudioElement } from '../features/player/useAudio';

export interface Track {
  id: string;
  title: string;
  artist: string;
  url: string; // The full URL from Firestore migration or Cloudinary
  coverUrl?: string;
  duration?: number;
}

interface PlayerState {
  playlist: Track[];
  currentTrackIndex: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  isRepeat: boolean;

  // Actions
  setPlaylist: (tracks: Track[]) => void;
  setPlaylistAndPlay: (tracks: Track[], index?: number) => void;
  playTrack: (index: number) => void;
  togglePlayPause: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
}

export const useAudioStore = create<PlayerState>((set, get) => ({
  playlist: [],
  currentTrackIndex: -1,
  isPlaying: false,
  volume: 0.8,
  isMuted: false,
  isShuffle: false,
  isRepeat: false,

  setPlaylist: (tracks) => set({ playlist: tracks, currentTrackIndex: tracks.length > 0 ? 0 : -1 }),

  setPlaylistAndPlay: (tracks, index = 0) => {
    if (tracks.length === 0) return;
    const safeIdx = Math.min(Math.max(0, index), tracks.length - 1);
    set({ playlist: tracks, currentTrackIndex: safeIdx, isPlaying: true });
    const audio = getAudioElement();
    if (audio) {
      const target = tracks[safeIdx];
      if (target?.url && (target.url.startsWith('http://') || target.url.startsWith('https://'))) {
        if (audio.src !== target.url) {
          audio.src = target.url;
        }
        audio.play().catch(() => {});
      }
    }
  },

  playTrack: (index) => {
    const { playlist, currentTrackIndex } = get();
    if (index >= 0 && index < playlist.length) {
      if (index === currentTrackIndex) {
        set({ isPlaying: true });
        replayCurrentAudio();
      } else {
        set({ currentTrackIndex: index, isPlaying: true });
        const audio = getAudioElement();
        if (audio) {
          const target = playlist[index];
          if (target?.url && (target.url.startsWith('http://') || target.url.startsWith('https://'))) {
            if (audio.src !== target.url) {
              audio.src = target.url;
            }
            audio.play().catch(() => {});
          }
        }
      }
    }
  },

  togglePlayPause: () => {
    const { currentTrackIndex, isPlaying, playlist } = get();
    if (currentTrackIndex !== -1) {
      const nextPlaying = !isPlaying;
      set({ isPlaying: nextPlaying });
      const audio = getAudioElement();
      if (audio) {
        if (nextPlaying) {
          const target = playlist[currentTrackIndex];
          if (target?.url && !audio.src && (target.url.startsWith('http://') || target.url.startsWith('https://'))) {
            audio.src = target.url;
          }
          audio.play().catch(() => {});
        } else {
          audio.pause();
        }
      }
    }
  },

  nextTrack: () => {
    const { currentTrackIndex, playlist, isShuffle, isRepeat } = get();
    if (playlist.length === 0) return;

    if (isShuffle && playlist.length > 1) {
      let nextIndex = Math.floor(Math.random() * playlist.length);
      while (nextIndex === currentTrackIndex) {
        nextIndex = Math.floor(Math.random() * playlist.length);
      }
      set({ currentTrackIndex: nextIndex, isPlaying: true });
      return;
    }

    if (currentTrackIndex < playlist.length - 1) {
      set({ currentTrackIndex: currentTrackIndex + 1, isPlaying: true });
    } else if (isRepeat) {
      if (currentTrackIndex === 0) {
        set({ isPlaying: true });
        replayCurrentAudio();
      } else {
        set({ currentTrackIndex: 0, isPlaying: true });
      }
    } else {
      set({ isPlaying: false });
    }
  },

  previousTrack: () => {
    const { currentTrackIndex, playlist, isShuffle } = get();
    if (playlist.length === 0) return;

    if (isShuffle && playlist.length > 1) {
      let prevIndex = Math.floor(Math.random() * playlist.length);
      while (prevIndex === currentTrackIndex) {
        prevIndex = Math.floor(Math.random() * playlist.length);
      }
      set({ currentTrackIndex: prevIndex, isPlaying: true });
      return;
    }

    if (currentTrackIndex > 0) {
      set({ currentTrackIndex: currentTrackIndex - 1, isPlaying: true });
    } else {
      set({ currentTrackIndex: playlist.length - 1, isPlaying: true });
    }
  },

  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)), isMuted: volume === 0 }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),
  toggleRepeat: () => set((state) => ({ isRepeat: !state.isRepeat })),
}));
