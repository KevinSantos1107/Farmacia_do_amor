import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../services/firebase/config';
import { useAuth } from '../../features/auth/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { useToast } from '../../shared/ui/ToastProvider';
import { Trash2, Copy, Plus, RefreshCw, KeyRound, ExternalLink } from 'lucide-react';

import { useSiteConfigStore } from '../../store/siteConfigStore';

interface PlayerToken {
  id: string;
  player: string;
  label?: string;
  createdAt?: Timestamp | { toMillis?: () => number } | null;
}

export default function TokenEditor() {
  const { user } = useAuth();
  const { config } = useSiteConfigStore();
  const partner1Name = config?.couple?.partner1?.name || 'Kevin';
  const partner2Name = config?.couple?.partner2?.name || 'Iara';

  const [tokens, setTokens] = useState<PlayerToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  // under the hood we store the ID as 'partner1' and 'partner2' for genericity, 
  // but since existing data relies on 'kevin' and 'iara', we will use the lowercase names as ID for now.
  // Wait, if the user changes the name, the old records would be disconnected.
  // We need to keep the ids as 'kevin' / 'iara' for backward compatibility, OR change to person1/person2.
  // Wait, the easiest is to just use partner1Name and partner2Name in the UI, but store as lowercase partner names.
  const p1Id = partner1Name.toLowerCase();
  const p2Id = partner2Name.toLowerCase();
  const [newPlayer, setNewPlayer] = useState<string>(p2Id);
  const [newLabel, setNewLabel] = useState('');
  const { show } = useToast();

  // Garante que o token JWT do admin está fresco antes de qualquer query
  const ensureFreshToken = async () => {
    const currentUser = getAuth().currentUser;
    if (currentUser) {
      await currentUser.getIdToken(true);
    }
  };

  const loadTokens = useCallback(async () => {
    setIsLoading(true);
    try {
      await ensureFreshToken();
      const snap = await getDocs(collection(db, 'player_tokens'));
      const list: PlayerToken[] = [];
      snap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as PlayerToken);
      });
      list.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setTokens(list);
    } catch (e: unknown) {
      console.error('Erro ao carregar tokens:', e);
      show('Erro ao carregar tokens. Verifique as permissões.', 'err');
    } finally {
      setIsLoading(false);
    }
  }, [show]);

  // Só carrega quando o Firebase Auth confirmar que o admin está autenticado
  useEffect(() => {
    if (user) {
      loadTokens();
    }
  }, [user, loadTokens]);

  const generateTokenString = () => {
    const array = new Uint8Array(24);
    window.crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const handleCreate = async () => {
    setIsGenerating(true);
    try {
      await ensureFreshToken();
      const token = generateTokenString();
      await setDoc(doc(db, 'player_tokens', token), {
        player: newPlayer,
        label: newLabel || `Acesso de ${newPlayer === p2Id || newPlayer === 'iara' ? partner2Name : partner1Name}`,
        createdAt: serverTimestamp(),
      });
      show('Link mágico criado com sucesso!');
      setNewLabel('');
      await loadTokens();
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      show('Erro ao criar token: ' + msg, 'err');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (tokenId: string) => {
    if (
      !window.confirm(
        'Tem certeza? O link deixará de funcionar imediatamente.'
      )
    )
      return;
    try {
      await ensureFreshToken();
      await deleteDoc(doc(db, 'player_tokens', tokenId));
      show('Token removido com sucesso!');
      setTokens(prev => prev.filter(t => t.id !== tokenId));
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      show('Erro ao remover token: ' + msg, 'err');
    }
  };

  const copyLink = (tokenId: string) => {
    const url = `${window.location.origin}/?token=${tokenId}`;
    navigator.clipboard.writeText(url);
    show('Link copiado para área de transferência!');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
          <KeyRound className="w-8 h-8 text-indigo-400" />
          Acessos Mágicos
        </h1>
        <p className="text-slate-400 mt-1">
          Gerencie os links de acesso para você e para a Iara. Crie, copie ou
          remova links quando precisar.
        </p>
      </div>

      {/* Criar novo token */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Criar Novo Link</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="w-full sm:w-1/3">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Jogador
              </label>
              <select
                value={newPlayer}
                onChange={e => setNewPlayer(e.target.value)}
                className="w-full h-10 px-3 bg-slate-900 border border-slate-700 rounded-md text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value={p2Id}>{partner2Name} 🌸</option>
                <option value={p1Id}>{partner1Name} 👑</option>
              </select>
            </div>

            <div className="w-full sm:w-1/2">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Descrição (opcional)
              </label>
              <Input
                placeholder={`Ex: Celular novo de ${partner2Name}`}
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                className="bg-slate-900 border-slate-700"
              />
            </div>

            <Button
              onClick={handleCreate}
              disabled={isGenerating}
              className="w-full sm:w-auto h-10 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Gerar Link
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de tokens */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white text-lg">Links Ativos</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadTokens}
            disabled={isLoading}
            className="text-slate-400 hover:text-white"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
            />
          </Button>
        </CardHeader>
        <CardContent>
          {tokens.length === 0 ? (
            <div className="text-center py-8 text-slate-500 border border-dashed border-slate-700 rounded-lg">
              {isLoading ? 'Carregando...' : 'Nenhum token criado ainda.'}
            </div>
          ) : (
            <div className="space-y-3">
              {tokens.map(token => (
                <div
                  key={token.id}
                  className="bg-slate-900 border border-slate-700 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                          token.player === 'iara'
                            ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                            : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        }`}
                      >
                        {token.player}
                      </span>
                      <span className="text-white font-medium">
                        {token.label || 'Sem descrição'}
                      </span>
                    </div>
                    <div className="text-slate-500 text-xs font-mono truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                      {token.id}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyLink(token.id)}
                      className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Link
                    </Button>
                    <a
                      href={`/?token=${token.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-9 h-9 rounded-md border border-slate-700 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                      title="Testar link"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDelete(token.id)}
                      className="flex items-center justify-center w-9 h-9 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                      title="Excluir link"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
