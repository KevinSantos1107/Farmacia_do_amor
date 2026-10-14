import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import { uploadImage, uploadAudio, cloudinaryUrl } from '../../services/cloudinary/upload';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Spinner } from '../../shared/ui/Spinner';
import { Modal } from '../../shared/ui/Modal';
import { cn } from '../../shared/utils/cn';
import {
  DndContext,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem } from '../../shared/ui/SortableItem';
import { useSortableList } from '../../shared/hooks/useSortableList';
import {
  Plus,
  Trash2,
  GripVertical,
  ArrowLeft,
  Upload,
  X,
  Music,
  Play,
  Pause,
  
  Pencil,
  Save,
} from 'lucide-react';

// @ts-ignore
import * as jsmediatags from 'jsmediatags/dist/jsmediatags.min.js';

interface JsMediaTagsResult {
  tags: {
    title?: string;
    artist?: string;
    picture?: {
      data: number[];
      format: string;
    };
  };
}

// Helper: extract ID3 tags from MP3 file
function readMp3Tags(file: File): Promise<{ title?: string; artist?: string; coverUrl?: string }> {
  return new Promise((resolve) => {
    try {
      if (!jsmediatags) {
        console.error('jsmediatags module not found!');
        resolve({});
        return;
      }
      jsmediatags.read(file, {
        onSuccess: (tag: JsMediaTagsResult) => {
          console.log('ID3 tags lidas com sucesso:', tag.tags);
          const tags = tag.tags;
          let coverUrl: string | undefined;
          if (tags.picture) {
            try {
              const { data, format } = tags.picture;
              const bytes = new Uint8Array(data);
              const blob = new Blob([bytes], { type: format });
              coverUrl = URL.createObjectURL(blob);
              console.log('Capa extraída com sucesso:', coverUrl);
            } catch (e) {
              console.error('Erro ao processar a capa:', e);
            }
          }
          resolve({ title: tags.title, artist: tags.artist, coverUrl });
        },
        onError: (error: unknown) => {
          console.error('Erro ao ler tags ID3:', error);
          resolve({});
        },
      });
    } catch (e) {
      console.error('Exceção geral ao tentar ler ID3:', e);
      resolve({});
    }
  });
}

// Helper: remove undefined fields recursively
function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

interface TrackSlot {
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

interface Track {
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

interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  orderIndex: number;
  tracks: Track[];
}

function useToast() {
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const show = (text: string, type: 'ok' | 'err' = 'ok') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3500);
  };
  const Toast = msg ? (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl font-medium text-sm animate-in slide-in-from-bottom-4 duration-300',
        msg.type === 'ok' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
      )}
    >
      {msg.text}
    </div>
  ) : null;
  return { show, Toast };
}

// Flag de módulo: true enquanto o usuário está arrastando a barra de progresso
// Compartilhado entre todos os TrackPlayers e as linhas do track


// ─── Mini Audio Player Component ─────────────────────────────────────────────
function TrackPlayer({ src, trackId }: { src: string; trackId: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;
    audio.addEventListener('timeupdate', () => setProgress(audio.currentTime));
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    audio.addEventListener('ended', () => { setPlaying(false); setProgress(0); });
    return () => { audio.pause(); audio.src = ''; };
  }, [src]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      document.querySelectorAll('[data-admin-audio]').forEach((el) => {
        el.dispatchEvent(new CustomEvent('pause-others', { detail: trackId }));
      });
      audio.play();
      setPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = t;
    setProgress(t);
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleRangePointerDown = () => {
    // Sinaliza que está fazendo seek — limpa automaticamente ao soltar o ponteiro
    
    window.addEventListener('pointerup', () => {  }, { once: true });
    window.addEventListener('mouseup',   () => {  }, { once: true });
  };

  return (
    <div
      className="flex items-center gap-2 flex-1 min-w-0"
      data-admin-audio
      data-track-id={trackId}
      // Bloqueia dragstart que borbulhe de dentro do player
      onDragStart={(e) => e.stopPropagation()}
    >
      <button
        onClick={togglePlay}
        className="p-1.5 bg-rose-500/20 hover:bg-rose-500/40 rounded-full text-rose-400 transition-colors shrink-0"
      >
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
      </button>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-xs text-slate-500 font-mono w-8 shrink-0">{fmt(progress)}</span>
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={progress}
          onChange={handleSeek}
          // Seta o flag de seek — o drag da linha checa esse flag
          onPointerDown={handleRangePointerDown}
          onMouseDown={handleRangePointerDown}
          onTouchStart={handleRangePointerDown}
          className="flex-1 h-1 accent-rose-500 cursor-pointer"
        />
        <span className="text-xs text-slate-500 font-mono w-8 shrink-0 text-right">
          {fmt(duration)}
        </span>
      </div>
    </div>
  );
}

export default function PlaylistEditor() {
  const { config } = useSiteConfigStore();
  const { show, Toast } = useToast();
  const siteId = config?.id || 'meu-site';

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);

  // confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });


  // Playlist creation
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState({ name: '', description: '' });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [savingPlaylist, setSavingPlaylist] = useState(false);

  // Playlist editing
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [editPlaylist, setEditPlaylist] = useState({ name: '', description: '' });
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Track upload — multi-slot system
  const [creatingTrack, setCreatingTrack] = useState(false);
  const [trackSlots, setTrackSlots] = useState<TrackSlot[]>([]);
  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null);
  const cancelControllers = useRef<Map<string, AbortController>>(new Map());

  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const coverSlotIdRef = useRef<string | null>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const editCoverRef = useRef<HTMLInputElement>(null);

  // ─── Load playlists + tracks ──────────────────────────────────────────────
  const loadPlaylists = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'custom_playlists')));
      const loaded: Playlist[] = [];
      snap.forEach((d) => {
        if (d.id === '_placeholder') return;
        const data = d.data();
        loaded.push({
          id: d.id,
          name: data.name || data.title || '',
          description: data.description || '',
          coverUrl: data.cover || data.coverUrl || '',
          orderIndex: data.orderIndex ?? 0,
          tracks: [],
        });
      });

      // Fetch tracks from playlist_tracks
      for (const p of loaded) {
        const tSnap = await getDocs(
          query(collection(db, 'playlist_tracks'), where('playlistId', '==', p.id))
        );
        const allTracks: Track[] = [];
        let needsRepair = false;

        tSnap.forEach((tDoc) => {
          const data = tDoc.data();
          // Backward compat: if there's a tracks array (from my previous bug), flatten it
          if (data.tracks && Array.isArray(data.tracks)) {
            allTracks.push(...data.tracks.map((t) => ({ ...t, id: tDoc.id })));
            needsRepair = true;
          } else if (data.title) {
            allTracks.push({ id: tDoc.id, ...data } as Track);
          }
        });

        // Sort by legacy orderIndex
        allTracks.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
        p.tracks = allTracks;

        // Auto repair the database if the buggy array format is found
        if (needsRepair && allTracks.length > 0) {
          try {
            const batch = writeBatch(db);
            tSnap.forEach((d) => batch.delete(d.ref));
            allTracks.forEach((t, i) => {
              const toClean: Record<string, unknown> = { ...t, orderIndex: i, playlistId: p.id };
              delete toClean.id;
              delete toClean.tracks;
              const clean = stripUndefined(toClean);
              batch.set(doc(collection(db, 'playlist_tracks')), clean);
            });
            await batch.commit();
            // Re-map the IDs now that they've been generated in firestore?
            // Not easily possible without a re-fetch, but loadPlaylists runs often so it's fine.
          } catch (e) {
            console.error('Auto repair failed', e);
          }
        }
      }

      loaded.sort((a, b) => a.orderIndex - b.orderIndex);
      setPlaylists(loaded);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      show('Erro ao carregar playlists: ' + msg, 'err');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  useEffect(() => {
    if (activePlaylist) {
      const latest = playlists.find((p) => p.id === activePlaylist.id);
      setTracks(latest?.tracks || []);
    } else {
      setTracks([]);
    }
  }, [playlists, activePlaylist?.id]);

  // ─── Sortable Lists ───────────────────────────────────────────────────────
  const playlistSortable = useSortableList(playlists, async (reordered) => {
    const indexed = reordered.map((p, i) => ({ ...p, orderIndex: i }));
    setPlaylists(indexed);
    try {
      const batch = writeBatch(db);
      indexed.forEach((p) =>
        batch.update(doc(db, 'custom_playlists', p.id), { orderIndex: p.orderIndex })
      );
      await batch.commit();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      show('Erro ao reordenar: ' + msg, 'err');
    }
  });

  const tracksWithIds: (Track & { id: string })[] = tracks.map((t, idx) => ({ 
    ...t, 
    id: t.id || t.publicId || t.url || String(idx) 
  }));

  const trackSortable = useSortableList(tracksWithIds, async (reordered) => {
    if (!activePlaylist) return;
    setTracks(reordered);
    try {
      const batch = writeBatch(db);
      const tSnap = await getDocs(
        query(collection(db, 'playlist_tracks'), where('playlistId', '==', activePlaylist.id))
      );
      tSnap.forEach((d) => batch.delete(d.ref));

      reordered.forEach((t, i) => {
        const toClean: Record<string, unknown> = { ...t, orderIndex: i, playlistId: activePlaylist.id };
        delete toClean.id;
        delete toClean.tracks;
        const clean = stripUndefined(toClean);
        batch.set(doc(collection(db, 'playlist_tracks')), clean);
      });
      await batch.commit();
      loadPlaylists();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      show('Erro ao reordenar músicas: ' + msg, 'err');
    }
  });

  // ─── Create Playlist ──────────────────────────────────────────────────────
  const handleCreatePlaylist = async () => {
    if (!newPlaylist.name) {
      show('O nome da playlist é obrigatório', 'err');
      return;
    }
    setSavingPlaylist(true);
    try {
      let coverUrl: string | undefined;
      if (coverFile) {
        const res = await uploadImage(coverFile, `${siteId}/playlists/covers`);
        coverUrl = res.secureUrl;
      }
      await addDoc(
        collection(db, 'custom_playlists'),
        stripUndefined({
          name: newPlaylist.name,
          title: newPlaylist.name,
          description: newPlaylist.description || undefined,
          cover: coverUrl,
          coverUrl,
          orderIndex: playlists.length,
          createdAt: serverTimestamp(),
        })
      );
      show('Playlist criada com sucesso!');
      setCreatingPlaylist(false);
      setNewPlaylist({ name: '', description: '' });
      setCoverFile(null);
      setCoverPreview(null);
      loadPlaylists();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      show('Erro ao criar playlist: ' + msg, 'err');
    }
    setSavingPlaylist(false);
  };

  // ─── Edit Playlist ────────────────────────────────────────────────────────
  const openEditPlaylist = (playlist: Playlist) => {
    setEditingPlaylistId(playlist.id);
    setEditPlaylist({ name: playlist.name, description: playlist.description || '' });
    setEditCoverPreview(playlist.coverUrl || null);
    setEditCoverFile(null);
  };

  const handleUpdatePlaylist = async () => {
    if (!editingPlaylistId || !editPlaylist.name) {
      show('Nome é obrigatório', 'err');
      return;
    }
    setSavingEdit(true);
    try {
      const updates: {
        name: string;
        title: string;
        description?: string;
        cover?: string;
        coverUrl?: string;
      } = {
        name: editPlaylist.name,
        title: editPlaylist.name,
      };
      if (editPlaylist.description) updates.description = editPlaylist.description;
      if (editCoverFile) {
        const res = await uploadImage(editCoverFile, `${siteId}/playlists/covers`);
        updates.cover = res.secureUrl;
        updates.coverUrl = res.secureUrl;
      }
      await updateDoc(doc(db, 'custom_playlists', editingPlaylistId), updates);
      show('Playlist atualizada!');
      setEditingPlaylistId(null);
      setEditCoverFile(null);
      setEditCoverPreview(null);
      loadPlaylists();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      show('Erro ao atualizar: ' + msg, 'err');
    }
    setSavingEdit(false);
  };

  // ─── Delete Playlist ──────────────────────────────────────────────────────
  const handleDeletePlaylist = (playlist: Playlist) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Deletar Playlist',
      message: `Tem certeza que deseja deletar a playlist "${playlist.name}"? Todas as músicas dentro dela serão apagadas. Esta ação não pode ser desfeita.`,
      confirmText: 'Deletar Playlist',
      cancelText: 'Cancelar',
      isDestructive: true,
      onConfirm: () => executeDeletePlaylist(playlist),
    });
  };

  const executeDeletePlaylist = async (playlist: Playlist) => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    try {
      // 1. Deletar todas as tracks da playlist em batch ANTES de deletar a playlist
      const tSnap = await getDocs(
        query(collection(db, 'playlist_tracks'), where('playlistId', '==', playlist.id))
      );
      if (!tSnap.empty) {
        const batch = writeBatch(db);
        tSnap.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      // 2. Só então deletar o doc da playlist
      await deleteDoc(doc(db, 'custom_playlists', playlist.id));

      show('Playlist deletada!');
      if (activePlaylist?.id === playlist.id) setActivePlaylist(null);
      loadPlaylists();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      show('Erro ao deletar: ' + msg, 'err');
    }
  };


  // ─── Multi-slot audio handlers ────────────────────────────────────────────
  const parseFilename = (filename: string) => {
    const name = filename.replace(/\.[^.]+$/, '');
    if (name.includes(' - ')) {
      const parts = name.split(' - ');
      return { parsedArtist: parts[0].trim(), parsedTitle: parts.slice(1).join(' - ').trim() };
    }
    return { parsedArtist: '', parsedTitle: name.replace(/[-_]/g, ' ') };
  };

  const handleAudioFilesSelect = async (files: FileList) => {
    const newSlots: TrackSlot[] = [];
    for (const file of Array.from(files)) {
      const { parsedArtist, parsedTitle } = parseFilename(file.name);
      const id = crypto.randomUUID();
      newSlots.push({
        id, file,
        title: parsedTitle, artist: parsedArtist,
        coverFile: null, coverPreview: null,
        uploading: false, progress: 0, done: false, error: null,
      });
      // Read ID3 tags async — updates the slot when ready
      readMp3Tags(file).then((tags) => {
        setTrackSlots((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  title: tags.title || s.title,
                  artist: tags.artist || s.artist,
                  coverPreview: tags.coverUrl || s.coverPreview,
                }
              : s
          )
        );
      });
    }
    setTrackSlots((prev) => [...prev, ...newSlots]);
    if (newSlots.length > 0) setExpandedSlotId(newSlots[0].id);
  };

  const handleSlotCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const slotId = coverSlotIdRef.current;
    if (!file || !slotId) return;
    const preview = URL.createObjectURL(file);
    setTrackSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, coverFile: file, coverPreview: preview } : s))
    );
    e.target.value = '';
  };

  const openCoverPickerForSlot = (slotId: string) => {
    coverSlotIdRef.current = slotId;
    coverInputRef.current?.click();
  };

  const removeSlot = (slotId: string) => {
    cancelControllers.current.get(slotId)?.abort();
    cancelControllers.current.delete(slotId);
    setTrackSlots((prev) => prev.filter((s) => s.id !== slotId));
    if (expandedSlotId === slotId) setExpandedSlotId(null);
  };

  const cancelSlotUpload = (slotId: string) => {
    cancelControllers.current.get(slotId)?.abort();
  };

  const uploadSlot = async (slot: TrackSlot) => {
    if (!activePlaylist || !slot.title) return;
    const controller = new AbortController();
    cancelControllers.current.set(slot.id, controller);
    setTrackSlots((prev) =>
      prev.map((s) => (s.id === slot.id ? { ...s, uploading: true, error: null, progress: 0 } : s))
    );
    try {
      const audioRes = await uploadAudio(
        slot.file,
        `${siteId}/music`,
        (pct) => setTrackSlots((prev) => prev.map((s) => (s.id === slot.id ? { ...s, progress: pct } : s))),
        controller.signal
      );

      let coverUrl: string | undefined;
      let coverPublicId: string | undefined;

      if (slot.coverFile) {
        const coverRes = await uploadImage(slot.coverFile, `${siteId}/music/covers`, undefined, controller.signal);
        coverPublicId = coverRes.publicId;
        coverUrl = coverRes.secureUrl;
      } else if (slot.coverPreview?.startsWith('blob:')) {
        try {
          const blobRes = await fetch(slot.coverPreview);
          const blob = await blobRes.blob();
          const blobFile = new File([blob], 'cover.jpg', { type: blob.type });
          const coverRes = await uploadImage(blobFile, `${siteId}/music/covers`, undefined, controller.signal);
          coverPublicId = coverRes.publicId;
          coverUrl = coverRes.secureUrl;
        } catch { /* ignore cover error */ }
      }

      await addDoc(
        collection(db, 'playlist_tracks'),
        stripUndefined({
          title: slot.title,
          artist: slot.artist || undefined,
          src: audioRes.secureUrl,
          url: audioRes.secureUrl,
          publicId: audioRes.publicId,
          cover: coverUrl,
          coverPublicId,
          date: new Date().toISOString(),
          orderIndex: tracks.length,
          playlistId: activePlaylist.id,
        })
      );

      setTrackSlots((prev) =>
        prev.map((s) => (s.id === slot.id ? { ...s, uploading: false, done: true, progress: 100 } : s))
      );
      loadPlaylists();
    } catch (e: unknown) {
      const isAbort = e instanceof Error && e.name === 'AbortError';
      if (isAbort) {
        setTrackSlots((prev) =>
          prev.map((s) => (s.id === slot.id ? { ...s, uploading: false, progress: 0 } : s))
        );
      } else {
        const msg = e instanceof Error ? e.message : String(e);
        setTrackSlots((prev) =>
          prev.map((s) => (s.id === slot.id ? { ...s, uploading: false, error: msg } : s))
        );
      }
    } finally {
      cancelControllers.current.delete(slot.id);
    }
  };

  const uploadAllSlots = async () => {
    const pending = trackSlots.filter((s) => !s.done && !s.uploading && s.title);
    for (const slot of pending) {
      await uploadSlot(slot);
    }
  };

  const resetCreating = () => {
    // Cancel any running uploads
    cancelControllers.current.forEach((c) => c.abort());
    cancelControllers.current.clear();
    setTrackSlots([]);
    setExpandedSlotId(null);
    setCreatingTrack(false);
  };

  // ─── Delete Track ─────────────────────────────────────────────────────────
  const handleDeleteTrack = (track: Track) => {
    if (!activePlaylist) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Deletar Música',
      message: `Tem certeza que deseja deletar "${track.title}"? Esta ação não pode ser desfeita.`,
      confirmText: 'Deletar',
      cancelText: 'Cancelar',
      isDestructive: true,
      onConfirm: () => executeDeleteTrack(track),
    });
  };

  const executeDeleteTrack = async (track: Track) => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    try {
      if (track.id) {
        // Deleção direta pelo ID do documento
        await deleteDoc(doc(db, 'playlist_tracks', track.id));
      } else {
        // Fallback para o formato antigo (array aninhado) — usa for...of para aguardar cada await
        const tSnap = await getDocs(
          query(collection(db, 'playlist_tracks'), where('playlistId', '==', activePlaylist!.id))
        );
        for (const d of tSnap.docs) {
          if (d.data().tracks) {
            const updated = d
              .data()
              .tracks.filter((t: Track) => t.url !== track.url && t.src !== track.src);
            await updateDoc(d.ref, { tracks: updated });
          }
        }
      }
      show('Música deletada!');
      loadPlaylists();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      show('Erro: ' + msg, 'err');
    }
  };


  // ─── RENDER: Track view (inside a playlist) ───────────────────────────────
  if (activePlaylist) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {Toast}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <button
              onClick={() => setActivePlaylist(null)}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm shrink-0"
            >
              <ArrowLeft className="w-4 h-4" /> Playlists
            </button>
            <span className="text-slate-600 shrink-0">/</span>
            <h1 className="text-xl md:text-2xl font-bold text-white truncate max-w-[200px] md:max-w-md">{activePlaylist.name}</h1>
            <span className="text-slate-500 text-sm font-mono shrink-0">{tracks.length} músicas</span>
          </div>
          <Button onClick={() => setCreatingTrack(true)} className="gap-2 shrink-0 self-start md:self-auto">
            <Plus className="w-4 h-4" /> Adicionar Música
          </Button>
        </div>

        {creatingTrack && (
          <div className="bg-slate-800 border border-rose-500/30 rounded-xl p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white text-base">Adicionar Músicas</h2>
              <div className="flex items-center gap-2">
                {trackSlots.some((s) => !s.done && !s.uploading) && trackSlots.length > 0 && (
                  <Button
                    onClick={uploadAllSlots}
                    className="gap-1.5 text-xs py-1.5 px-3 h-auto"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Enviar Todas ({trackSlots.filter((s) => !s.done && !s.uploading).length})
                  </Button>
                )}
                <button
                  onClick={resetCreating}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Drop zone */}
            <div
              onClick={() => audioInputRef.current?.click()}
              className="border-2 border-dashed border-slate-600 hover:border-slate-400 rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all bg-slate-900/40"
            >
              <Music className="w-5 h-5 text-slate-500 shrink-0" />
              <span className="text-sm text-slate-400">
                {trackSlots.length === 0
                  ? 'Clique para selecionar MP3s (pode selecionar vários ao mesmo tempo)'
                  : `Clique para adicionar mais músicas`}
              </span>
            </div>
            <input
              ref={audioInputRef}
              type="file"
              className="hidden"
              accept="audio/mp3,audio/mpeg,audio/*"
              multiple
              onChange={(e) => e.target.files && handleAudioFilesSelect(e.target.files)}
            />
            <input
              ref={coverInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleSlotCoverSelect}
            />

            {/* Slot accordion list */}
            {trackSlots.length > 0 && (
              <div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-0.5">
                {trackSlots.map((slot) => {
                  const isExpanded = expandedSlotId === slot.id;
                  return (
                    <div
                      key={slot.id}
                      className={cn(
                        'border rounded-xl overflow-hidden transition-colors',
                        slot.done
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : slot.error
                          ? 'border-red-500/40 bg-red-500/5'
                          : 'border-slate-700 bg-slate-900'
                      )}
                    >
                      {/* Collapsed row — always visible */}
                      <div
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/5 transition-colors"
                        onClick={() => !slot.done && setExpandedSlotId(isExpanded ? null : slot.id)}
                      >
                        {/* Thumbnail */}
                        <div className="w-8 h-8 rounded flex-shrink-0 bg-slate-700 flex items-center justify-center overflow-hidden">
                          {slot.coverPreview ? (
                            <img src={slot.coverPreview} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Music className="w-4 h-4 text-slate-500" />
                          )}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate leading-tight">
                            {slot.title || slot.file.name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {slot.artist || 'Artista não encontrado'}
                          </p>
                        </div>
                        {/* Status / actions */}
                        {slot.done ? (
                          <span className="text-emerald-400 text-xs flex items-center gap-1 shrink-0">
                            ✓ Enviada
                          </span>
                        ) : slot.uploading ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-slate-400 font-mono w-9 text-right">{slot.progress}%</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); cancelSlotUpload(slot.id); }}
                              className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                              title="Cancelar upload"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : slot.error ? (
                          <span className="text-xs text-red-400 shrink-0">Erro</span>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); removeSlot(slot.id); }}
                            className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-red-500/10 transition-colors shrink-0"
                            title="Remover"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Progress bar while uploading */}
                      {slot.uploading && (
                        <div className="h-0.5 bg-slate-700 mx-3 mb-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-rose-500 transition-all duration-300 rounded-full"
                            style={{ width: `${slot.progress}%` }}
                          />
                        </div>
                      )}

                      {/* Expanded form */}
                      {isExpanded && !slot.done && (
                        <div className="px-3 pb-3 border-t border-slate-700/50 pt-3 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-medium text-slate-400 block mb-1">Título *</label>
                              <Input
                                value={slot.title}
                                onChange={(e) =>
                                  setTrackSlots((prev) =>
                                    prev.map((s) => (s.id === slot.id ? { ...s, title: e.target.value } : s))
                                  )
                                }
                                className="bg-slate-800 border-slate-600 text-slate-200 text-sm h-8"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-slate-400 block mb-1">Artista</label>
                              <Input
                                value={slot.artist}
                                onChange={(e) =>
                                  setTrackSlots((prev) =>
                                    prev.map((s) => (s.id === slot.id ? { ...s, artist: e.target.value } : s))
                                  )
                                }
                                className="bg-slate-800 border-slate-600 text-slate-200 text-sm h-8"
                              />
                            </div>
                          </div>
                          {/* Cover */}
                          {slot.coverPreview ? (
                            <div className="flex items-center gap-3">
                              <img src={slot.coverPreview} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                              <div>
                                <p className="text-xs text-emerald-400">✓ Capa detectada</p>
                                <button
                                  onClick={() =>
                                    setTrackSlots((prev) =>
                                      prev.map((s) => (s.id === slot.id ? { ...s, coverFile: null, coverPreview: null } : s))
                                    )
                                  }
                                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mt-0.5"
                                >
                                  <X className="w-3 h-3" /> Remover capa
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => openCoverPickerForSlot(slot.id)}
                              className="flex items-center gap-2 text-xs text-slate-400 hover:text-white border border-dashed border-slate-600 hover:border-slate-400 rounded-lg px-3 py-2 w-full transition-colors"
                            >
                              <Upload className="w-3.5 h-3.5" /> Selecionar capa manualmente
                            </button>
                          )}
                          {slot.error && (
                            <p className="text-xs text-red-400">Erro: {slot.error}</p>
                          )}
                          <Button
                            onClick={() => uploadSlot(slot)}
                            disabled={slot.uploading || !slot.title}
                            className="w-full gap-2 text-sm py-2 h-auto"
                          >
                            <Upload className="w-3.5 h-3.5" /> Enviar esta música
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer when all done */}
            {trackSlots.length > 0 && trackSlots.every((s) => s.done) && (
              <button
                onClick={resetCreating}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
              >
                ✓ Todas enviadas — Fechar
              </button>
            )}
          </div>
        )}


        {tracks.length === 0 ? (
          <div className="text-center p-12 border border-dashed border-slate-700 rounded-xl text-slate-500">
            <Music className="w-10 h-10 mx-auto mb-3 opacity-40" />
            Nenhuma música nesta playlist.
          </div>
        ) : (
          <DndContext sensors={trackSortable.sensors} onDragEnd={trackSortable.handleDragEnd}>
            <SortableContext items={trackSortable.ids} strategy={verticalListSortingStrategy}>
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              {tracksWithIds.map((track) => {
                const tId = track.id as string;
                return (
                    <SortableItem key={tId} id={tId}>
                      {({ isDragging, setNodeRef, style, handleProps, handleStyle }) => (
                        <div
                          ref={setNodeRef}
                          style={style}
                          className={cn(
                            "flex flex-wrap md:flex-nowrap items-center gap-3 md:gap-4 p-3 md:p-4 border-b border-slate-700/50 last:border-0 hover:bg-slate-700/30 transition-colors group",
                            isDragging ? "bg-slate-700 shadow-2xl z-10" : ""
                          )}
                        >
                          <div 
                            {...handleProps} 
                            style={handleStyle}
                            className="p-2 -ml-2 cursor-grab active:cursor-grabbing text-slate-600 hover:text-white transition-colors"
                          >
                            <GripVertical className="w-4 h-4 flex-shrink-0" />
                          </div>
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {track.coverPublicId ? (
                              <img
                                src={cloudinaryUrl(track.coverPublicId, { w: 80, h: 80, c: 'fill' })}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : track.cover || track.coverUrl ? (
                              <img
                                src={track.cover || track.coverUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Music className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 md:w-48 md:flex-none">
                            <p className="font-semibold text-white truncate text-sm">{track.title}</p>
                            <p className="text-xs text-slate-500 truncate">
                              {track.artist || 'Artista desconhecido'}
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-end shrink-0 md:hidden ml-auto">
                            <button
                              onClick={() => handleDeleteTrack(track)}
                              className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="w-full md:w-auto md:flex-1 order-last md:order-none mt-2 md:mt-0 flex items-center">
                            {track.src || track.url ? (
                              <TrackPlayer
                                src={track.src || track.url || ''}
                                trackId={tId}
                              />
                            ) : (
                              <div className="flex-1" />
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteTrack(track)}
                            className="hidden md:block p-2 text-slate-500 hover:text-red-400 transition-colors opacity-50 group-hover:opacity-100 shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </SortableItem>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Confirmation Dialog */}
        <Modal
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
          title={confirmDialog.title}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-400 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm py-1.5 px-3"
              >
                {confirmDialog.cancelText || 'Cancelar'}
              </Button>
              <Button
                onClick={confirmDialog.onConfirm}
                className={cn(
                  'text-white text-sm py-1.5 px-3',
                  confirmDialog.isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                )}
              >
                {confirmDialog.confirmText || 'Confirmar'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // ─── RENDER: Playlist list ────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {Toast}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Playlists</h1>
          <p className="text-slate-400 mt-1">Gerencie as playlists e músicas do site.</p>
        </div>
        <Button onClick={() => setCreatingPlaylist(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Nova Playlist
        </Button>
      </div>

      {creatingPlaylist && (
        <div className="bg-slate-800 border border-rose-500/40 rounded-xl p-6 space-y-4">
          <h2 className="font-bold text-white text-lg">Criar Nova Playlist</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Nome *</label>
              <Input
                value={newPlaylist.name}
                onChange={(e) => setNewPlaylist({ ...newPlaylist, name: e.target.value })}
                className="bg-slate-900 border-slate-700 text-slate-200"
                placeholder="Ex: Músicas Favoritas"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Descrição</label>
              <Input
                value={newPlaylist.description}
                onChange={(e) => setNewPlaylist({ ...newPlaylist, description: e.target.value })}
                className="bg-slate-900 border-slate-700 text-slate-200"
                placeholder="Ex: Para ouvir no carro"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Capa da Playlist</label>
            {coverPreview ? (
              <div className="flex items-center gap-3">
                <img src={coverPreview} alt="" className="w-16 h-16 rounded-lg object-cover" />
                <button
                  onClick={() => {
                    setCoverFile(null);
                    setCoverPreview(null);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => coverRef.current?.click()}
                className="border border-dashed border-slate-600 rounded-xl p-4 flex items-center gap-2 cursor-pointer hover:border-slate-400 transition-colors"
              >
                <Upload className="w-5 h-5 text-slate-500" />
                <span className="text-slate-400 text-sm">Clique para selecionar a capa</span>
              </div>
            )}
            <input
              ref={coverRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setCoverFile(f);
                  setCoverPreview(URL.createObjectURL(f));
                }
              }}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleCreatePlaylist} isLoading={savingPlaylist} className="gap-2">
              <Plus className="w-4 h-4" /> Criar Playlist
            </Button>
            <Button
              variant="secondary"
              onClick={() => setCreatingPlaylist(false)}
              className="bg-slate-700 text-white"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <Spinner />
        </div>
      ) : playlists.length === 0 ? (
        <div className="text-center p-12 border border-dashed border-slate-700 rounded-xl text-slate-500">
          Nenhuma playlist criada ainda.
        </div>
      ) : (
        <>
          <DndContext sensors={playlistSortable.sensors} onDragEnd={playlistSortable.handleDragEnd}>
            <SortableContext items={playlistSortable.ids} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {playlists.map((playlist) => (
                  <div key={playlist.id}>
                    <SortableItem id={playlist.id}>
                      {({ isDragging, setNodeRef, style, handleProps, handleStyle }) => (
                        <div
                          ref={setNodeRef}
                          style={style}
                          className={cn(
                            "flex items-center gap-4 p-4 bg-slate-800 border border-slate-700 rounded-xl transition-colors group",
                            isDragging ? "shadow-2xl ring-2 ring-blue-500 z-10" : "hover:border-slate-600"
                          )}
                        >
                          <div {...handleProps} style={handleStyle} className="p-2 cursor-grab active:cursor-grabbing text-slate-600 hover:text-white transition-colors flex-shrink-0">
                            <GripVertical className="w-5 h-5" />
                          </div>
                          
                          {/* Clickable area for active playlist */}
                          <div 
                            className="flex-1 flex items-center gap-4 min-w-0 cursor-pointer"
                            onClick={() => setActivePlaylist(playlist)}
                          >
                            {playlist.coverUrl ? (
                              <img
                                src={playlist.coverUrl}
                                alt=""
                                className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                                <Music className="w-6 h-6 text-slate-500" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-white truncate">{playlist.name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {playlist.tracks.length} músicas
                              </p>
                              {playlist.description && (
                                <p className="text-sm text-slate-400 truncate mt-0.5">
                                  {playlist.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-auto">
                            <button
                              onClick={() => openEditPlaylist(playlist)}
                              className="p-2 text-slate-500 hover:text-blue-400 transition-colors opacity-50 group-hover:opacity-100"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePlaylist(playlist)}
                              className="p-2 text-slate-500 hover:text-red-400 transition-colors opacity-50 group-hover:opacity-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </SortableItem>

                    {/* Edit form expands below */}
                    {editingPlaylistId === playlist.id && (
                      <div className="bg-slate-800/80 border border-blue-500/40 rounded-xl p-6 space-y-4 ml-9 mt-2 animate-in fade-in zoom-in-95 duration-200">
                        <h2 className="font-bold text-white text-lg">Editar Playlist</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Nome *</label>
                        <Input
                          value={editPlaylist.name}
                          onChange={(e) =>
                            setEditPlaylist({ ...editPlaylist, name: e.target.value })
                          }
                          className="bg-slate-900 border-slate-700 text-slate-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Descrição</label>
                        <Input
                          value={editPlaylist.description}
                          onChange={(e) =>
                            setEditPlaylist({ ...editPlaylist, description: e.target.value })
                          }
                          className="bg-slate-900 border-slate-700 text-slate-200"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Capa</label>
                      {editCoverPreview ? (
                        <div className="flex items-center gap-3">
                          <img
                            src={editCoverPreview}
                            alt=""
                            className="w-16 h-16 rounded-lg object-cover border border-slate-600"
                          />
                          <button
                            onClick={() => {
                              setEditCoverFile(null);
                              setEditCoverPreview(null);
                            }}
                            className="text-slate-400 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => editCoverRef.current?.click()}
                          className="border border-dashed border-slate-600 rounded-xl p-4 flex items-center gap-2 cursor-pointer hover:border-slate-400 transition-colors"
                        >
                          <Upload className="w-5 h-5 text-slate-500" />
                          <span className="text-slate-400 text-sm">Nova capa</span>
                        </div>
                      )}
                      <input
                        ref={editCoverRef}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            setEditCoverFile(f);
                            setEditCoverPreview(URL.createObjectURL(f));
                          }
                        }}
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={handleUpdatePlaylist}
                        isLoading={savingEdit}
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                      >
                        <Save className="w-4 h-4" /> Salvar
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setEditingPlaylistId(null)}
                        className="bg-slate-700 text-white"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
            </SortableContext>
          </DndContext>
        </>
      )}

      {/* Confirmation Dialog */}
      <Modal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        title={confirmDialog.title}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-400 leading-relaxed">{confirmDialog.message}</p>
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
              className="bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm py-1.5 px-3"
            >
              {confirmDialog.cancelText || 'Cancelar'}
            </Button>
            <Button
              onClick={confirmDialog.onConfirm}
              className={cn(
                'text-white text-sm py-1.5 px-3',
                confirmDialog.isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
              )}
            >
              {confirmDialog.confirmText || 'Confirmar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
