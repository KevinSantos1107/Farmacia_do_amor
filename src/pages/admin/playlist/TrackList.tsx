import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { GripVertical, Trash2, Music } from 'lucide-react';
import { SortableItem } from '../../../shared/ui/SortableItem';
import { cloudinaryUrl } from '../../../services/cloudinary/upload';
import { cn } from '../../../shared/utils/cn';
import { useSortableList } from '../../../shared/hooks/useSortableList';
import { TrackPlayer } from './TrackPlayer';
import type { Track } from './types';

interface TrackListProps {
  tracks: Track[];
  tracksWithIds: (Track & { id: string })[];
  trackSortable: ReturnType<typeof useSortableList<Track & { id: string }>>;
  onDeleteTrack: (track: Track) => void;
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
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          {tracksWithIds.map((track) => {
            const tId = track.id;
            return (
              <SortableItem key={tId} id={tId}>
                {({ isDragging, setNodeRef, style, handleProps, handleStyle }) => (
                  <div
                    ref={setNodeRef}
                    style={style}
                    className={cn(
                      'flex flex-wrap md:flex-nowrap items-center gap-3 md:gap-4 p-3 md:p-4 border-b border-slate-700/50 last:border-0 hover:bg-slate-700/30 transition-colors group',
                      isDragging ? 'bg-slate-700 shadow-2xl z-10' : ''
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
                        onClick={() => onDeleteTrack(track)}
                        className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="w-full md:w-auto md:flex-1 order-last md:order-none mt-2 md:mt-0 flex items-center">
                      {track.src || track.url ? (
                        <TrackPlayer src={track.src || track.url || ''} trackId={tId} />
                      ) : (
                        <div className="flex-1" />
                      )}
                    </div>
                    <button
                      onClick={() => onDeleteTrack(track)}
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
  );
}
