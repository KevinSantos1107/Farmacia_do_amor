import { useRef } from 'react';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { Plus, Upload, X } from 'lucide-react';

interface PlaylistCreateCardProps {
  newPlaylist: { name: string; description: string };
  onChangeNewPlaylist: (data: { name: string; description: string }) => void;
  coverPreview: string | null;
  onSelectCover: (file: File) => void;
  onRemoveCover: () => void;
  savingPlaylist: boolean;
  onCreate: () => void;
  onCancel: () => void;
}

export function PlaylistCreateCard({
  newPlaylist,
  onChangeNewPlaylist,
  coverPreview,
  onSelectCover,
  onRemoveCover,
  savingPlaylist,
  onCreate,
  onCancel,
}: PlaylistCreateCardProps) {
  const coverRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-slate-800 border border-rose-500/40 rounded-xl p-6 space-y-4">
      <h2 className="font-bold text-white text-lg">Criar Nova Playlist</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Nome *</label>
          <Input
            value={newPlaylist.name}
            onChange={(e) => onChangeNewPlaylist({ ...newPlaylist, name: e.target.value })}
            className="bg-slate-900 border-slate-700 text-slate-200"
            placeholder="Ex: Músicas Favoritas"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Descrição</label>
          <Input
            value={newPlaylist.description}
            onChange={(e) => onChangeNewPlaylist({ ...newPlaylist, description: e.target.value })}
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
            <button onClick={onRemoveCover} className="text-slate-400 hover:text-white">
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
            if (f) onSelectCover(f);
          }}
        />
      </div>
      <div className="flex gap-3 pt-2">
        <Button onClick={onCreate} isLoading={savingPlaylist} className="gap-2">
          <Plus className="w-4 h-4" /> Criar Playlist
        </Button>
        <Button
          variant="secondary"
          onClick={onCancel}
          className="bg-slate-700 text-white"
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
