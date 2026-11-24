import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type PlayerType = string;

export type AuthCheckStatus = 'checking' | 'authorized' | 'unauthorized';

interface PlayerState {
  player: PlayerType;
  tokenId: string | null;
  uid: string | null; // Firestore Anonymous UID
  tokenStatus: AuthCheckStatus;
  setPlayer: (player: PlayerType) => void;
  setTokenId: (tokenId: string | null) => void;
  setUid: (uid: string) => void;
  setTokenStatus: (status: AuthCheckStatus) => void;
  clearSession: () => void;
}

export const usePlayerIdentityStore = create<PlayerState>()(
  persist(
    (set) => ({
      player: 'visitante',
      tokenId: null,
      uid: null,
      tokenStatus: 'checking',
      setPlayer: (player) => set({ player }),
      setTokenId: (tokenId) => set({ tokenId }),
      setUid: (uid) => set({ uid }),
      setTokenStatus: (tokenStatus) => set({ tokenStatus }),
      clearSession: () =>
        set({
          player: 'visitante',
          tokenId: null,
          tokenStatus: 'unauthorized',
        }),
    }),
    {
      name: 'romantic_engine_player', // name of the item in the storage (must be unique)
      partialize: (state) => ({ player: state.player, tokenId: state.tokenId }), // persist player and tokenId
    }
  )
);
