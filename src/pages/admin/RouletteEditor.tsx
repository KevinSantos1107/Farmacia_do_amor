import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import { DEFAULT_SITE_ID } from '../../config/defaults';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Spinner } from '../../shared/ui/Spinner';
import { EmptyState } from '../../shared/ui/EmptyState';
import { SideSheet } from '../../shared/ui/SideSheet';
import { useToast } from '../../shared/ui/ToastProvider';
import { Plus, Trash2, Dices } from 'lucide-react';

interface Wheel {
  id: string;
  question: string;
  options: string[];
}

export default function RouletteEditor() {
  const { config } = useSiteConfigStore();
  const { show } = useToast();
  const siteId = config?.id || DEFAULT_SITE_ID;

  const [wheels, setWheels] = useState<Wheel[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newWheel, setNewWheel] = useState({ question: '', options: '' });
  const [saving, setSaving] = useState(false);

  const loadWheels = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'sites', siteId, 'wheels'));
      const loaded: Wheel[] = [];
      snap.forEach((d) => {
        if (d.id === '_placeholder') return;
        const data = d.data();
        const options =
          typeof data.options === 'string'
            ? data.options
                .split(',')
                .map((o: string) => o.trim())
                .filter(Boolean)
            : data.options || [];
        loaded.push({ id: d.id, question: data.question, options });
      });
      setWheels(loaded);
    } catch {
      show('Erro ao carregar roletas', 'err');
    }
    setLoading(false);
  }, [siteId]);

  useEffect(() => {
    loadWheels();
  }, [loadWheels]);

  const handleCreate = async () => {
    if (!newWheel.question) {
      show('Informe a pergunta', 'err');
      return;
    }
    const options = newWheel.options
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    if (options.length < 2) {
      show('Informe pelo menos 2 opções separadas por vírgula', 'err');
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'sites', siteId, 'wheels'), {
        question: newWheel.question,
        options: newWheel.options, // keep as string to match legacy format
        createdAt: serverTimestamp(),
      });
      show('Roleta criada!');
      setCreating(false);
      setNewWheel({ question: '', options: '' });
      loadWheels();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      show('Erro: ' + msg, 'err');
    }
    setSaving(false);
  };

  const handleDelete = async (wheel: Wheel) => {
    if (!confirm(`Deletar a roleta "${wheel.question}"?`)) return;
    try {
      await deleteDoc(doc(db, 'sites', siteId, 'wheels', wheel.id));
      setWheels((w) => w.filter((x) => x.id !== wheel.id));
      show('Roleta removida!');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      show('Erro: ' + msg, 'err');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Roleta de Perguntas</h1>
          <p className="text-slate-400 mt-1">Gerencie as rodas de perguntas para girar no site.</p>
        </div>
        <Button onClick={() => setCreating(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Nova Roleta
        </Button>
      </div>

      <SideSheet
        isOpen={creating}
        onClose={() => setCreating(false)}
        title="Nova Roleta"
        description="Configure a pergunta e as opções que aparecerão na roleta."
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Pergunta *</label>
            <Input
              value={newWheel.question}
              onChange={(e) => setNewWheel({ ...newWheel, question: e.target.value })}
              className="bg-slate-900 border-slate-700 text-slate-200"
              placeholder="Ex: O que vamos fazer hoje?"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">
              Opções * (separadas por vírgula)
            </label>
            <textarea
              value={newWheel.options}
              onChange={(e) => setNewWheel({ ...newWheel, options: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-rose-500/50 focus:outline-none resize-none"
              rows={5}
              placeholder="Ex: Cinema, Jantar romântico, Passeio no parque, Assistir série"
            />
            <p className="text-xs text-slate-500">
              Preview:{' '}
              {newWheel.options
                ? newWheel.options
                    .split(',')
                    .map((o) => o.trim())
                    .filter(Boolean).length
                : 0}{' '}
              opções
            </p>
          </div>
          <div className="flex gap-3 pt-6 border-t border-slate-800 mt-8">
            <Button onClick={handleCreate} isLoading={saving} className="flex-1 gap-2">
              <Plus className="w-4 h-4" /> Criar Roleta
            </Button>
            <Button
              variant="secondary"
              onClick={() => setCreating(false)}
              className="flex-1 bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </SideSheet>

      {loading ? (
        <div className="flex justify-center p-12">
          <Spinner />
        </div>
      ) : wheels.length === 0 ? (
        <EmptyState
          icon={Dices}
          title="Nenhuma roleta cadastrada"
          description="Crie roletas com perguntas e opções divertidas para brincar com seu amor."
          actionLabel="Criar Primeira Roleta"
          onAction={() => setCreating(true)}
        />
      ) : (
        <div className="space-y-4">
          {wheels.map((wheel) => (
            <div
              key={wheel.id}
              className="bg-slate-800 border border-slate-700 rounded-xl p-5 group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-2 bg-rose-500/10 rounded-lg flex-shrink-0">
                    <Dices className="w-5 h-5 text-rose-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white">{wheel.question}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {wheel.options.map((opt, i) => (
                        <span
                          key={i}
                          className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full"
                        >
                          {opt}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">{wheel.options.length} opções</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(wheel)}
                  className="p-2 text-slate-500 hover:text-red-400 transition-colors opacity-50 group-hover:opacity-100 shrink-0"
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
