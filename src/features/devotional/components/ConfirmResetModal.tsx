/**
 * ConfirmResetModal.tsx
 *
 * Diálogo elegante de confirmação para reiniciar o devocional,
 * substituindo o window.confirm nativo do navegador.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw } from 'lucide-react';

interface ConfirmResetModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

export function ConfirmResetModal({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Recomeçar o devocional de hoje?',
  description = 'Os sentimentos registrados de hoje serão limpos para que vocês possam preencher novamente do zero.',
}: ConfirmResetModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100001] flex items-center justify-center p-4">
          {/* Backdrop escuro com desfoque suave */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />

          {/* Card de Confirmação com visual dourado/púrpura */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-sm rounded-3xl bg-[#1F1630] border border-[#D4AF37]/40 p-6 text-center space-y-4 shadow-[0_15px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(212,175,55,0.25)]"
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/35 flex items-center justify-center text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.25)]">
              <RotateCcw className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-serif font-bold text-[#F5E6CC]">
                {title}
              </h3>
              <p className="text-xs text-[#F5E6CC]/70 font-light leading-relaxed">
                {description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="py-2.5 px-4 rounded-full text-xs font-semibold uppercase tracking-wider text-[#F5E6CC]/70 hover:text-white border border-white/10 hover:bg-white/5 transition-all min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="py-2.5 px-4 rounded-full text-xs font-semibold uppercase tracking-wider bg-gradient-to-r from-[#D4AF37] to-[#B8962E] text-[#160E24] shadow-[0_0_15px_rgba(212,175,55,0.35)] hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] transition-all min-h-[44px] cursor-pointer"
              >
                Sim, recomeçar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
