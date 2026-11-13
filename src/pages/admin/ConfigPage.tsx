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

const AVATAR_OPTIONS = Array.from({ length: 48 }, (_, i) => `/avatars/avatar_${i + 1}.webp`);

const DEFAULT_LETTER_PARAGRAPHS = [
  'Entre tantas pessoas no mundo, foi você quem fez meu coração encontrar um lugar para chamar de lar. Você chegou inesperadamente e transformou meus dias em lembranças mais bonitas, meus sonhos em planos a dois e o meu futuro em algo que mal posso esperar para viver.',
  'Com você, aprendi que o amor está nos pequenos detalhes, na saudade que antecede um abraço e na paz de saber que temos um ao outro. Mesmo quando a distância nos separa, existe algo que nunca muda: é com você que quero compartilhar meus dias, realizar meus sonhos e construir uma vida inteira.',
];

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

/**
 * Mescla as alterações vindas do store no formData local, preservando
 * edições não salvas do usuário nos campos do formulário (ex.: texto digitado).
 */
export function mergeStoreConfigIntoForm(
  prevConfig: SiteConfig | null,
  newConfig: SiteConfig,
  currentForm: Partial<SiteConfig>
): Partial<SiteConfig> {
  const serverLoveMessages = newConfig.loveMessages ?? [];
  const serverAcrostic = newConfig.acrostic ?? [];
  const serverLetter = newConfig.letter ?? { paragraphs: [] };

  if (!prevConfig) {
    return {
      couple: newConfig.couple,
      relationship: newConfig.relationship,
      features: newConfig.features,
      theme: newConfig.theme,
      loveMessages: currentForm.loveMessages ?? serverLoveMessages,
      acrostic: currentForm.acrostic ?? serverAcrostic,
      letter: currentForm.letter ?? serverLetter,
    };
  }

  const p1Prev = prevConfig.couple?.partner1;
  const p1New = newConfig.couple?.partner1;
  const p1Form = currentForm.couple?.partner1;

  const partner1 = {
    ...p1New,
    name: (p1Form?.name !== undefined && p1Form.name !== p1Prev?.name) ? p1Form.name : (p1New?.name ?? ''),
    birthDate: (p1Form?.birthDate !== undefined && p1Form.birthDate !== p1Prev?.birthDate) ? p1Form.birthDate : (p1New?.birthDate ?? ''),
    gender: (p1Form?.gender !== undefined && p1Form.gender !== p1Prev?.gender) ? p1Form.gender : (p1New?.gender ?? 'M'),
    avatar: (p1New?.avatar !== p1Prev?.avatar) ? (p1New?.avatar ?? '') : (p1Form?.avatar ?? p1New?.avatar ?? ''),
    photoUrl: p1New?.photoUrl,
    _photoPublicId: p1New?._photoPublicId,
    playerId: p1New?.playerId ?? p1Form?.playerId,
  };

  const p2Prev = prevConfig.couple?.partner2;
  const p2New = newConfig.couple?.partner2;
  const p2Form = currentForm.couple?.partner2;

  const partner2 = {
    ...p2New,
    name: (p2Form?.name !== undefined && p2Form.name !== p2Prev?.name) ? p2Form.name : (p2New?.name ?? ''),
    birthDate: (p2Form?.birthDate !== undefined && p2Form.birthDate !== p2Prev?.birthDate) ? p2Form.birthDate : (p2New?.birthDate ?? ''),
    gender: (p2Form?.gender !== undefined && p2Form.gender !== p2Prev?.gender) ? p2Form.gender : (p2New?.gender ?? 'F'),
    avatar: (p2New?.avatar !== p2Prev?.avatar) ? (p2New?.avatar ?? '') : (p2Form?.avatar ?? p2New?.avatar ?? ''),
    photoUrl: p2New?.photoUrl,
    _photoPublicId: p2New?._photoPublicId,
    playerId: p2New?.playerId ?? p2Form?.playerId,
  };

  const relPrev = prevConfig.relationship;
  const relNew = newConfig.relationship;
  const relForm = currentForm.relationship;

  const relationship = {
    ...relNew,
    startDate: (relForm?.startDate !== undefined && relForm.startDate !== relPrev?.startDate)
      ? relForm.startDate
      : (relNew?.startDate ?? ''),
  };

  const featPrev = prevConfig.features || ({} as SiteConfig['features']);
  const featNew = newConfig.features || ({} as SiteConfig['features']);
  const featForm = currentForm.features || ({} as SiteConfig['features']);

  const features = { ...featNew };
  for (const key of Object.keys(featNew) as Array<keyof SiteConfig['features']>) {
    if (featForm[key] !== undefined && featForm[key] !== featPrev[key]) {
      features[key] = featForm[key];
    }
  }

  const loveMessages = (currentForm.loveMessages !== undefined && JSON.stringify(currentForm.loveMessages) !== JSON.stringify(prevConfig.loveMessages))
    ? currentForm.loveMessages
    : serverLoveMessages;

  const acrostic = (currentForm.acrostic !== undefined && JSON.stringify(currentForm.acrostic) !== JSON.stringify(prevConfig.acrostic))
    ? currentForm.acrostic
    : serverAcrostic;

  const letter = (currentForm.letter !== undefined && JSON.stringify(currentForm.letter) !== JSON.stringify(prevConfig.letter))
    ? currentForm.letter
    : serverLetter;

  return {
    couple: { partner1, partner2 },
    relationship,
    features,
    theme: newConfig.theme,
    loveMessages,
    acrostic,
    letter,
  };
}

/**
 * Calcula apenas os campos alterados pelo formulário em relação à config atual,
 * utilizando notação de ponto (dot-notation) para campos aninhados do casal.
 */
export function getChangedConfigFields(
  current: SiteConfig,
  form: Partial<SiteConfig>
): Record<string, unknown> {
  const updates: Record<string, unknown> = {};

  // Partner 1
  if (form.couple?.partner1) {
    const f1 = form.couple.partner1;
    const c1 = current.couple?.partner1;

    if (f1.name !== undefined && f1.name !== c1?.name) {
      updates['couple.partner1.name'] = f1.name;
    }
    if (f1.birthDate !== undefined && f1.birthDate !== c1?.birthDate) {
      updates['couple.partner1.birthDate'] = f1.birthDate;
    }
    if (f1.gender !== undefined && f1.gender !== c1?.gender) {
      updates['couple.partner1.gender'] = f1.gender;
    }
    if (f1.avatar !== undefined && f1.avatar !== c1?.avatar) {
      updates['couple.partner1.avatar'] = f1.avatar;
    }
    if (!c1?.playerId && f1.name) {
      updates['couple.partner1.playerId'] = f1.name.toLowerCase();
    }
  }

  // Partner 2
  if (form.couple?.partner2) {
    const f2 = form.couple.partner2;
    const c2 = current.couple?.partner2;

    if (f2.name !== undefined && f2.name !== c2?.name) {
      updates['couple.partner2.name'] = f2.name;
    }
    if (f2.birthDate !== undefined && f2.birthDate !== c2?.birthDate) {
      updates['couple.partner2.birthDate'] = f2.birthDate;
    }
    if (f2.gender !== undefined && f2.gender !== c2?.gender) {
      updates['couple.partner2.gender'] = f2.gender;
    }
    if (f2.avatar !== undefined && f2.avatar !== c2?.avatar) {
      updates['couple.partner2.avatar'] = f2.avatar;
    }
    if (!c2?.playerId && f2.name) {
      updates['couple.partner2.playerId'] = f2.name.toLowerCase();
    }
  }

  // Relationship
  if (form.relationship) {
    if (form.relationship.startDate !== undefined && form.relationship.startDate !== current.relationship?.startDate) {
      updates['relationship.startDate'] = form.relationship.startDate;
    }
  }

  // Features
  if (form.features) {
    for (const [key, val] of Object.entries(form.features)) {
      if (val !== current.features?.[key as keyof SiteConfig['features']]) {
        updates[`features.${key}`] = val;
      }
    }
  }

  // Love Messages
  if (form.loveMessages !== undefined && JSON.stringify(form.loveMessages) !== JSON.stringify(current.loveMessages)) {
    updates['loveMessages'] = form.loveMessages;
  }

  // Acrostic
  if (form.acrostic !== undefined && JSON.stringify(form.acrostic) !== JSON.stringify(current.acrostic)) {
    updates['acrostic'] = form.acrostic;
  }

  // Letter
  if (form.letter !== undefined && JSON.stringify(form.letter) !== JSON.stringify(current.letter)) {
    updates['letter'] = form.letter;
  }

  return updates;
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
    letter: config?.letter ?? { paragraphs: [] },
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
    if (formData.letter?.paragraphs !== undefined) return formData.letter.paragraphs;
    if (config?.letter?.paragraphs && config.letter.paragraphs.length > 0) return config.letter.paragraphs;
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <AdminPageHeader
        title="Configurações Gerais"
        description="Altere os dados básicos do casal e ative/desative funcionalidades do site."
      />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Identidade do Casal */}
        <Card className="bg-slate-800 border-slate-700 shadow-none">
          <CardHeader>
            <CardTitle className="text-slate-200">Identidade do Casal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-2 col-span-1 sm:col-span-1">
                <label className="text-sm font-medium text-slate-300">Nome 1</label>
                <Input
                  value={formData.couple?.partner1.name || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      couple: { ...formData.couple!, partner1: { ...formData.couple!.partner1, name: e.target.value } },
                    })
                  }
                  className="bg-slate-900 border-slate-700 text-slate-200"
                />
              </div>
              <div className="space-y-2 col-span-1 sm:col-span-1">
                <label className="text-sm font-medium text-slate-300">Aniversário 1</label>
                <Input
                  type="date"
                  value={formData.couple?.partner1.birthDate || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      couple: { ...formData.couple!, partner1: { ...formData.couple!.partner1, birthDate: e.target.value } },
                    })
                  }
                  className="bg-slate-900 border-slate-700 text-slate-200"
                />
              </div>
              <div className="space-y-2 col-span-1 sm:col-span-1">
                <label className="text-sm font-medium text-slate-300">Gênero 1</label>
                <select
                  value={formData.couple?.partner1.gender || 'M'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      couple: { ...formData.couple!, partner1: { ...formData.couple!.partner1, gender: e.target.value as 'M'|'F' } },
                    })
                  }
                  className="w-full h-10 px-3 bg-slate-900 border border-slate-700 rounded-md text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>
              <div className="space-y-2 col-span-1 sm:col-span-4 mt-2">
                <label className="text-sm font-medium text-slate-300">Avatar 1</label>
                <div className="flex gap-2 overflow-x-auto py-2 px-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
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

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 border-t border-slate-700/50 pt-4">
              <div className="space-y-2 col-span-1 sm:col-span-1">
                <label className="text-sm font-medium text-slate-300">Nome 2</label>
                <Input
                  value={formData.couple?.partner2.name || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      couple: { ...formData.couple!, partner2: { ...formData.couple!.partner2, name: e.target.value } },
                    })
                  }
                  className="bg-slate-900 border-slate-700 text-slate-200"
                />
              </div>
              <div className="space-y-2 col-span-1 sm:col-span-1">
                <label className="text-sm font-medium text-slate-300">Aniversário 2</label>
                <Input
                  type="date"
                  value={formData.couple?.partner2.birthDate || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      couple: { ...formData.couple!, partner2: { ...formData.couple!.partner2, birthDate: e.target.value } },
                    })
                  }
                  className="bg-slate-900 border-slate-700 text-slate-200"
                />
              </div>
              <div className="space-y-2 col-span-1 sm:col-span-1">
                <label className="text-sm font-medium text-slate-300">Gênero 2</label>
                <select
                  value={formData.couple?.partner2.gender || 'F'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      couple: { ...formData.couple!, partner2: { ...formData.couple!.partner2, gender: e.target.value as 'M'|'F' } },
                    })
                  }
                  className="w-full h-10 px-3 bg-slate-900 border border-slate-700 rounded-md text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>
              <div className="space-y-2 col-span-1 sm:col-span-4 mt-2">
                <label className="text-sm font-medium text-slate-300">Avatar 2</label>
                <div className="flex gap-2 overflow-x-auto py-2 px-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
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

            <div className="space-y-2 border-t border-slate-700/50 pt-4">
              <label className="text-sm font-medium text-slate-300">Data de Início do Namoro</label>
              <Input
                type="date"
                value={formData.relationship?.startDate || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    relationship: { startDate: e.target.value },
                  })
                }
                className="bg-slate-900 border-slate-700 text-slate-200"
              />
            </div>
          </CardContent>
        </Card>

        {/* Feature Flags */}
        <Card className="bg-slate-800 border-slate-700 shadow-none">
          <CardHeader>
            <CardTitle className="text-slate-200">Módulos Ativos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(Object.keys(formData.features || {}) as Array<keyof SiteConfig['features']>).map(
              (key) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700/50"
                >
                  <span className="text-slate-300 font-medium capitalize">
                    {key.replace('enable', '')}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
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
              )
            )}
          </CardContent>
        </Card>

      </div>

      {/* Acróstico e Mensagens de Amor */}
      <div className="grid md:grid-cols-2 gap-6 items-start">
        {/* Acróstico Personalizado */}
        <Card className="bg-slate-800 border-slate-700 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-slate-200 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Acróstico Personalizado
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAcrosticExpanded(!isAcrosticExpanded)}
                className="gap-1 text-xs border-slate-600 hover:bg-slate-700 text-slate-300"
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
                  className="gap-1.5 text-xs border-slate-600 hover:bg-slate-700 text-slate-200"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Letra
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-400">
              Personalize o acróstico que aparece na tela inicial. Cada letra tem um resumo curto e um texto longo revelado ao tocar.
            </p>

            {!isAcrosticExpanded ? (
              <div
                onClick={() => setIsAcrosticExpanded(true)}
                className="p-3.5 bg-slate-900/50 hover:bg-slate-900/80 border border-slate-700/60 rounded-xl cursor-pointer transition-all flex flex-wrap items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  {currentAcrostic.length === 0 ? (
                    <span className="text-xs text-slate-500 italic">Nenhuma letra cadastrada</span>
                  ) : (
                    currentAcrostic.map((item, i) => (
                      <span
                        key={i}
                        className="w-7 h-7 flex items-center justify-center bg-indigo-500/15 border border-indigo-500/40 text-indigo-300 font-bold rounded-lg text-xs"
                      >
                        {item.letter || '?'}
                      </span>
                    ))
                  )}
                  <span className="text-xs text-slate-400 ml-2">
                    {currentAcrostic.length} {currentAcrostic.length === 1 ? 'letra' : 'letras'}
                  </span>
                </div>
                <span className="text-xs text-indigo-400 font-medium group-hover:underline flex items-center gap-1">
                  Editar Letras →
                </span>
              </div>
            ) : currentAcrostic.length === 0 ? (
              <div className="p-6 border border-dashed border-slate-700 rounded-xl text-center text-slate-500 text-sm">
                Nenhuma letra cadastrada no acróstico. Clique em "Adicionar Letra" para criar.
              </div>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
                {currentAcrostic.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-900/70 border border-slate-700/60 rounded-xl space-y-3 relative group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-14">
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
                          className="bg-slate-800 border-slate-700 text-center font-bold text-lg text-indigo-300 h-9 px-1 uppercase"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">Frase Curta</label>
                        <Input
                          value={item.short}
                          placeholder="mor — você é meu tudo"
                          onChange={(e) => {
                            const updated = [...currentAcrostic];
                            updated[idx] = { ...updated[idx], short: e.target.value };
                            setFormData({ ...formData, acrostic: updated });
                          }}
                          className="bg-slate-800 border-slate-700 text-slate-200 h-9 text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = currentAcrostic.filter((_, i) => i !== idx);
                          setFormData({ ...formData, acrostic: updated });
                        }}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors mt-5"
                        title="Remover letra"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">Texto Detalhado (expandido)</label>
                      <textarea
                        value={item.long}
                        rows={2}
                        placeholder="Texto longo exibido ao clicar no card da letra..."
                        onChange={(e) => {
                          const updated = [...currentAcrostic];
                          updated[idx] = { ...updated[idx], long: e.target.value };
                          setFormData({ ...formData, acrostic: updated });
                        }}
                        className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mensagens de Amor */}
        <Card className="bg-slate-800 border-slate-700 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-slate-200 flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-400" />
              Mensagens de Amor ({currentLoveMessages.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsLoveMessagesExpanded(!isLoveMessagesExpanded)}
                className="gap-1 text-xs border-slate-600 hover:bg-slate-700 text-slate-300"
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
                  className="gap-1.5 text-xs border-slate-600 hover:bg-slate-700 text-slate-200"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Frase
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-400">
              Frases românticas sorteadas no botão "Nova mensagem" da tela principal.
            </p>

            {!isLoveMessagesExpanded ? (
              <div
                onClick={() => setIsLoveMessagesExpanded(true)}
                className="p-3.5 bg-slate-900/50 hover:bg-slate-900/80 border border-slate-700/60 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 group"
              >
                <div className="truncate min-w-0 mr-2">
                  <p className="text-xs text-slate-300 font-medium truncate italic">
                    "{currentLoveMessages[0] || 'Nenhuma frase cadastrada'}"
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {currentLoveMessages.length} {currentLoveMessages.length === 1 ? 'frase cadastrada' : 'frases cadastradas'}
                  </p>
                </div>
                <span className="text-xs text-rose-400 font-medium group-hover:underline shrink-0">
                  Ver Todas →
                </span>
              </div>
            ) : currentLoveMessages.length === 0 ? (
              <div className="p-6 border border-dashed border-slate-700 rounded-xl text-center text-slate-500 text-sm">
                Nenhuma frase cadastrada. Clique em "Adicionar Frase" para criar.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
                {currentLoveMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 bg-slate-900/60 border border-slate-700/50 rounded-lg group"
                  >
                    <span className="text-xs font-mono text-slate-500 w-6 text-center select-none">
                      {idx + 1}
                    </span>
                    <Input
                      value={msg}
                      placeholder="Digite uma frase de amor..."
                      onChange={(e) => {
                        const updated = [...currentLoveMessages];
                        updated[idx] = e.target.value;
                        setFormData({ ...formData, loveMessages: updated });
                      }}
                      className="bg-slate-800 border-slate-700 text-slate-200 text-xs h-9 flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = currentLoveMessages.filter((_, i) => i !== idx);
                        setFormData({ ...formData, loveMessages: updated });
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Excluir frase"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Carta de Amor */}
        <Card className="bg-slate-800 border-slate-700 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-slate-200 flex items-center gap-2">
              <Mail className="w-5 h-5 text-pink-400" />
              Carta de Amor ({currentLetterParagraphs.length} parágrafos)
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsLetterExpanded(!isLetterExpanded)}
                className="gap-1 text-xs border-slate-600 hover:bg-slate-700 text-slate-300"
              >
                {isLetterExpanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" /> Recolher
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" /> Expandir ({currentLetterParagraphs.length})
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
                    className="gap-1.5 text-xs border-slate-600 hover:bg-slate-700 text-slate-300"
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
                    className="gap-1.5 text-xs border-slate-600 hover:bg-slate-700 text-slate-200"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Parágrafo
                  </Button>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-400">
              Personalize o texto da carta exibida na seção "Uma Carta Para Você" da página principal.
            </p>

            {!isLetterExpanded ? (
              <div
                onClick={() => setIsLetterExpanded(true)}
                className="p-3.5 bg-slate-900/50 hover:bg-slate-900/80 border border-slate-700/60 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 group"
              >
                <div className="truncate min-w-0 mr-2">
                  <p className="text-xs text-slate-300 font-medium truncate italic">
                    "{currentLetterParagraphs[0]?.slice(0, 110) || 'Nenhum parágrafo configurado'}..."
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {currentLetterParagraphs.length} {currentLetterParagraphs.length === 1 ? 'parágrafo configurado' : 'parágrafos configurados'}
                  </p>
                </div>
                <span className="text-xs text-pink-400 font-medium group-hover:underline shrink-0">
                  Editar Carta →
                </span>
              </div>
            ) : currentLetterParagraphs.length === 0 ? (
              <div className="p-6 border border-dashed border-slate-700 rounded-xl text-center text-slate-500 text-sm space-y-3">
                <p>Nenhum parágrafo configurado.</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      letter: { paragraphs: [...DEFAULT_LETTER_PARAGRAPHS] },
                    });
                  }}
                  className="text-xs border-slate-600 text-slate-300"
                >
                  Restaurar Texto Original
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
                {currentLetterParagraphs.map((par, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-900/60 border border-slate-700/50 rounded-lg space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">
                        Parágrafo {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = currentLetterParagraphs.filter((_, i) => i !== idx);
                          setFormData({ ...formData, letter: { paragraphs: updated } });
                        }}
                        className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Excluir parágrafo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
                      className="w-full bg-slate-800 border border-slate-700 rounded-md p-2.5 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-y leading-relaxed"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4 border-t border-slate-800">
        <Button
          onClick={handleSave}
          isLoading={isSaving}
          disabled={!isServerConfig || isSaving}
          className="gap-2 px-8"
        >
          <Save className="w-4 h-4" /> Salvar Alterações
        </Button>

        {!isServerConfig && (
          <p className="text-xs text-amber-400 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-md">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            Carregando configuração atualizada do servidor... Aguarde a sincronização para salvar.
          </p>
        )}
      </div>
    </div>
  );
}
