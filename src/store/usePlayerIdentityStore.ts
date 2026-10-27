import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type PlayerType = string;

export type AuthCheckStatus = 'checking' | 'authorized' | 'unauthorized';

interface PlayerState {
  player: PlayerType;
  uid: string | null; // Firestore Anonymous UID
  tokenStatus: AuthCheckStatus;
  setPlayer: (player: PlayerType) => void;
  setUid: (uid: string) => void;
  setTokenStatus: (status: AuthCheckStatus) => void;
}

export const usePlayerIdentityStore = create<PlayerState>()(
  persist(
    (set) => ({
      player: 'visitante',
      uid: null,
      tokenStatus: 'checking',
      setPlayer: (player) => set({ player }),
      setUid: (uid) => set({ uid }),
      setTokenStatus: (tokenStatus) => set({ tokenStatus }),
    }),
    {
      name: 'romantic_engine_player', // name of the item in the storage (must be unique)
      partialize: (state) => ({ player: state.player }), // only persist player name, not uid or status
    }
  )
);
