import { useRef, useState } from 'react';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { GripVertical, Music, Pencil, Trash2, Upload, X, Save } from 'lucide-react';
import { SortableItem } from '../../../shared/ui/SortableItem';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { cn } from '../../../shared/utils/cn';
import { useSortableList } from '../../../shared/hooks/useSortableList';
import { resolveMediaCoverUrl } from './playlistUtils';
import type { Playlist } from './types';

function PlaylistCover({ coverUrl, name }: { coverUrl?: string; name: string }) {
  const [hasError, setHasError] = useState(false);
  const resolved = resolveMediaCoverUrl(coverUrl);

  if (!resolved || hasError) {
    return (
      <div className="w-14 h-14 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
        <Music className="w-6 h-6 text-slate-500" />
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={name}
      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
}

interface PlaylistListProps {
  playlists: Playlist[];
  playlistSortable: ReturnType<typeof useSortableList<Playlist>>;
  onSelectPlaylist: (playlist: Playlist) => void;
  onDeletePlaylist: (playlist: Playlist) => void;
  editingPlaylistId: string | null;
  onOpenEditPlaylist: (playlist: Playlist) => void;
  editPlaylist: { name: string; description: string };
  onChangeEditPlaylist: (data: { name: string; description: string }) => void;
  editCoverPreview: string | null;
  onSelectEditCover: (file: File) => void;
  onRemoveEditCover: () => void;
  savingEdit: boolean;
  onUpdatePlaylist: () => void;
  onCancelEdit: () => void;
}

export function PlaylistList({
  playlists,
  playlistSortable,
  onSelectPlaylist,
  onDeletePlaylist,
  editingPlaylistId,
  onOpenEditPlaylist,
  editPlaylist,
  onChangeEditPlaylist,
  editCoverPreview,
  onSelectEditCover,
  onRemoveEditCover,
  savingEdit,
  onUpdatePlaylist,
  onCancelEdit,
}: PlaylistListProps) {
  const editCoverRef = useRef<HTMLInputElement>(null);

  return (
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
                      'flex items-center gap-4 p-4 bg-slate-800 border border-slate-700 rounded-xl transition-colors group',
                      isDragging ? 'shadow-2xl ring-2 ring-blue-500 z-10' : 'hover:border-slate-600'
                    )}
                  >
                    <div
                      {...handleProps}
                      style={handleStyle}
                      className="p-2 cursor-grab active:cursor-grabbing text-slate-600 hover:text-white transition-colors flex-shrink-0"
                    >
                      <GripVertical className="w-5 h-5" />
                    </div>

                    {/* Clickable area for active playlist */}
                    <div
                      className="flex-1 flex items-center gap-4 min-w-0 cursor-pointer"
                      onClick={() => onSelectPlaylist(playlist)}
                    >
                      <PlaylistCover coverUrl={playlist.coverUrl} name={playlist.name} />
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
                        onClick={() => onOpenEditPlaylist(playlist)}
                        className="p-2 text-slate-500 hover:text-blue-400 transition-colors opacity-50 group-hover:opacity-100"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeletePlaylist(playlist)}
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
                          onChangeEditPlaylist({ ...editPlaylist, name: e.target.value })
                        }
                        className="bg-slate-900 border-slate-700 text-slate-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Descrição</label>
                      <Input
                        value={editPlaylist.description}
                        onChange={(e) =>
                          onChangeEditPlaylist({ ...editPlaylist, description: e.target.value })
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
                        <button onClick={onRemoveEditCover} className="text-slate-400 hover:text-white">
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
                      accept="image/*,.heic,.heif,.HEIC,.HEIF"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onSelectEditCover(f);
                      }}
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={onUpdatePlaylist}
                      isLoading={savingEdit}
                      className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                    >
                      <Save className="w-4 h-4" /> Salvar
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={onCancelEdit}
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
  );
}
