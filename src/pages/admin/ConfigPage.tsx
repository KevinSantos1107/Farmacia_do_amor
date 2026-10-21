import { useState, useEffect, useMemo, useRef } from 'react';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import { useSiteId } from '../../services/firestore/paths';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Spinner } from '../../shared/ui/Spinner';
import { Save, AlertTriangle } from 'lucide-react';
import type { SiteConfig } from '../../config/siteConfig.schema';
import { AvatarPicker } from '../../features/avatar/AvatarPicker';

import { useToast } from '../../shared/ui/ToastProvider';
import { AdminPageHeader } from './AdminPageHeader';

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

/**
 * Mescla as alterações vindas do store no formData local, preservando
 * edições não salvas do usuário nos campos do formulário (ex.: texto digitado).
 */
export function mergeStoreConfigIntoForm(
  prevConfig: SiteConfig | null,
  newConfig: SiteConfig,
  currentForm: Partial<SiteConfig>
): Partial<SiteConfig> {
  if (!prevConfig) {
    return {
      couple: newConfig.couple,
      relationship: newConfig.relationship,
      features: newConfig.features,
      theme: newConfig.theme,
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

  return {
    couple: { partner1, partner2 },
    relationship,
    features,
    theme: newConfig.theme,
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
  }));

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
