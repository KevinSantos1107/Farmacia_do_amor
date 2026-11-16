/**
 * MusicSearchModal.tsx
 *
 * Modal para busca e adição de músicas via YouTube (estilo LovePanda).
 * Utiliza o hook useMusicSearch para busca e gravação direta na playlist.
 */

import { useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { Spinner } from '../../../shared/ui/Spinner';
import { cn } from '../../../shared/utils/cn';
import { useMusicSearch } from './useMusicSearch';
import type { Playlist, Track } from './types';

export interface MusicSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePlaylist: Playlist;
  siteId: string;
  tracks: Track[];
  onImportSuccess: () => void;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function MusicSearchModal({
  isOpen,
  onClose,
  activePlaylist,
  siteId,
  tracks,
  onImportSuccess,
}: MusicSearchModalProps) {
  const { query, results, isSearching, addingId, error, addedIds, search, addTrack } =
    useMusicSearch();

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      search(query);
    }
  };

  const handleAdd = (result: Parameters<typeof addTrack>[0]) => {
    addTrack(result, activePlaylist, siteId, tracks, onImportSuccess);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Buscar Música" className="max-w-lg">
      {/* ── Campo de busca ─────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => search(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nome da música ou artista..."
            className={cn(
              'w-full pl-9 pr-3 py-2 rounded-lg text-sm',
              'bg-slate-800 border border-slate-700 text-white placeholder-slate-500',
              'focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent',
              'transition-colors'
            )}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => search(query)}
          disabled={isSearching || !query.trim()}
          className="shrink-0"
        >
          Buscar
        </Button>
      </div>

      {/* ── Estado: Buscando ───────────────────────────────────────────── */}
      {isSearching && (
        <div className="flex items-center justify-center gap-3 py-8 text-slate-400 text-sm">
          <Spinner size="sm" />
          <span>Buscando músicas...</span>
        </div>
      )}

      {/* ── Estado: Erro ───────────────────────────────────────────────── */}
      {error && !isSearching && (
        <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-sm text-rose-400 mb-3">
          {error}
        </div>
      )}

      {/* ── Estado: Nenhum resultado ───────────────────────────────────── */}
      {!isSearching && !error && query.trim() && results.length === 0 && (
        <p className="text-center text-slate-500 text-sm py-8">
          Nenhuma música encontrada para &ldquo;{query}&rdquo;.
        </p>
      )}

      {/* ── Estado: Prompt inicial ─────────────────────────────────────── */}
      {!isSearching && !error && !query.trim() && results.length === 0 && (
        <p className="text-center text-slate-600 text-sm py-8">
          Digite o nome de uma música ou artista para buscar.
        </p>
      )}

      {/* ── Lista de resultados ────────────────────────────────────────── */}
      {!isSearching && results.length > 0 && (
        <ul className="space-y-2 max-h-[55vh] overflow-y-auto pr-1 -mr-1">
          {results.map((track) => {
            const isAdded = addedIds.has(track.videoId);
            const isAdding = addingId === track.videoId;

            return (
              <li
                key={track.videoId}
                className={cn(
                  'flex items-center gap-3 p-2.5 rounded-lg',
                  'bg-slate-800/60 border border-slate-700/60',
                  'hover:border-slate-600 transition-colors'
                )}
              >
                {/* Thumbnail */}
                <img
                  src={track.thumbnail}
                  alt={track.title}
                  width={48}
                  height={48}
                  className="rounded-md object-cover shrink-0 bg-slate-700"
                  loading="lazy"
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate leading-snug">
                    {track.title}
                  </p>
                  <p className="text-xs text-slate-400 truncate leading-snug mt-0.5">
                    {track.artist}
                    {track.durationSeconds > 0 && (
                      <span className="text-slate-600 ml-2">
                        {formatDuration(track.durationSeconds)}
                      </span>
                    )}
                  </p>
                </div>

                {/* Botão de ação */}
                {isAdded ? (
                  <span className="shrink-0 text-xs font-medium text-emerald-400 flex items-center gap-1 px-3">
                    ✓ Adicionada
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAdd(track)}
                    disabled={!!addingId || isAdded}
                    isLoading={isAdding}
                    className="shrink-0 text-xs border-rose-500/50 text-rose-400 hover:bg-rose-500/10"
                  >
                    {isAdding ? 'Adicionando...' : 'Adicionar'}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
