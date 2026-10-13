import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type PlayerType = string;

interface PlayerState {
  player: PlayerType;
  uid: string | null; // Firestore Anonymous UID
  setPlayer: (player: PlayerType) => void;
  setUid: (uid: string) => void;
}

export const usePlayerIdentityStore = create<PlayerState>()(
  persist(
    (set) => ({
      player: 'visitante',
      uid: null,
      setPlayer: (player) => set({ player }),
      setUid: (uid) => set({ uid }),
    }),
    {
      name: 'romantic_engine_player', // name of the item in the storage (must be unique)
      partialize: (state) => ({ player: state.player }), // only persist player name, not uid (uid is handled by firebase auth state)
    }
  )
);
