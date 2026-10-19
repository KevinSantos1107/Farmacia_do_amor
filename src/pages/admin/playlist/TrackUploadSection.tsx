import { useRef } from 'react';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { cn } from '../../../shared/utils/cn';
import { Upload, X, Music } from 'lucide-react';
import type { TrackSlot } from './types';

interface TrackUploadSectionProps {
  trackSlots: TrackSlot[];
  expandedSlotId: string | null;
  onSetExpandedSlotId: (id: string | null) => void;
  onAudioFilesSelect: (files: FileList) => void;
  onSlotCoverSelect: (slotId: string, file: File) => void;
  onRemoveCoverForSlot: (slotId: string) => void;
  onRemoveSlot: (slotId: string) => void;
  onCancelSlotUpload: (slotId: string) => void;
  onUploadSlot: (slot: TrackSlot) => void;
  onUploadAllSlots: () => void;
  onUpdateSlotTitle: (slotId: string, title: string) => void;
  onUpdateSlotArtist: (slotId: string, artist: string) => void;
  onResetCreating: () => void;
}

export function TrackUploadSection({
  trackSlots,
  expandedSlotId,
  onSetExpandedSlotId,
  onAudioFilesSelect,
  onSlotCoverSelect,
  onRemoveCoverForSlot,
  onRemoveSlot,
  onCancelSlotUpload,
  onUploadSlot,
  onUploadAllSlots,
  onUpdateSlotTitle,
  onUpdateSlotArtist,
  onResetCreating,
}: TrackUploadSectionProps) {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const coverSlotIdRef = useRef<string | null>(null);

  const openCoverPicker = (slotId: string) => {
    coverSlotIdRef.current = slotId;
    coverInputRef.current?.click();
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const slotId = coverSlotIdRef.current;
    if (file && slotId) {
      onSlotCoverSelect(slotId, file);
    }
    e.target.value = '';
  };

  return (
    <div className="bg-slate-800 border border-rose-500/30 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-white text-base">Adicionar Músicas</h2>
        <div className="flex items-center gap-2">
          {trackSlots.some((s) => !s.done && !s.uploading) && trackSlots.length > 0 && (
            <Button onClick={onUploadAllSlots} className="gap-1.5 text-xs py-1.5 px-3 h-auto">
              <Upload className="w-3.5 h-3.5" />
              Enviar Todas ({trackSlots.filter((s) => !s.done && !s.uploading).length})
            </Button>
          )}
          <button
            onClick={onResetCreating}
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
            : 'Clique para adicionar mais músicas'}
        </span>
      </div>
      <input
        ref={audioInputRef}
        type="file"
        className="hidden"
        accept="audio/mp3,audio/mpeg,audio/*"
        multiple
        onChange={(e) => e.target.files && onAudioFilesSelect(e.target.files)}
      />
      <input
        ref={coverInputRef}
        type="file"
        className="hidden"
        accept="image/*,.heic,.heif,.HEIC,.HEIF"
        onChange={handleCoverChange}
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
                  onClick={() => !slot.done && onSetExpandedSlotId(isExpanded ? null : slot.id)}
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
                      <span className="text-xs text-slate-400 font-mono w-9 text-right">
                        {slot.progress}%
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCancelSlotUpload(slot.id);
                        }}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSlot(slot.id);
                      }}
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
                        <label className="text-xs font-medium text-slate-400 block mb-1">
                          Título *
                        </label>
                        <Input
                          value={slot.title}
                          onChange={(e) => onUpdateSlotTitle(slot.id, e.target.value)}
                          className="bg-slate-800 border-slate-600 text-slate-200 text-sm h-8"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-400 block mb-1">
                          Artista
                        </label>
                        <Input
                          value={slot.artist}
                          onChange={(e) => onUpdateSlotArtist(slot.id, e.target.value)}
                          className="bg-slate-800 border-slate-600 text-slate-200 text-sm h-8"
                        />
                      </div>
                    </div>
                    {/* Cover */}
                    {slot.coverPreview ? (
                      <div className="flex items-center gap-3">
                        <img
                          src={slot.coverPreview}
                          alt=""
                          className="w-10 h-10 rounded object-cover shrink-0"
                        />
                        <div>
                          <p className="text-xs text-emerald-400">✓ Capa detectada</p>
                          <button
                            onClick={() => onRemoveCoverForSlot(slot.id)}
                            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mt-0.5"
                          >
                            <X className="w-3 h-3" /> Remover capa
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => openCoverPicker(slot.id)}
                        className="flex items-center gap-2 text-xs text-slate-400 hover:text-white border border-dashed border-slate-600 hover:border-slate-400 rounded-lg px-3 py-2 w-full transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" /> Selecionar capa manualmente
                      </button>
                    )}
                    {slot.error && <p className="text-xs text-red-400">Erro: {slot.error}</p>}
                    <Button
                      onClick={() => onUploadSlot(slot)}
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
          onClick={onResetCreating}
          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
        >
          ✓ Todas enviadas — Fechar
        </button>
      )}
    </div>
  );
}
