import { useState, useEffect, useMemo, useRef } from 'react';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import { useSiteId } from '../../services/firestore/paths';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Spinner } from '../../shared/ui/Spinner';
import { Save, AlertTriangle, Plus, Trash2, Heart, Sparkles, Mail, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import type { SiteConfig } from '../../config/siteConfig.schema';
import { AvatarPicker } from '../../features/avatar/AvatarPicker';

import { useToast } from '../../shared/ui/ToastProvider';
import { AdminPageHeader } from './AdminPageHeader';
import {
  DEFAULT_LETTER_PARAGRAPHS,
  mergeStoreConfigIntoForm,
  getChangedConfigFields,
} from './configPageUtils';

const AVATAR_OPTIONS = Array.from({ length: 48 }, (_, i) => `/avatars/avatar_${i + 1}.webp`);

/**
 * Reordena os avatares prontos para que o avatar SALVO (se for um dos prontos)
 * fique na segunda posição (logo após o AvatarPicker que ocupa a posição 1).
 * Importante: baseia-se apenas no estado salvo (config), para que a posição
 * NÃO mude durante os cliques antes do usuário salvar.
 */
function getOrderedAvatarOptions(savedAvatar: string | undefined): string[] {
  if (!savedAvatar) return AVATAR_OPTIONS;
  const isPreset = AVATAR_OPTIONS.includes(savedAvatar);
  if (!isPreset) return AVATAR_OPTIONS;

  const others = AVATAR_OPTIONS.filter((a) => a !== savedAvatar);
  return [savedAvatar, ...others];
}

export default function ConfigPage() {
  const { config, configSource, updateConfig } = useSiteConfigStore();
  const siteId = useSiteId();
  const { show } = useToast();

  const isServerConfig = configSource === 'server' || import.meta.env.VITE_USE_MOCK_DATA === 'true' || configSource === 'mock';
  const prevConfigRef = useRef<SiteConfig | null>(config);

  const [formData, setFormData] = useState<Partial<SiteConfig>>(() => ({
    couple: config?.couple,
    relationship: config?.relationship,
    features: config?.features,
    theme: config?.theme,
    loveMessages: config?.loveMessages ?? [],
    acrostic: config?.acrostic ?? [],
    letter: (config?.letter?.paragraphs && config.letter.paragraphs.length > 0)
      ? config.letter
      : { paragraphs: [...DEFAULT_LETTER_PARAGRAPHS] },
  }));

  const currentAcrostic = useMemo(() => {
    if (formData.acrostic !== undefined) return formData.acrostic;
    return config?.acrostic ?? [];
  }, [formData.acrostic, config?.acrostic]);

  const currentLoveMessages = useMemo(() => {
    if (formData.loveMessages !== undefined) return formData.loveMessages;
    return config?.loveMessages ?? [];
  }, [formData.loveMessages, config?.loveMessages]);

  const currentLetterParagraphs = useMemo(() => {
    if (formData.letter?.paragraphs && formData.letter.paragraphs.length > 0) {
      return formData.letter.paragraphs;
    }
    if (config?.letter?.paragraphs && config.letter.paragraphs.length > 0) {
      return config.letter.paragraphs;
    }
    return DEFAULT_LETTER_PARAGRAPHS;
  }, [formData.letter?.paragraphs, config?.letter?.paragraphs]);

  // Estados de visualização compacta / expandida dos cards extensos
  const [isAcrosticExpanded, setIsAcrosticExpanded] = useState(false);
  const [isLoveMessagesExpanded, setIsLoveMessagesExpanded] = useState(false);
  const [isLetterExpanded, setIsLetterExpanded] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  // Lista de avatares com o avatar SALVO no início (posição 2).
  // Só reordena quando o estado salvo (config) é alterado, nunca durante a seleção preliminar.
  const partner1AvatarOptions = useMemo(
    () => getOrderedAvatarOptions(config?.couple?.partner1?.avatar),
    [config?.couple?.partner1?.avatar]
  );

  const partner2AvatarOptions = useMemo(
    () => getOrderedAvatarOptions(config?.couple?.partner2?.avatar),
    [config?.couple?.partner2?.avatar]
  );

  // Sincroniza formData com o store quando o config é carregado ou atualizado sem perder edições não salvas
  useEffect(() => {
    if (config) {
      setFormData((current) => mergeStoreConfigIntoForm(prevConfigRef.current, config, current));
      prevConfigRef.current = config;
    }
  }, [config]);

  if (!config) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleSave = async () => {
    if (!config) return;

    if (!isServerConfig) {
      show('Aguarde a configuração carregar do servidor antes de salvar.', 'err');
      return;
    }

    const updates = getChangedConfigFields(config, formData);

    if (Object.keys(updates).length === 0) {
      show('Nenhuma alteração para salvar');
      return;
    }

    setIsSaving(true);
    try {
      await updateConfig(siteId, updates);
      prevConfigRef.current = useSiteConfigStore.getState().config;
      show('Configurações salvas com sucesso!');
    } catch (err: unknown) {
      console.error('Falha ao salvar configurações:', err);
      show('Erro ao salvar: ' + (err instanceof Error ? err.message : String(err)), 'err');
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="space-y-6 animate-in fade-in duration-500 min-w-0">
      <AdminPageHeader
        title="Configurações Gerais"
        description="Altere os dados básicos do casal e ative/desative funcionalidades do site."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
        {/* Identidade do Casal */}
        <Card className="bg-slate-800 border-slate-700 shadow-none min-w-0">
          <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
            <CardTitle className="text-slate-200 text-base sm:text-lg">Identidade do Casal</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-5">
            {/* Parceiro 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:col-span-6">
                <label className="text-xs sm:text-sm font-medium text-slate-300">Nome 1</label>
                <Input
                  value={formData.couple?.partner1.name || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      couple: { ...formData.couple!, partner1: { ...formData.couple!.partner1, name: e.target.value } },
                    })
                  }
                  className="bg-slate-900 border-slate-700 text-slate-200 h-9 sm:h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-3">
                <label className="text-xs sm:text-sm font-medium text-slate-300">Aniversário 1</label>
                <Input
                  type="date"
                  value={formData.couple?.partner1.birthDate || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      couple: { ...formData.couple!, partner1: { ...formData.couple!.partner1, birthDate: e.target.value } },
                    })
                  }
                  className="bg-slate-900 border-slate-700 text-slate-200 h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-3">
                <label className="text-xs sm:text-sm font-medium text-slate-300">Gênero 1</label>
                <select
                  value={formData.couple?.partner1.gender || 'M'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      couple: { ...formData.couple!, partner1: { ...formData.couple!.partner1, gender: e.target.value as 'M'|'F' } },
                    })
                  }
                  className="w-full h-9 sm:h-10 px-3 bg-slate-900 border border-slate-700 rounded-md text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>
              <div className="space-y-1.5 col-span-1 sm:col-span-12 mt-1 min-w-0">
                <label className="text-xs sm:text-sm font-medium text-slate-300">Avatar 1</label>
                <div className="flex gap-2 overflow-x-auto py-2 px-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent max-w-full">
                  <AvatarPicker
                    partner="partner1"
                    currentPhotoUrl={formData.couple?.partner1.photoUrl}
                    selectedAvatar={formData.couple?.partner1.avatar}
                    onSelect={(url) =>
                      setFormData((prev) => ({
                        ...prev,
                        couple: {
                          ...prev.couple!,
                          partner1: { ...prev.couple!.partner1, avatar: url },
                        },
                      }))
                    }
                    onPhotoUploaded={(newUrl) =>
                      setFormData((prev) => ({
                        ...prev,
                        couple: {
                          ...prev.couple!,
                          partner1: {
                            ...prev.couple!.partner1,
                            photoUrl: newUrl,
                            avatar: newUrl,
                          },
                        },
                      }))
                    }
                    onPhotoDeleted={(revertedAvatar) =>
                      setFormData((prev) => {
                        const nextPartner: NonNullable<SiteConfig['couple']>['partner1'] & { _photoPublicId?: string } = { ...prev.couple!.partner1 };
                        delete nextPartner.photoUrl;
                        delete nextPartner._photoPublicId;
                        nextPartner.avatar = revertedAvatar;
                        return {
                          ...prev,
                          couple: {
                            ...prev.couple!,
                            partner1: nextPartner,
                          },
                        };
                      })
                    }
                  />
                  {partner1AvatarOptions.map(a => (
                    <img
                      key={a}
                      src={a}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          couple: { ...formData.couple!, partner1: { ...formData.couple!.partner1, avatar: a } },
                        })
                      }
                      className={`w-12 h-12 rounded-full cursor-pointer border-2 flex-shrink-0 object-cover transition-all ${
                        formData.couple?.partner1.avatar === a
                          ? 'border-indigo-500 scale-110 shadow-lg'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Parceiro 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 border-t border-slate-700/50 pt-4">
              <div className="space-y-1.5 sm:col-span-6">
                <label className="text-xs sm:text-sm font-medium text-slate-300">Nome 2</label>
                <Input
                  value={formData.couple?.partner2.name || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      couple: { ...formData.couple!, partner2: { ...formData.couple!.partner2, name: e.target.value } },
                    })
                  }
                  className="bg-slate-900 border-slate-700 text-slate-200 h-9 sm:h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-3">
                <label className="text-xs sm:text-sm font-medium text-slate-300">Aniversário 2</label>
                <Input
                  type="date"
                  value={formData.couple?.partner2.birthDate || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      couple: { ...formData.couple!, partner2: { ...formData.couple!.partner2, birthDate: e.target.value } },
                    })
                  }
                  className="bg-slate-900 border-slate-700 text-slate-200 h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-3">
                <label className="text-xs sm:text-sm font-medium text-slate-300">Gênero 2</label>
                <select
                  value={formData.couple?.partner2.gender || 'F'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      couple: { ...formData.couple!, partner2: { ...formData.couple!.partner2, gender: e.target.value as 'M'|'F' } },
                    })
                  }
                  className="w-full h-9 sm:h-10 px-3 bg-slate-900 border border-slate-700 rounded-md text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>
              <div className="space-y-1.5 col-span-1 sm:col-span-12 mt-1 min-w-0">
                <label className="text-xs sm:text-sm font-medium text-slate-300">Avatar 2</label>
                <div className="flex gap-2 overflow-x-auto py-2 px-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent max-w-full">
                  <AvatarPicker
                    partner="partner2"
                    currentPhotoUrl={formData.couple?.partner2.photoUrl}
                    selectedAvatar={formData.couple?.partner2.avatar}
                    onSelect={(url) =>
                      setFormData((prev) => ({
                        ...prev,
                        couple: {
                          ...prev.couple!,
                          partner2: { ...prev.couple!.partner2, avatar: url },
                        },
                      }))
                    }
                    onPhotoUploaded={(newUrl) =>
                      setFormData((prev) => ({
                        ...prev,
                        couple: {
                          ...prev.couple!,
                          partner2: {
                            ...prev.couple!.partner2,
                            photoUrl: newUrl,
                            avatar: newUrl,
                          },
                        },
                      }))
                    }
                    onPhotoDeleted={(revertedAvatar) =>
                      setFormData((prev) => {
                        const nextPartner: NonNullable<SiteConfig['couple']>['partner2'] & { _photoPublicId?: string } = { ...prev.couple!.partner2 };
                        delete nextPartner.photoUrl;
                        delete nextPartner._photoPublicId;
                        nextPartner.avatar = revertedAvatar;
                        return {
                          ...prev,
                          couple: {
                            ...prev.couple!,
                            partner2: nextPartner,
                          },
                        };
                      })
                    }
                  />
                  {partner2AvatarOptions.map(a => (
                    <img
                      key={a}
                      src={a}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          couple: { ...formData.couple!, partner2: { ...formData.couple!.partner2, avatar: a } },
                        })
                      }
                      className={`w-12 h-12 rounded-full cursor-pointer border-2 flex-shrink-0 object-cover transition-all ${
                        formData.couple?.partner2.avatar === a
                          ? 'border-indigo-500 scale-110 shadow-lg'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 border-t border-slate-700/50 pt-4">
              <label className="text-xs sm:text-sm font-medium text-slate-300">Data de Início do Namoro</label>
              <div className="max-w-xs">
                <Input
                  type="date"
                  value={formData.relationship?.startDate || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      relationship: { startDate: e.target.value },
                    })
                  }
                  className="bg-slate-900 border-slate-700 text-slate-200 h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Flags */}
        <Card className="bg-slate-800 border-slate-700 shadow-none min-w-0">
          <CardHeader className="p-4 sm:p-6 pb-3">
            <CardTitle className="text-slate-200 text-base sm:text-lg">Módulos Ativos</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
            {(Object.keys(formData.features || {}) as Array<keyof SiteConfig['features']>).map(
              (key) => {
                const featureLabels: Record<string, string> = {
                  enableTimeline: 'Linha do Tempo',
                  enableGames: 'Jogos do Casal',
                  enableMusic: 'Player de Músicas',
                  enableAlbum: 'Álbum de Fotos',
                };
                const label = featureLabels[key] || key.replace('enable', '');
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 gap-3"
                  >
                    <span className="text-slate-300 font-medium text-xs sm:text-sm">
                      {label}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={formData.features?.[key] || false}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            features: { ...formData.features!, [key]: e.target.checked },
                          })
                        }
                      />
                      <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-primary" />
                    </label>
                  </div>
                );
              }
            )}
          </CardContent>
        </Card>
      </div>

      {/* Carta de Amor — full width, acima do grid */}
      <Card className="bg-slate-800 border-slate-700 shadow-none min-w-0">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6 pb-3">
          <CardTitle className="text-slate-200 flex items-center gap-2 text-base sm:text-lg">
            <Mail className="w-5 h-5 text-pink-400 shrink-0" />
            <span>Carta de Amor ({currentLetterParagraphs.length} {currentLetterParagraphs.length === 1 ? 'parágrafo' : 'parágrafos'})</span>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsLetterExpanded(!isLetterExpanded)}
              className="gap-1 text-xs border-slate-600 hover:bg-slate-700 text-slate-300 flex-1 sm:flex-none justify-center"
            >
              {isLetterExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" /> Recolher
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" /> Editar
                </>
              )}
            </Button>
            {isLetterExpanded && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      letter: { paragraphs: [...DEFAULT_LETTER_PARAGRAPHS] },
                    });
                  }}
                  className="gap-1.5 text-xs border-slate-600 hover:bg-slate-700 text-slate-300 flex-1 sm:flex-none justify-center"
                  title="Restaurar parágrafos originais"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Padrão
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      letter: { paragraphs: [...currentLetterParagraphs, ''] },
                    });
                  }}
                  className="gap-1.5 text-xs border-slate-600 hover:bg-slate-700 text-slate-200 flex-1 sm:flex-none justify-center"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Parágrafo
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            Personalize o texto da carta exibida na seção &quot;Uma Carta Para Você&quot; da página principal.
          </p>

          {!isLetterExpanded ? (
            /* Colapsado: exibe o texto da carta ativa em modo leitura */
            <div className="space-y-2.5 p-3.5 bg-slate-900/40 rounded-xl border border-slate-700/50">
              {currentLetterParagraphs.map((par, idx) => (
                <p
                  key={idx}
                  className="text-xs sm:text-sm text-slate-300 leading-relaxed italic border-l-2 border-pink-500/40 pl-3 py-0.5 break-words"
                >
                  {par || <span className="text-slate-500 not-italic">(Parágrafo vazio)</span>}
                </p>
              ))}
            </div>
          ) : (
            /* Expandido: campos de texto para editar os parágrafos */
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
              {currentLetterParagraphs.map((par, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-900/60 border border-slate-700/50 rounded-xl space-y-2 group transition-all"
                >
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-pink-500/15 text-pink-300 flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      Parágrafo {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = currentLetterParagraphs.filter((_, i) => i !== idx);
                        setFormData({
                          ...formData,
                          letter: { paragraphs: updated.length > 0 ? updated : [...DEFAULT_LETTER_PARAGRAPHS] },
                        });
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1 text-xs"
                      title="Excluir parágrafo"
                      aria-label={`Excluir parágrafo ${idx + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline text-[11px]">Excluir</span>
                    </button>
                  </div>
                  <textarea
                    value={par}
                    rows={3}
                    placeholder="Escreva este parágrafo da carta de amor..."
                    onChange={(e) => {
                      const updated = [...currentLetterParagraphs];
                      updated[idx] = e.target.value;
                      setFormData({ ...formData, letter: { paragraphs: updated } });
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-md p-2.5 text-xs sm:text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-y leading-relaxed"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Acróstico e Mensagens de Amor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start min-w-0">
        {/* Acróstico Personalizado */}
        <Card className="bg-slate-800 border-slate-700 shadow-none min-w-0">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6 pb-3">
            <CardTitle className="text-slate-200 flex items-center gap-2 text-base sm:text-lg">
              <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
              <span>Acróstico Personalizado</span>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAcrosticExpanded(!isAcrosticExpanded)}
                className="gap-1 text-xs border-slate-600 hover:bg-slate-700 text-slate-300 flex-1 sm:flex-none justify-center"
              >
                {isAcrosticExpanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" /> Recolher
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" /> Expandir ({currentAcrostic.length})
                  </>
                )}
              </Button>
              {isAcrosticExpanded && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      acrostic: [
                        ...currentAcrostic,
                        { letter: '', short: '', long: '' },
                      ],
                    });
                  }}
                  className="gap-1.5 text-xs border-slate-600 hover:bg-slate-700 text-slate-200 flex-1 sm:flex-none justify-center"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Letra
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              Personalize o acróstico que aparece na tela inicial. Cada letra tem um resumo curto e um texto longo revelado ao tocar.
            </p>

            {!isAcrosticExpanded ? (
              <div
                onClick={() => setIsAcrosticExpanded(true)}
                className="p-3.5 bg-slate-900/50 hover:bg-slate-900/80 border border-slate-700/60 rounded-xl cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  {currentAcrostic.length === 0 ? (
                    <span className="text-xs text-slate-500 italic">Nenhuma letra cadastrada</span>
                  ) : (
                    currentAcrostic.map((item, i) => (
                      <span
                        key={i}
                        className="w-7 h-7 flex items-center justify-center bg-indigo-500/15 border border-indigo-500/40 text-indigo-300 font-bold rounded-lg text-xs shrink-0"
                      >
                        {item.letter || '?'}
                      </span>
                    ))
                  )}
                  <span className="text-xs text-slate-400 ml-1.5 shrink-0">
                    ({currentAcrostic.length} {currentAcrostic.length === 1 ? 'letra' : 'letras'})
                  </span>
                </div>
                <span className="text-xs text-indigo-400 font-medium group-hover:underline flex items-center gap-1 shrink-0 self-end sm:self-center">
                  Editar Letras →
                </span>
              </div>
            ) : currentAcrostic.length === 0 ? (
              <div className="p-6 border border-dashed border-slate-700 rounded-xl text-center text-slate-500 text-sm">
                Nenhuma letra cadastrada no acróstico. Clique em &quot;Adicionar Letra&quot; para criar.
              </div>
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
                {currentAcrostic.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-900/70 border border-slate-700/60 rounded-xl space-y-3 relative group transition-all"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                      <span className="text-xs font-semibold text-indigo-400 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[11px] font-bold">
                          {idx + 1}
                        </span>
                        <span>{item.letter ? `Letra "${item.letter}"` : 'Nova Letra'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = currentAcrostic.filter((_, i) => i !== idx);
                          setFormData({ ...formData, acrostic: updated });
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1 text-xs"
                        title="Remover letra"
                        aria-label={`Remover letra ${item.letter || idx + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-[11px]">Excluir</span>
                      </button>
                    </div>

                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <div className="w-16 sm:w-20 shrink-0">
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">Letra</label>
                        <Input
                          value={item.letter}
                          maxLength={2}
                          placeholder="A"
                          onChange={(e) => {
                            const updated = [...currentAcrostic];
                            updated[idx] = { ...updated[idx], letter: e.target.value.toUpperCase() };
                            setFormData({ ...formData, acrostic: updated });
                          }}
                          className="bg-slate-800 border-slate-700 text-center font-bold text-base sm:text-lg text-indigo-300 h-9 px-1 uppercase"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1 truncate">Frase Curta</label>
                        <Input
                          value={item.short}
                          placeholder="mor — você é meu tudo"
                          onChange={(e) => {
                            const updated = [...currentAcrostic];
                            updated[idx] = { ...updated[idx], short: e.target.value };
                            setFormData({ ...formData, acrostic: updated });
                          }}
                          className="bg-slate-800 border-slate-700 text-slate-200 h-9 text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Texto Detalhado (revelado ao tocar na tela inicial)
                      </label>
                      <textarea
                        value={item.long}
                        rows={2}
                        placeholder="Texto longo exibido ao clicar no card da letra..."
                        onChange={(e) => {
                          const updated = [...currentAcrostic];
                          updated[idx] = { ...updated[idx], long: e.target.value };
                          setFormData({ ...formData, acrostic: updated });
                        }}
                        className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-xs sm:text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-y leading-relaxed"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mensagens de Amor */}
        <Card className="bg-slate-800 border-slate-700 shadow-none min-w-0">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6 pb-3">
            <CardTitle className="text-slate-200 flex items-center gap-2 text-base sm:text-lg">
              <Heart className="w-5 h-5 text-rose-400 shrink-0" />
              <span>Mensagens de Amor ({currentLoveMessages.length})</span>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsLoveMessagesExpanded(!isLoveMessagesExpanded)}
                className="gap-1 text-xs border-slate-600 hover:bg-slate-700 text-slate-300 flex-1 sm:flex-none justify-center"
              >
                {isLoveMessagesExpanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" /> Recolher
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" /> Expandir ({currentLoveMessages.length})
                  </>
                )}
              </Button>
              {isLoveMessagesExpanded && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      loveMessages: [...currentLoveMessages, ''],
                    });
                  }}
                  className="gap-1.5 text-xs border-slate-600 hover:bg-slate-700 text-slate-200 flex-1 sm:flex-none justify-center"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Frase
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              Frases românticas sorteadas no botão &quot;Nova mensagem&quot; da tela principal.
            </p>

            {!isLoveMessagesExpanded ? (
              <div
                onClick={() => setIsLoveMessagesExpanded(true)}
                className="p-3.5 bg-slate-900/50 hover:bg-slate-900/80 border border-slate-700/60 rounded-xl cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="truncate min-w-0 flex-1">
                  <p className="text-xs text-slate-300 font-medium truncate italic">
                    &quot;{currentLoveMessages[0] || 'Nenhuma frase cadastrada'}&quot;
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {currentLoveMessages.length} {currentLoveMessages.length === 1 ? 'frase cadastrada' : 'frases cadastradas'}
                  </p>
                </div>
                <span className="text-xs text-rose-400 font-medium group-hover:underline shrink-0 self-end sm:self-center">
                  Ver Todas →
                </span>
              </div>
            ) : currentLoveMessages.length === 0 ? (
              <div className="p-6 border border-dashed border-slate-700 rounded-xl text-center text-slate-500 text-sm">
                Nenhuma frase cadastrada. Clique em &quot;Adicionar Frase&quot; para criar.
              </div>
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
                {currentLoveMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-900/60 border border-slate-700/50 rounded-xl space-y-2 group transition-all"
                  >
                    <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
                      <span className="text-xs font-semibold text-rose-400 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-rose-500/15 text-rose-300 flex items-center justify-center text-[11px] font-bold">
                          {idx + 1}
                        </span>
                        <span>Frase {idx + 1}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = currentLoveMessages.filter((_, i) => i !== idx);
                          setFormData({ ...formData, loveMessages: updated });
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1 text-xs"
                        title="Excluir frase"
                        aria-label={`Excluir frase ${idx + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-[11px]">Excluir</span>
                      </button>
                    </div>
                    <textarea
                      value={msg}
                      rows={2}
                      placeholder="Digite uma frase romântica..."
                      onChange={(e) => {
                        const updated = [...currentLoveMessages];
                        updated[idx] = e.target.value;
                        setFormData({ ...formData, loveMessages: updated });
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-md p-2.5 text-xs sm:text-sm text-slate-200 focus:ring-1 focus:ring-rose-500 focus:outline-none resize-y leading-relaxed"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-slate-800">
        <Button
          onClick={handleSave}
          isLoading={isSaving}
          disabled={!isServerConfig || isSaving}
          className="gap-2 px-8 w-full sm:w-auto justify-center"
        >
          <Save className="w-4 h-4" /> Salvar Alterações
        </Button>

        {!isServerConfig && (
          <p className="text-xs text-amber-400 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-md">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            Carregando configuração atualizada do servidor... Aguarde a sincronização para salvar.
          </p>
        )}
      </div>
    </div>
  );
}
