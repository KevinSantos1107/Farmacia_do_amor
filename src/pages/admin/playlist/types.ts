export interface JsMediaTagsResult {
  tags: {
    title?: string;
    artist?: string;
    picture?: {
      data: number[];
      format: string;
    };
  };
}

export interface TrackSlot {
  id: string;
  file: File;
  title: string;
  artist: string;
  coverFile: File | null;
  coverPreview: string | null;
  uploading: boolean;
  progress: number;
  done: boolean;
  error: string | null;
}

export interface Track {
  id?: string;
  publicId?: string;
  url?: string;
  src?: string; // campo legado do site antigo
  cover?: string; // campo legado do site antigo (URL completa)
  title: string;
  artist?: string;
  coverPublicId?: string;
  coverUrl?: string;
  date?: string;
  orderIndex?: number;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  orderIndex: number;
  tracks: Track[];
}

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
}
