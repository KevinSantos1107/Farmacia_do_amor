import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { cn } from '../../../shared/utils/cn';
import type { ConfirmDialogState } from './types';

interface ConfirmModalProps {
  dialog: ConfirmDialogState;
  onClose: () => void;
}

export function ConfirmModal({ dialog, onClose }: ConfirmModalProps) {
  return (
    <Modal
      isOpen={dialog.isOpen}
      onClose={onClose}
      title={dialog.title}
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-400 leading-relaxed">{dialog.message}</p>
        <div className="flex gap-2 justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
            className="bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm py-1.5 px-3"
          >
            {dialog.cancelText || 'Cancelar'}
          </Button>
          <Button
            onClick={dialog.onConfirm}
            className={cn(
              'text-white text-sm py-1.5 px-3',
              dialog.isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            )}
          >
            {dialog.confirmText || 'Confirmar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
