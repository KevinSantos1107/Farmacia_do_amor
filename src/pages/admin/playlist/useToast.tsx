import { useState, useCallback } from 'react';
import { cn } from '../../../shared/utils/cn';

export function useToast() {
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const show = useCallback((text: string, type: 'ok' | 'err' = 'ok') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3500);
  }, []);
  const Toast = msg ? (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl font-medium text-sm animate-in slide-in-from-bottom-4 duration-300',
        msg.type === 'ok' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
      )}
    >
      {msg.text}
    </div>
  ) : null;
  return { show, Toast };
}
