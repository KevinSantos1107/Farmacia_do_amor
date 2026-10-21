import { create } from 'zustand';

export type ModalType =
  | 'word-game'
  | 'snake'
  | 'star-map'
  | 'timeline'
  | 'couple-quiz'
  | 'memory-game'
  | 'sync'
  | 'devotional'
  | null;

interface ModalsState {
  activeModal: ModalType;
  openModal: (modal: ModalType) => void;
  closeModal: () => void;
}

export const useModalsStore = create<ModalsState>((set) => ({
  activeModal: null,
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),
}));
