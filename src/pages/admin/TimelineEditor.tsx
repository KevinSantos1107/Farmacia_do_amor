import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection,
  query,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import { DEFAULT_SITE_ID } from '../../config/defaults';
import { uploadImage, cloudinaryUrl } from '../../services/cloudinary/upload';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Spinner } from '../../shared/ui/Spinner';
import { EmptyState } from '../../shared/ui/EmptyState';
import { SideSheet } from '../../shared/ui/SideSheet';
import { useToast } from '../../shared/ui/ToastProvider';
import { cn } from '../../shared/utils/cn';
import { Plus, Trash2, Edit2, X, Upload, CheckCircle, Calendar } from 'lucide-react';

interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  description: string;
  location?: string;
  publicId?: string;
  photoUrl?: string;
  isSecret?: boolean;
  secretMessage?: string;
}

const emptyEvent = (): Partial<TimelineEvent> => ({
  title: '',
  date: '',
  description: '',
  location: '',
  isSecret: false,
});

export default function TimelineEditor() {
  const { config } = useSiteConfigStore();
  const { show } = useToast();
  const siteId = config?.id || DEFAULT_SITE_ID;

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<Partial<TimelineEvent>>(emptyEvent());
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      // MESMO caminho do site antigo: coleção raiz "timeline"
      const snap = await getDocs(query(collection(db, 'timeline')));
      const loaded: TimelineEvent[] = [];
      snap.forEach((d) => {
        if (d.id === '_placeholder') return;
        const data = d.data();
        loaded.push({
          id: d.id,
          title: data.title,
          date: data.date,
          description: data.caption || data.description,
          location: data.location,
          publicId: data.publicId,
          photoUrl: data.photoLarge || data.photo || data.photoUrl,
          isSecret: !!(data.secret || data.isSecret),
          secretMessage: typeof data.secret === 'string' ? data.secret : (data.secretMessage || ''),
        });
      });
      // Ordena por data — igual ao site principal (automático e intercalado)
      loaded.sort((a, b) => a.date.localeCompare(b.date));
      setEvents(loaded);
    } catch {
      show('Erro ao carregar eventos', 'err');
    }
    setLoading(false);
  }, [siteId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const openNew = () => {
    setForm(emptyEvent());
    setPhotoFile(null);
    setPhotoPreview(null);
    setEditingId('new');
  };

  const openEdit = (event: TimelineEvent) => {
    setForm({ ...event });
    setPhotoFile(null);
    // Usa photoUrl (campo photo/photoLarge do site antigo) ou publicId novo
    setPhotoPreview(
      event.photoUrl || (event.publicId ? cloudinaryUrl(event.publicId, { w: 400 }) : null)
    );
    setEditingId(event.id);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!form.title || !form.date || !form.description) {
      show('Título, data e descrição são obrigatórios', 'err');
      return;
    }
    setSaving(true);
    try {
      let publicId = form.publicId;
      let photoUrl = form.photoUrl;
      if (photoFile) {
        const res = await uploadImage(photoFile, `${siteId}/timeline`);
        
        // Se já existia uma imagem e foi substituída, enfileira a antiga para deleção
        if (form.publicId) {
          await addDoc(collection(db, 'cloudinary_deletions_queue'), {
            publicId: form.publicId,
            createdAt: serverTimestamp(),
          });
        }
        
        publicId = res.publicId;
        photoUrl = res.secureUrl; // Salva URL completa como "photo" para compatibilidade
      }

      const payload: {
        title: string;
        date: string;
        caption: string;
        location: string;
        secret: string | boolean;
        photo: string | null;
        publicId: string | null;
        updatedAt: ReturnType<typeof serverTimestamp>;
      } = {
        title: form.title,
        date: form.date,
        caption: form.description, // site antigo usa "caption"
        location: form.location || '',
        // Se houver texto na secretMessage, salva como string (site antigo), senão salva o boolean
        secret: form.secretMessage ? form.secretMessage : (form.isSecret || false),
        photo: photoUrl || null, // campo do site antigo
        publicId: publicId || null,
        updatedAt: serverTimestamp(),
      };

      if (editingId === 'new') {
        // Salva na coleção raiz "timeline" (igual ao site antigo)
        await addDoc(collection(db, 'timeline'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        show('Evento criado!');
      } else {
        await updateDoc(doc(db, 'timeline', editingId!), payload);
        show('Evento atualizado!');
      }
      setEditingId(null);
      loadEvents();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      show('Erro: ' + msg, 'err');
    }
    setSaving(false);
  };

  const handleDelete = async (event: TimelineEvent) => {
    if (!confirm(`Deletar o evento "${event.title}"?`)) return;
    try {
      if (event.publicId) {
        await addDoc(collection(db, 'cloudinary_deletions_queue'), {
          publicId: event.publicId,
          createdAt: serverTimestamp(),
        });
      }
      await deleteDoc(doc(db, 'timeline', event.id));
      setEvents((evts) => evts.filter((e) => e.id !== event.id));
      show('Evento deletado!');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      show('Erro: ' + msg, 'err');
    }
  };

  const EventForm = (
    <SideSheet
      isOpen={!!editingId}
      onClose={() => setEditingId(null)}
      title={editingId === 'new' ? 'Criar Novo Evento' : 'Editar Evento'}
      description="Preencha os dados do momento especial."
      width="lg"
    >
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Título *</label>
            <Input
              value={form.title || ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="bg-slate-900 border-slate-700 text-slate-200"
              placeholder="Ex: Primeiro Beijo"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Data *</label>
            <Input
              type="date"
              value={form.date || ''}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="bg-slate-900 border-slate-700 text-slate-200"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Descrição *</label>
          <textarea
            value={form.description || ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-rose-500/50 focus:outline-none resize-none"
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Localização</label>
          <Input
            value={form.location || ''}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="bg-slate-900 border-slate-700 text-slate-200"
            placeholder="Ex: Paris, França"
          />
        </div>
        {/* Photo upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">
            Foto {form.publicId || form.photoUrl ? '(clique para trocar)' : '(opcional)'}
          </label>
          {photoPreview ? (
            <div className="flex items-center gap-3">
              <img
                src={photoPreview}
                alt=""
                className="w-24 h-24 rounded-xl object-cover border border-slate-600"
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white border border-slate-600 rounded-lg px-3 py-1.5 transition-colors hover:bg-slate-800"
                >
                  <Upload className="w-4 h-4" /> Trocar foto
                </button>
                <button
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                    setForm({ ...form, publicId: undefined, photoUrl: undefined });
                  }}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mt-1 p-1"
                >
                  <X className="w-3 h-3" /> Remover foto
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileRef.current?.click()}
              className="border border-dashed border-slate-600 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-slate-400 transition-colors bg-slate-900/40"
            >
              <Upload className="w-6 h-6 text-slate-500" />
              <span className="text-slate-400 text-sm">Clique para selecionar uma foto</span>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handlePhotoSelect}
          />
        </div>
        {/* Secret toggle */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setForm({ ...form, isSecret: !form.isSecret })}
              className={cn(
                'w-11 h-6 rounded-full transition-colors relative',
                form.isSecret ? 'bg-[var(--theme-primary)]' : 'bg-slate-700'
              )}
            >
              <div
                className={cn(
                  'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform',
                  form.isSecret ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </div>
            <span className="text-sm text-slate-300">
              Adicionar mensagem secreta
            </span>
          </label>
          
          {form.isSecret && (
            <div className="space-y-2 pl-14">
              <label className="text-sm font-medium text-slate-300">Mensagem Secreta</label>
              <textarea
                value={form.secretMessage || ''}
                onChange={(e) => setForm({ ...form, secretMessage: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-3 min-h-[100px] outline-none focus:border-[var(--theme-primary)] transition-colors"
                placeholder="Digite uma mensagem romântica que ficará escondida..."
              />
              <p className="text-xs text-slate-500">
                Esta mensagem só será revelada quando clicarem nela na timeline.
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-3 pt-6 border-t border-slate-800 mt-8">
          <Button onClick={handleSave} isLoading={saving} className="flex-1 gap-2">
            <CheckCircle className="w-4 h-4" /> Salvar Evento
          </Button>
          <Button
            variant="secondary"
            onClick={() => setEditingId(null)}
            className="flex-1 bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </SideSheet>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Nossa História</h1>
          <p className="text-slate-400 mt-1">
            Gerencie os eventos da Linha do Tempo.{' '}
            <span className="text-slate-500 text-xs">Os eventos são ordenados por data automaticamente.</span>
          </p>
        </div>
        <Button onClick={openNew} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Novo Evento
        </Button>
      </div>

      {EventForm}

      {loading ? (
        <div className="flex justify-center p-12">
          <Spinner />
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Linha do tempo vazia"
          description="Adicione os momentos especiais que marcaram a história de vocês dois."
          actionLabel="Adicionar Primeiro Evento"
          onAction={openNew}
        />
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-4 p-4 bg-slate-800 border border-slate-700 rounded-xl hover:border-slate-600 transition-colors group"
            >
              <div className="w-16 h-16 rounded overflow-hidden bg-slate-800 flex-shrink-0 border border-slate-700/50">
                {event.publicId ? (
                  <img
                    src={cloudinaryUrl(event.publicId, { w: 100, h: 100, c: 'fill' })}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : event.photoUrl ? (
                  <img src={event.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <Calendar className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-bold text-white">{event.title}</h3>
                  <span className="text-xs font-mono bg-slate-700 text-slate-400 px-2 py-0.5 rounded">
                    {event.date}
                  </span>
                  {event.isSecret && (
                    <span className="text-xs bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded">
                      secreto
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 line-clamp-2">{event.description}</p>
                {event.location && (
                  <p className="text-xs text-slate-500 mt-1">📍 {event.location}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(event)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(event)}
                  className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
