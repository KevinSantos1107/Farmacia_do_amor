import { useState, useEffect, useCallback, useRef } from 'react';
import {
  query,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { siteCollection, siteDoc, useSiteId } from '../../services/firestore/paths';
import { uploadImage } from '../../services/cloudinary/upload';
import { Button } from '../../shared/ui/Button';
import { Spinner } from '../../shared/ui/Spinner';
import { useSortableList } from '../../shared/hooks/useSortableList';
import { Plus } from 'lucide-react';
import { AdminPageHeader } from './AdminPageHeader';
import { useOverlayHistory } from '../../shared/hooks/useOverlayHistory';

import type { Track, Playlist, ConfirmDialogState } from './playlist/types';
import {
  stripUndefined,
  fetchAndRepairPlaylistTracks,
  reorderPlaylistTracks,
} from './playlist/playlistUtils';
import { useToast } from './playlist/useToast';
import { useTrackUpload } from './playlist/useTrackUpload';
import { ConfirmModal } from './playlist/ConfirmModal';
import { TrackList } from './playlist/TrackList';
import { TrackUploadSection } from './playlist/TrackUploadSection';
import { PlaylistCreateCard } from './playlist/PlaylistCreateCard';
import { PlaylistList } from './playlist/PlaylistList';

export default function PlaylistEditor() {
  const { show, Toast } = useToast();
  const siteId = useSiteId();

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);

  useOverlayHistory({
    id: 'admin-playlist-detail',
    isOpen: !!activePlaylist,
    onClose: () => setActivePlaylist(null),
  });

  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
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

  // ─── Load playlists + tracks ──────────────────────────────────────────────
  const loadPlaylists = useCallback(async () => {
    if (isFirstLoad.current) {
      setLoading(true);
    }
    try {
      const snap = await getDocs(query(siteCollection('custom_playlists', siteId)));
      const loaded: Playlist[] = [];
      snap.forEach((d) => {
        if (d.id.startsWith('_')) return;
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

      for (const p of loaded) {
        p.tracks = await fetchAndRepairPlaylistTracks(p.id, siteId);
      }

      loaded.sort((a, b) => a.orderIndex - b.orderIndex);
      setPlaylists(loaded);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      show('Erro ao carregar playlists: ' + msg, 'err');
    } finally {
      setLoading(false);
      isFirstLoad.current = false;
    }
  }, [show, siteId]);

  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  const activePlaylistId = activePlaylist?.id;
  useEffect(() => {
    if (activePlaylistId) {
      const latest = playlists.find((p) => p.id === activePlaylistId);
      setTracks(latest?.tracks || []);
    } else {
      setTracks([]);
    }
  }, [playlists, activePlaylistId]);

  // Track upload hook
  const {
    creatingTrack,
    setCreatingTrack,
    trackSlots,
    setTrackSlots,
    expandedSlotId,
    setExpandedSlotId,
    handleAudioFilesSelect,
    handleSlotCoverSelect,
    handleRemoveCoverForSlot,
    removeSlot,
    cancelSlotUpload,
    uploadSlot,
    uploadAllSlots,
    resetCreating,
  } = useTrackUpload({
    siteId,
    activePlaylist,
    tracks,
    onUploadSuccess: loadPlaylists,
  });

  // ─── Sortable Lists ───────────────────────────────────────────────────────
  const playlistSortable = useSortableList(playlists, async (reordered) => {
    const indexed = reordered.map((p, i) => ({ ...p, orderIndex: i }));
    setPlaylists(indexed);
    try {
      const batch = writeBatch(db);
      indexed.forEach((p) =>
        batch.update(siteDoc('custom_playlists', p.id, siteId), { orderIndex: p.orderIndex })
      );
      await batch.commit();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      show('Erro ao reordenar: ' + msg, 'err');
    }
  });

  const tracksWithIds: (Track & { id: string })[] = tracks.map((t, idx) => ({
    ...t,
    id: t.id || t.publicId || t.url || String(idx),
  }));

  const trackSortable = useSortableList(tracksWithIds, async (reordered) => {
    if (!activePlaylist) return;
    setTracks(reordered);
    try {
      await reorderPlaylistTracks(activePlaylist.id, reordered, siteId);
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
        siteCollection('custom_playlists', siteId),
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
      await updateDoc(siteDoc('custom_playlists', editingPlaylistId, siteId), updates);
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
      const { where: firestoreWhere } = await import('firebase/firestore');
      const tSnap = await getDocs(
        query(siteCollection('playlist_tracks', siteId), firestoreWhere('playlistId', '==', playlist.id))
      );
      if (!tSnap.empty) {
        const batch = writeBatch(db);
        tSnap.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      await deleteDoc(siteDoc('custom_playlists', playlist.id, siteId));

      show('Playlist deletada!');
      if (activePlaylist?.id === playlist.id) setActivePlaylist(null);
      loadPlaylists();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      show('Erro ao deletar: ' + msg, 'err');
    }
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
        await deleteDoc(siteDoc('playlist_tracks', track.id, siteId));
      } else {
        const { where: firestoreWhere } = await import('firebase/firestore');
        const tSnap = await getDocs(
          query(siteCollection('playlist_tracks', siteId), firestoreWhere('playlistId', '==', activePlaylist!.id))
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
            <button
              onClick={() => setActivePlaylist(null)}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm shrink-0"
            >
              ← Playlists
            </button>
            <span className="text-slate-600 shrink-0">/</span>
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate max-w-[240px] sm:max-w-md">
              {activePlaylist.name}
            </h1>
            <span className="text-slate-500 text-xs sm:text-sm font-mono shrink-0">
              {tracks.length} músicas
            </span>
          </div>
          <Button
            onClick={() => setCreatingTrack(true)}
            className="gap-2 shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Adicionar Música
          </Button>
        </div>

        {creatingTrack && (
          <TrackUploadSection
            trackSlots={trackSlots}
            expandedSlotId={expandedSlotId}
            onSetExpandedSlotId={setExpandedSlotId}
            onAudioFilesSelect={handleAudioFilesSelect}
            onSlotCoverSelect={handleSlotCoverSelect}
            onRemoveCoverForSlot={handleRemoveCoverForSlot}
            onRemoveSlot={removeSlot}
            onCancelSlotUpload={cancelSlotUpload}
            onUploadSlot={uploadSlot}
            onUploadAllSlots={uploadAllSlots}
            onUpdateSlotTitle={(slotId, title) =>
              setTrackSlots((prev) =>
                prev.map((s) => (s.id === slotId ? { ...s, title } : s))
              )
            }
            onUpdateSlotArtist={(slotId, artist) =>
              setTrackSlots((prev) =>
                prev.map((s) => (s.id === slotId ? { ...s, artist } : s))
              )
            }
            onResetCreating={resetCreating}
          />
        )}

        <TrackList
          tracks={tracks}
          tracksWithIds={tracksWithIds}
          trackSortable={trackSortable}
          onDeleteTrack={handleDeleteTrack}
          playlistCoverUrl={activePlaylist.coverUrl}
        />

        <ConfirmModal
          dialog={confirmDialog}
          onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        />
      </div>
    );
  }

  // ─── RENDER: Playlist list ────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {Toast}
      <AdminPageHeader
        title="Playlists"
        description="Gerencie as playlists e músicas do site."
        actions={
          <Button onClick={() => setCreatingPlaylist(true)} className="gap-2 shrink-0 self-start sm:self-auto">
            <Plus className="w-4 h-4" /> Nova Playlist
          </Button>
        }
      />

      {creatingPlaylist && (
        <PlaylistCreateCard
          newPlaylist={newPlaylist}
          onChangeNewPlaylist={setNewPlaylist}
          coverPreview={coverPreview}
          onSelectCover={(file) => {
            setCoverFile(file);
            setCoverPreview(URL.createObjectURL(file));
          }}
          onRemoveCover={() => {
            setCoverFile(null);
            setCoverPreview(null);
          }}
          savingPlaylist={savingPlaylist}
          onCreate={handleCreatePlaylist}
          onCancel={() => setCreatingPlaylist(false)}
        />
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
        <PlaylistList
          playlists={playlists}
          playlistSortable={playlistSortable}
          onSelectPlaylist={setActivePlaylist}
          onDeletePlaylist={handleDeletePlaylist}
          editingPlaylistId={editingPlaylistId}
          onOpenEditPlaylist={openEditPlaylist}
          editPlaylist={editPlaylist}
          onChangeEditPlaylist={setEditPlaylist}
          editCoverPreview={editCoverPreview}
          onSelectEditCover={(file) => {
            setEditCoverFile(file);
            setEditCoverPreview(URL.createObjectURL(file));
          }}
          onRemoveEditCover={() => {
            setEditCoverFile(null);
            setEditCoverPreview(null);
          }}
          savingEdit={savingEdit}
          onUpdatePlaylist={handleUpdatePlaylist}
          onCancelEdit={() => setEditingPlaylistId(null)}
        />
      )}

      <ConfirmModal
        dialog={confirmDialog}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
