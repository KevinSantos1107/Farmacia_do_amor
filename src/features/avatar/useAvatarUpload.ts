/**
 * useAvatarUpload
 *
 * Gerencia o upload, persistência e exclusão da foto personalizada
 * de um integrante do casal (homem ou mulher).
 *
 * Regras:
 *  - Limite de UMA foto personalizada por integrante.
 *  - Não permite substituir sem antes excluir.
 *  - Upload para Cloudinary na pasta avatars/{siteId}/{partner}.
 *  - Persistência direta no Firestore (sites/{siteId}).
 *  - Exclusão independente (excluir de um não afeta o outro).
 */

import { useRef, useState } from 'react';
import { uploadImage, cloudinaryUrl } from '../../services/cloudinary/upload';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import { useSiteId } from '../../services/firestore/paths';
import type { SiteConfig } from '../../config/siteConfig.schema';

export type PartnerKey = 'partner1' | 'partner2';

interface UseAvatarUploadReturn {
  isUploading: boolean;
  isDeleting: boolean;
  uploadProgress: number;
  upload: (blob: Blob, partner: PartnerKey) => Promise<string>;
  remove: (partner: PartnerKey) => Promise<void>;
}

function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type || 'image/jpeg' });
}

export function useAvatarUpload(): UseAvatarUploadReturn {
  const { config, updateConfig } = useSiteConfigStore();
  const siteId = useSiteId();
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const upload = async (blob: Blob, partner: PartnerKey): Promise<string> => {
    if (!config) throw new Error('Configuração não carregada.');

    // ── Regra 2: Limite estrito de 1 foto por integrante ────────────────────
    const current = config.couple[partner];
    if (current?.photoUrl) {
      throw new Error(
        'Este integrante já possui uma foto personalizada cadastrada. Exclua a foto atual antes de adicionar outra.'
      );
    }

    // ── Validação de tamanho (máximo 10 MB) ─────────────────────────────────
    const MAX_BYTES = 10 * 1024 * 1024;
    if (blob.size > MAX_BYTES) {
      throw new Error('A imagem selecionada é muito grande. O limite máximo é 10 MB.');
    }

    // ── Prevenção contra requisições simultâneas ────────────────────────────
    if (isUploading) {
      throw new Error('Já existe um envio em andamento.');
    }

    setIsUploading(true);
    setUploadProgress(0);
    abortRef.current = new AbortController();

    try {
      const filename = `avatar_${partner}_${Date.now()}.webp`;
      const file = blobToFile(blob, filename);
      const folder = `avatars/${siteId}/${partner}`;

      const result = await uploadImage(
        file,
        folder,
        (pct) => setUploadProgress(pct),
        abortRef.current.signal
      );

      // Otimização de entrega de ponta:
      // - f: 'auto' (entrega WebP ou AVIF de acordo com o suporte do navegador)
      // - q: 'auto' (compressão inteligente, peso de ~10-15KB)
      // - w: 256, h: 256, c: 'fill' (dimensão exata para visualização ultra-rápida)
      const uploadedUrl = result.publicId
        ? cloudinaryUrl(result.publicId, { w: 256, h: 256, c: 'fill', q: 'auto', f: 'auto' })
        : (result.secureUrl || result.url);

      // Atualiza o documento no Firestore associando ao integrante
      const updatedCouple: SiteConfig['couple'] = {
        ...config.couple,
        [partner]: {
          ...config.couple[partner],
          photoUrl: uploadedUrl,
          avatar: uploadedUrl, // Define como avatar ativo imediatamente
          _photoPublicId: result.publicId,
        },
      };

      await updateConfig(siteId, { couple: updatedCouple });

      return uploadedUrl;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      abortRef.current = null;
    }
  };

  const remove = async (partner: PartnerKey) => {
    if (!config) throw new Error('Configuração não carregada.');

    const current = config.couple[partner];
    if (!current?.photoUrl) {
      throw new Error('Não há foto personalizada cadastrada para excluir.');
    }

    if (isDeleting) {
      throw new Error('Exclusão já em andamento.');
    }

    setIsDeleting(true);

    try {
      // Reverte para o avatar padrão caso o avatar ativo seja a foto excluída
      const defaultAvatar =
        current.gender === 'F' ? '/avatars/avatar_2.webp' : '/avatars/avatar_1.webp';
      const activeAvatar = current.avatar;
      const nextAvatar = activeAvatar === current.photoUrl ? defaultAvatar : activeAvatar;

      // Cria objeto limpo sem os campos de foto personalizada
      const cleanPartner: NonNullable<SiteConfig['couple']>[PartnerKey] & { _photoPublicId?: string } = { ...current };
      delete cleanPartner.photoUrl;
      delete cleanPartner._photoPublicId;
      cleanPartner.avatar = nextAvatar;

      const updatedCouple: SiteConfig['couple'] = {
        ...config.couple,
        [partner]: cleanPartner,
      };

      await updateConfig(siteId, { couple: updatedCouple });
    } finally {
      setIsDeleting(false);
    }
  };

  return { isUploading, isDeleting, uploadProgress, upload, remove };
}
