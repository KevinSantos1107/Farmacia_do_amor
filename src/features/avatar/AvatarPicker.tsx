import { useRef, useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { AvatarCropModal } from './AvatarCropModal';
import { useAvatarUpload, type PartnerKey } from './useAvatarUpload';
import { useToast } from '../../shared/ui/ToastProvider';

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 10;

interface AvatarPickerProps {
  partner: PartnerKey;
  currentPhotoUrl?: string;
  selectedAvatar?: string;
  onSelect: (avatarUrl: string) => void;
  onPhotoUploaded: (newUrl: string) => void;
  onPhotoDeleted: (revertedAvatar: string) => void;
}

export function AvatarPicker({
  partner,
  currentPhotoUrl,
  selectedAvatar,
  onSelect,
  onPhotoUploaded,
  onPhotoDeleted,
}: AvatarPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarWrapperRef = useRef<HTMLDivElement>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isMobileActive, setIsMobileActive] = useState(false);

  const { isUploading, isDeleting, uploadProgress, upload, remove } = useAvatarUpload();
  const { show } = useToast();

  // Fecha o botão de lixeira no mobile e tablet ao clicar fora do avatar
  useEffect(() => {
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (avatarWrapperRef.current && !avatarWrapperRef.current.contains(e.target as Node)) {
        setIsMobileActive(false);
      }
    };
    document.addEventListener('click', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('click', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, []);

  // Se outro avatar for selecionado, esconde a lixeira da foto personalizada
  useEffect(() => {
    if (selectedAvatar !== currentPhotoUrl) {
      setIsMobileActive(false);
    }
  }, [selectedAvatar, currentPhotoUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // Permite selecionar o mesmo arquivo novamente se desejar

    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type.toLowerCase())) {
      show('Formato de arquivo incompatível. Utilize imagens JPG, PNG ou WEBP.', 'err');
      return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      show(`O arquivo é muito grande. O limite máximo permitido é ${MAX_SIZE_MB} MB.`, 'err');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setCropImageSrc(objectUrl);
  };

  const handleCropConfirm = async (blob: Blob) => {
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
      setCropImageSrc(null);
    }

    try {
      const uploadedUrl = await upload(blob, partner);
      show('Foto personalizada salva com sucesso!');
      onPhotoUploaded(uploadedUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar a imagem.';
      show(msg, 'err');
    }
  };

  const handleCropCancel = () => {
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
      setCropImageSrc(null);
    }
  };

  const handleDeleteConfirm = async () => {
    setShowDeleteModal(false);
    try {
      await remove(partner);
      show('Foto personalizada excluída com sucesso.');
      const defaultAvatar = partner === 'partner1' ? '/avatars/avatar_1.webp' : '/avatars/avatar_2.webp';
      onPhotoDeleted(defaultAvatar);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir a foto.';
      show(msg, 'err');
    }
  };

  // ── Cenário 1: O integrante JÁ possui foto personalizada cadastrada ───────
  if (currentPhotoUrl) {
    const isSelected = selectedAvatar === currentPhotoUrl;

    const handleAvatarClick = () => {
      onSelect(currentPhotoUrl);
      // No mobile e tablet, um clique no avatar revela ou recolhe a lixeira com animação
      setIsMobileActive((prev) => !prev);
    };

    return (
      <>
        <div ref={avatarWrapperRef} className="relative w-12 h-12 flex-shrink-0 group">
          <img
            src={currentPhotoUrl}
            alt="Foto personalizada"
            onClick={handleAvatarClick}
            className={`w-12 h-12 rounded-full cursor-pointer border-2 flex-shrink-0 object-cover transition-all ${
              isSelected
                ? 'border-indigo-500 scale-110 shadow-lg ring-2 ring-indigo-500/30'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          />

          {/* Botão intuitivo de exclusão com animação fluida (no desktop por hover, no mobile/tablet por clique) */}
          {!isDeleting && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteModal(true);
              }}
              aria-label="Excluir foto personalizada"
              title="Excluir foto personalizada"
              className={`
                absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-600 hover:bg-red-500 active:scale-90 text-white flex items-center justify-center shadow-lg ring-2 ring-slate-900 cursor-pointer
                transition-all duration-200 ease-out transform
                ${
                  isMobileActive
                    ? 'opacity-100 scale-100 pointer-events-auto'
                    : 'opacity-0 scale-50 pointer-events-none lg:group-hover:opacity-100 lg:group-hover:scale-100 lg:group-hover:pointer-events-auto'
                }
              `}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}

          {isDeleting && (
            <div className="absolute inset-0 rounded-full bg-black/70 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            </div>
          )}
        </div>

          {/* Modal de confirmação de exclusão */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/75 backdrop-blur-sm"
              onClick={() => setShowDeleteModal(false)}
            />
            <div className="relative z-[251] w-full max-w-[310px] sm:max-w-xs bg-slate-900/95 backdrop-blur-md border border-slate-700/60 rounded-3xl shadow-2xl p-5 text-white ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-8 h-8 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight">Excluir foto?</h3>
                  <p className="text-[11px] text-slate-400">Esta ação não pode ser desfeita</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                A foto personalizada será removida. Você poderá cadastrar uma nova imagem após a exclusão.
              </p>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-700/70 text-slate-300 hover:text-white hover:bg-slate-800 text-xs sm:text-sm font-medium transition-all active:scale-95 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-red-900/30 cursor-pointer"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ── Cenário 2: O integrante NÃO possui foto personalizada cadastrada ─────
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        aria-label="Adicionar foto personalizada"
        className={`
          w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center
          border-2 border-dashed border-slate-600 bg-slate-900/60 text-slate-400
          hover:border-indigo-500 hover:text-indigo-400 hover:bg-indigo-500/10
          active:scale-95 transition-all cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900
          disabled:opacity-40 disabled:pointer-events-none
        `}
      >
        {isUploading ? (
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
            {uploadProgress > 0 && (
              <span className="text-[8px] text-indigo-400 font-mono mt-0.5">{uploadProgress}%</span>
            )}
          </div>
        ) : (
          <Plus className="w-5 h-5" />
        )}
      </button>

      {/* Editor de enquadramento aberto automaticamente após a seleção */}
      {cropImageSrc && (
        <AvatarCropModal
          imageSrc={cropImageSrc}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
}
