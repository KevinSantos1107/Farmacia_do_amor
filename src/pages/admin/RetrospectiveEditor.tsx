import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Spinner } from '../../shared/ui/Spinner';
import { useToast } from '../../shared/ui/ToastProvider';
import { Save, Settings2, Music } from 'lucide-react';

interface RetroV2Config {
  musicUrl?: string;
  musicName?: string;
  wordGameAnswer?: string;
  wordGameQuestion?: string;
  outroTitle?: string;
  outroMessage?: string;
}

export default function RetrospectiveEditor() {
  const { config: siteConfig } = useSiteConfigStore();
  const { show } = useToast();
  const siteId = siteConfig?.id || 'meu-site';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [retroConfig, setRetroConfig] = useState<RetroV2Config>({
    musicUrl: '',
    musicName: '',
    wordGameAnswer: 'INCRIVEL',
    wordGameQuestion: 'O QUE EU ACHO DE VOCÊ?',
    outroTitle: 'Feliz 1 ano pra nós, meu amor!',
    outroMessage: 'Obrigado por cada momento incrível. Essa é só uma parte da nossa história.',
  });

  // Data for dropdowns
  const [availableTracks, setAvailableTracks] = useState<{ url: string; title: string }[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load Retrospective Config V2
        const docRef = doc(db, 'sites', siteId, 'retrospective_config', 'v2');
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const data = snap.data();
          setRetroConfig({
            musicUrl: data.musicUrl || '',
            musicName: data.musicName || '',
            wordGameAnswer: data.wordGameAnswer || 'INCRIVEL',
            wordGameQuestion: data.wordGameQuestion || 'O QUE EU ACHO DE VOCÊ?',
            outroTitle: data.outroTitle || 'Feliz 1 ano pra nós, meu amor!',
            outroMessage: data.outroMessage || 'Obrigado por cada momento incrível. Essa é só uma parte da nossa história.',
          });
        }

        // Load Tracks from all custom_playlists
        const playlistSnap = await getDocs(collection(db, 'custom_playlists'));
        const loadedTracks: { url: string; title: string }[] = [];
        for (const p of playlistSnap.docs) {
          if (p.id === '_placeholder') continue;
          const tSnap = await getDocs(
            query(collection(db, 'playlist_tracks'), where('playlistId', '==', p.id))
          );
          tSnap.forEach((tDoc) => {
            const data = tDoc.data();
            if (data.tracks && Array.isArray(data.tracks)) {
              data.tracks.forEach((t: { url?: string; src?: string; title?: string }) => {
                const trackUrl = t.url || t.src;
                if (trackUrl) {
                  loadedTracks.push({ url: trackUrl, title: t.title || 'Música' });
                }
              });
            } else if (data.title && (data.url || data.src)) {
              loadedTracks.push({ url: data.url || data.src, title: data.title });
            }
          });
        }
        setAvailableTracks(loadedTracks);
      } catch {
        show('Erro ao carregar', 'err');
      }
      setLoading(false);
    };
    loadData();
  }, [siteId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'sites', siteId, 'retrospective_config', 'v2'),
        {
          ...retroConfig,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ); // Use merge true so we don't overwrite unexpected keys
      show('Configurações da retrospectiva salvas!');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      show('Erro ao salvar: ' + msg, 'err');
    }
    setSaving(false);
  };

  const handleTrackSelect = (url: string) => {
    const track = availableTracks.find((t) => t.url === url);
    setRetroConfig({
      ...retroConfig,
      musicUrl: url,
      musicName: track ? track.title : '',
    });
  };

  if (loading)
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Retrospectiva</h1>
          <p className="text-slate-400 mt-1">
            Configure a música e o jogo de palavras exibidos na retrospectiva.
          </p>
        </div>
        <Button onClick={handleSave} isLoading={saving} className="gap-2 shrink-0">
          <Save className="w-4 h-4" /> Salvar Alterações
        </Button>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="p-4 bg-slate-900 border-b border-slate-700">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-theme-primary" /> Configurações V2
          </h2>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-3 bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Music className="w-4 h-4" /> Música de Fundo
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Selecione uma das músicas adicionadas nas Playlists.
            </p>
            <select
              value={retroConfig.musicUrl || ''}
              onChange={(e) => handleTrackSelect(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-3 text-sm focus:ring-1 focus:ring-theme-primary outline-none"
            >
              <option value="">(Silêncio - Sem música)</option>
              {availableTracks.map((t, idx) => (
                <option key={idx} value={t.url}>
                  {t.title}
                </option>
              ))}
            </select>
            {retroConfig.musicUrl &&
              !availableTracks.find((t) => t.url === retroConfig.musicUrl) && (
                <p className="text-xs text-yellow-500">
                  Música atualmente selecionada não foi encontrada nas playlists. Se você salvar
                  agora, ela será perdida ou precisará ser tocada na origem antiga.
                </p>
              )}
          </div>

          <div className="space-y-3 bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
            <label className="text-sm font-medium text-slate-300">
              Jogo de Palavras (Final da Retrospectiva)
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Configure a pergunta e a palavra (evite acentos) que aparecerão como um minigame "Termo".
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Pergunta / Dica:</label>
                <Input
                  value={retroConfig.wordGameQuestion || ''}
                  onChange={(e) =>
                    setRetroConfig({
                      ...retroConfig,
                      wordGameQuestion: e.target.value,
                    })
                  }
                  className="bg-slate-900 border-slate-700 text-slate-200 h-10"
                  placeholder="EX: O QUE EU ACHO DE VOCÊ?"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Palavra (Resposta):</label>
                <Input
                  value={retroConfig.wordGameAnswer || ''}
                  onChange={(e) =>
                    setRetroConfig({
                      ...retroConfig,
                      wordGameAnswer: e.target.value
                        .toUpperCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^A-Z]/g, ''),
                    })
                  }
                  className="bg-slate-900 border-slate-700 text-slate-200 h-10 font-mono text-lg tracking-widest uppercase"
                  placeholder="EX: INCRIVEL"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
            <label className="text-sm font-medium text-slate-300">
              Tela Final (Encerramento)
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Texto que aparece no último slide da retrospectiva, com os confetes.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Título:</label>
                <Input
                  value={retroConfig.outroTitle || ''}
                  onChange={(e) => setRetroConfig({ ...retroConfig, outroTitle: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-slate-200 h-10"
                  placeholder="EX: Feliz 1 ano pra nós, meu amor!"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Mensagem:</label>
                <textarea
                  value={retroConfig.outroMessage || ''}
                  onChange={(e) => setRetroConfig({ ...retroConfig, outroMessage: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-3 text-sm focus:ring-1 focus:ring-theme-primary outline-none resize-none"
                  placeholder="EX: Obrigado por cada momento incrível..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
