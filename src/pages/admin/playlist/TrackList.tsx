import { useState } from 'react';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { GripVertical, Trash2, Music } from 'lucide-react';
import { SortableItem } from '../../../shared/ui/SortableItem';
import { cn } from '../../../shared/utils/cn';
import { useSortableList } from '../../../shared/hooks/useSortableList';
import { TrackPlayer } from './TrackPlayer';
import { resolveMediaCoverUrl } from './playlistUtils';
import type { Track } from './types';

interface TrackListProps {
  tracks: Track[];
  tracksWithIds: (Track & { id: string })[];
  trackSortable: ReturnType<typeof useSortableList<Track & { id: string }>>;
  onDeleteTrack: (track: Track) => void;
}

function TrackCover({ track }: { track: Track }) {
  const [hasError, setHasError] = useState(false);
  const rawCover = track.coverPublicId || track.coverUrl || track.cover;
  const coverUrl = resolveMediaCoverUrl(rawCover);

  if (!coverUrl || hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-700/60 text-slate-400">
        <Music className="w-4 h-4" />
      </div>
    );
  }

  return (
    <img
      src={coverUrl}
      alt={track.title || 'Capa da música'}
      className="w-full h-full object-cover"
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
}

export function TrackList({
  tracks,
  tracksWithIds,
  trackSortable,
  onDeleteTrack,
}: TrackListProps) {
  if (tracks.length === 0) {
    return (
      <div className="text-center p-12 border border-dashed border-slate-700 rounded-xl text-slate-500">
        <Music className="w-10 h-10 mx-auto mb-3 opacity-40" />
        Nenhuma música nesta playlist.
      </div>
    );
  }

  return (
    <DndContext sensors={trackSortable.sensors} onDragEnd={trackSortable.handleDragEnd}>
      <SortableContext items={trackSortable.ids} strategy={verticalListSortingStrategy}>
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden divide-y divide-slate-700/50">
          {tracksWithIds.map((track) => {
            const tId = track.id;
            return (
              <SortableItem key={tId} id={tId}>
                {({ isDragging, setNodeRef, style, handleProps, handleStyle }) => (
                  <div
                    ref={setNodeRef}
                    style={style}
                    className={cn(
                      'flex flex-col md:flex-row md:items-center gap-3 p-3 md:p-4 hover:bg-slate-700/30 transition-colors group',
                      isDragging ? 'bg-slate-700 shadow-2xl z-10' : ''
                    )}
                  >
                    {/* Linha principal de identificação (Grip, Capa, Nome/Artista e Botão Deletar no mobile) */}
                    <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                      <div
                        {...handleProps}
                        style={handleStyle}
                        className="p-1.5 -ml-1 cursor-grab active:cursor-grabbing text-slate-500 hover:text-white transition-colors shrink-0"
                        title="Arrastar para reordenar"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden border border-white/5">
                        <TrackCover track={track} />
                      </div>

                      <div className="flex-1 min-w-0 pr-1">
                        <p className="font-semibold text-white truncate text-sm" title={track.title}>
                          {track.title}
                        </p>
                        <p className="text-xs text-slate-400 truncate" title={track.artist || 'Artista desconhecido'}>
                          {track.artist || 'Artista desconhecido'}
                        </p>
                      </div>

                      {/* Botão Deletar no Mobile (< md) */}
                      <button
                        onClick={() => onDeleteTrack(track)}
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors md:hidden shrink-0 rounded-lg hover:bg-red-500/10"
                        aria-label="Deletar música"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Área do Player de Áudio */}
                    <div className="w-full md:w-auto md:flex-1 md:max-w-md lg:max-w-none flex items-center min-w-0 pl-7 md:pl-0">
                      {track.src || track.url ? (
                        <TrackPlayer src={track.src || track.url || ''} trackId={tId} />
                      ) : (
                        <div className="flex-1" />
                      )}
                    </div>

                    {/* Botão Deletar no Tablet e Desktop (>= md) */}
                    <button
                      onClick={() => onDeleteTrack(track)}
                      className="hidden md:flex items-center justify-center p-2 text-slate-400 hover:text-red-400 transition-colors shrink-0 rounded-lg hover:bg-red-500/10"
                      aria-label="Deletar música"
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
  );
}
