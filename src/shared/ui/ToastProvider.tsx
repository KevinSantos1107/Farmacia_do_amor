import type { ReactNode } from 'react';
import { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '../utils/cn';

interface ToastContextData {
  show: (text: string, type?: 'ok' | 'err') => void;
}

const ToastContext = createContext<ToastContextData | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);

  const show = useCallback((text: string, type: 'ok' | 'err' = 'ok') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {msg && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-[9999] px-5 py-3 rounded-xl shadow-xl font-medium text-sm animate-in slide-in-from-bottom-4 duration-300',
            msg.type === 'ok' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
          )}
        >
          {msg.text}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
