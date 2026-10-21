/**
 * DevotionalToast.tsx
 *
 * Toast visual elegante para notificações do Devocional
 * (favoritar, desfavoritar, copiar versículo, reiniciar sessão, etc.).
 */

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Heart, Info, AlertCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type?: 'success' | 'love' | 'info' | 'error';
  text: string;
}

interface DevotionalToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export function DevotionalToast({ toast, onDismiss }: DevotionalToastProps) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100000] max-w-sm w-[90%] sm:w-auto pointer-events-auto"
        >
          <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-[#1F1630]/95 border border-[#D4AF37]/45 text-[#F5E6CC] backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,0,0,0.7),0_0_20px_rgba(212,175,55,0.25)]">
            <div className="shrink-0">
              {toast.type === 'love' && (
                <Heart className="w-5 h-5 text-[#ff0055] fill-[#ff0055] animate-pulse" />
              )}
              {toast.type === 'success' && (
                <CheckCircle2 className="w-5 h-5 text-[#D4AF37]" />
              )}
              {toast.type === 'error' && (
                <AlertCircle className="w-5 h-5 text-red-400" />
              )}
              {(!toast.type || toast.type === 'info') && (
                <Info className="w-5 h-5 text-[#D4AF37]" />
              )}
            </div>

            <p className="text-sm font-medium text-[#F5E6CC] pr-2 leading-snug">
              {toast.text}
            </p>

            <button
              type="button"
              onClick={onDismiss}
              className="p-1 rounded-lg text-[#F5E6CC]/40 hover:text-[#F5E6CC] transition-colors ml-auto shrink-0"
              aria-label="Fechar notificação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
