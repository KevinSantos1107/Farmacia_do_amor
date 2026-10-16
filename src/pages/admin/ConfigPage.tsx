import { useState, useEffect, useMemo } from 'react';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import { useSiteId } from '../../services/firestore/paths';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Save } from 'lucide-react';
import type { SiteConfig } from '../../config/siteConfig.schema';
import { AvatarPicker } from '../../features/avatar/AvatarPicker';

import { useToast } from '../../shared/ui/ToastProvider';

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
  const { config, updateConfig } = useSiteConfigStore();
  const siteId = useSiteId();
  const { show } = useToast();

  const [formData, setFormData] = useState<Partial<SiteConfig>>({
    couple: config?.couple,
    relationship: config?.relationship,
    features: config?.features,
    theme: config?.theme,
  });

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

  // Sincroniza formData com o store quando o config é carregado ou atualizado
  useEffect(() => {
    if (config) {
      setFormData({
        couple: config.couple,
        relationship: config.relationship,
        features: config.features,
        theme: config.theme,
      });
    }
  }, [config]);

  if (!config) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Deriva playerId do nome (minúsculas) apenas se ainda não estiver definido.
      // Nunca sobrescreve um playerId existente — os IDs são estáveis como chaves do Firestore.
      const updatedFormData = { ...formData };
      if (updatedFormData.couple) {
        const p1 = updatedFormData.couple.partner1;
        const p2 = updatedFormData.couple.partner2;
        if (!p1.playerId && p1.name) {
          updatedFormData.couple = {
            ...updatedFormData.couple,
            partner1: { ...p1, playerId: p1.name.toLowerCase() },
          };
        }
        if (!p2.playerId && p2.name) {
          updatedFormData.couple = {
            ...updatedFormData.couple,
            partner2: { ...p2, playerId: p2.name.toLowerCase() },
          };
        }
      }
      await updateConfig(siteId, updatedFormData);
      show('Configurações salvas com sucesso!');
    } catch (err: unknown) {
      show('Erro ao salvar: ' + (err instanceof Error ? err.message : String(err)), 'err');
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Configurações Gerais</h1>
        <p className="text-slate-400 mt-1">
          Altere os dados básicos do casal e ative/desative funcionalidades do site.
        </p>
      </div>

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

      <div className="flex items-center gap-4 pt-4 border-t border-slate-800">
        <Button onClick={handleSave} isLoading={isSaving} className="gap-2 px-8">
          <Save className="w-4 h-4" /> Salvar Alterações
        </Button>
      </div>
    </div>
  );
}
