import { create } from 'zustand';
import {
  loadAndPlayUnifiedTrack,
  resumeUnifiedAudio,
  pauseUnifiedAudio,
  replayCurrentAudio,
  stopUnifiedAudio,
  setUnifiedVolume,
  updateMediaSession,
} from '../features/player/useAudio';

export interface Track {
  id: string;
  title: string;
  artist: string;
  url: string; // The full URL from Firestore migration or Cloudinary or YouTube
  coverUrl?: string;
  duration?: number;
  videoId?: string;
  source?: string;
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

  setPlaylist: (tracks) => {
    const safeIdx = tracks.length > 0 ? 0 : -1;
    set({ playlist: tracks, currentTrackIndex: safeIdx, isPlaying: false });
    if (tracks.length > 0) {
      // Prepara a primeira faixa sem iniciar a reprodução (cue)
      loadAndPlayUnifiedTrack(tracks[0], false);
      updateMediaSession(tracks[0], false);
    } else {
      stopUnifiedAudio();
    }
  },

  setPlaylistAndPlay: (tracks, index = 0) => {
    if (tracks.length === 0) return;
    const safeIdx = Math.min(Math.max(0, index), tracks.length - 1);
    const target = tracks[safeIdx];
    set({ playlist: tracks, currentTrackIndex: safeIdx, isPlaying: true });
    updateMediaSession(target, true);
    loadAndPlayUnifiedTrack(target, true);
  },

  playTrack: (index) => {
    const { playlist, currentTrackIndex } = get();
    if (index >= 0 && index < playlist.length) {
      const target = playlist[index];
      updateMediaSession(target, true);
      if (index === currentTrackIndex) {
        set({ isPlaying: true });
        replayCurrentAudio();
      } else {
        set({ currentTrackIndex: index, isPlaying: true });
        loadAndPlayUnifiedTrack(target, true);
      }
    }
  },

  togglePlayPause: () => {
    const { currentTrackIndex, isPlaying, playlist } = get();
    if (currentTrackIndex !== -1 && playlist[currentTrackIndex]) {
      const nextPlaying = !isPlaying;
      set({ isPlaying: nextPlaying });
      const target = playlist[currentTrackIndex];
      updateMediaSession(target, nextPlaying);
      if (nextPlaying) {
        resumeUnifiedAudio(target);
      } else {
        pauseUnifiedAudio();
      }
    }
  },

  nextTrack: () => {
    const { currentTrackIndex, playlist, isShuffle, isRepeat } = get();
    if (playlist.length === 0) return;

    let nextIndex = currentTrackIndex;
    if (isShuffle && playlist.length > 1) {
      let rand = Math.floor(Math.random() * playlist.length);
      while (rand === currentTrackIndex) {
        rand = Math.floor(Math.random() * playlist.length);
      }
      nextIndex = rand;
    } else if (currentTrackIndex < playlist.length - 1) {
      nextIndex = currentTrackIndex + 1;
    } else if (isRepeat) {
      if (currentTrackIndex === 0) {
        set({ isPlaying: true });
        replayCurrentAudio();
        return;
      }
      nextIndex = 0;
    } else {
      set({ isPlaying: false });
      stopUnifiedAudio();
      return;
    }

    const nextT = playlist[nextIndex];
    set({ currentTrackIndex: nextIndex, isPlaying: true });
    updateMediaSession(nextT, true);
    loadAndPlayUnifiedTrack(nextT, true);
  },

  previousTrack: () => {
    const { currentTrackIndex, playlist, isShuffle } = get();
    if (playlist.length === 0) return;

    let prevIndex = 0;
    if (isShuffle && playlist.length > 1) {
      let rand = Math.floor(Math.random() * playlist.length);
      while (rand === currentTrackIndex) {
        rand = Math.floor(Math.random() * playlist.length);
      }
      prevIndex = rand;
    } else if (currentTrackIndex > 0) {
      prevIndex = currentTrackIndex - 1;
    } else {
      prevIndex = playlist.length - 1;
    }

    const prevT = playlist[prevIndex];
    set({ currentTrackIndex: prevIndex, isPlaying: true });
    updateMediaSession(prevT, true);
    loadAndPlayUnifiedTrack(prevT, true);
  },

  setVolume: (volume) => {
    const clamped = Math.max(0, Math.min(1, volume));
    const isMuted = clamped === 0;
    set({ volume: clamped, isMuted });
    setUnifiedVolume(clamped, isMuted);
  },

  toggleMute: () => {
    const nextMuted = !get().isMuted;
    set({ isMuted: nextMuted });
    setUnifiedVolume(get().volume, nextMuted);
  },

  toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),
  toggleRepeat: () => set((state) => ({ isRepeat: !state.isRepeat })),
}));
