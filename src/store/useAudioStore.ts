import { create } from 'zustand';

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

  playTrack: (index) => {
    const { playlist } = get();
    if (index >= 0 && index < playlist.length) {
      set({ currentTrackIndex: index, isPlaying: true });
    }
  },

  togglePlayPause: () => {
    const { currentTrackIndex, isPlaying } = get();
    if (currentTrackIndex !== -1) {
      set({ isPlaying: !isPlaying });
    }
  },

  nextTrack: () => {
    const { currentTrackIndex, playlist, isShuffle, isRepeat } = get();
    if (playlist.length === 0) return;

    if (isShuffle) {
      let nextIndex = Math.floor(Math.random() * playlist.length);
      // Evitar tocar a mesma repetida na roleta, se possível
      if (nextIndex === currentTrackIndex && playlist.length > 1) {
        nextIndex = (nextIndex + 1) % playlist.length;
      }
      set({ currentTrackIndex: nextIndex, isPlaying: true });
      return;
    }

    if (currentTrackIndex < playlist.length - 1) {
      set({ currentTrackIndex: currentTrackIndex + 1, isPlaying: true });
    } else if (isRepeat) {
      set({ currentTrackIndex: 0, isPlaying: true });
    } else {
      set({ isPlaying: false }); // Fim da playlist sem repetir
    }
  },

  previousTrack: () => {
    const { currentTrackIndex, playlist } = get();
    if (playlist.length === 0) return;

    if (currentTrackIndex > 0) {
      set({ currentTrackIndex: currentTrackIndex - 1, isPlaying: true });
    } else {
      // Se tiver no início, volta pra primeira tocando do zero, ou vai pro final
      set({ currentTrackIndex: playlist.length - 1, isPlaying: true });
    }
  },

  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)), isMuted: volume === 0 }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),
  toggleRepeat: () => set((state) => ({ isRepeat: !state.isRepeat })),
}));
