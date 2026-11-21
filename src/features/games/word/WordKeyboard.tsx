import { useState } from 'react';
import { Delete, Check } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { KEYBOARD_ROWS, KEY_BG } from './wordConstants';

interface WordKeyboardProps {
  keyStates: Record<string, string>;
  onKey: (key: string) => void;
  disabled?: boolean;
}

export function WordKeyboard({ keyStates, onKey, disabled = false }: WordKeyboardProps) {
  const [pressedKeys, setPressedKeys] = useState<Record<string, boolean>>({});
  const [actionPressed, setActionPressed] = useState<string | null>(null);

  // ── Animação tátil de afundar e voltar no toque (pointerDown) ──────────────
  const handlePointerDown = (key: string) => {
    if (disabled) return;
    setPressedKeys((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setPressedKeys((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 120);
  };

  const handleActionDown = (action: string) => {
    if (disabled) return;
    setActionPressed(action);
    setTimeout(() => {
      setActionPressed((curr) => (curr === action ? null : curr));
    }, 120);
  };

  return (
    <div
      className={cn(
        'w-full pb-2 md:pb-3 pt-0.5 px-1 sm:px-2 transition-opacity duration-200',
        disabled && 'opacity-60 pointer-events-none select-none'
      )}
      style={{ touchAction: 'manipulation' }}
    >
      {/* Botões de apagar e confirmar */}
      <div className="flex items-center justify-center gap-5 md:gap-6 mb-2 md:mb-3">
        <button
          disabled={disabled}
          onPointerDown={(e) => {
            e.stopPropagation();
            handleActionDown('BACKSPACE');
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onKey('BACKSPACE');
          }}
          className={cn(
            'relative w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all group',
            actionPressed === 'BACKSPACE' && 'wg-key-press'
          )}
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1.5px solid rgba(239, 68, 68, 0.3)',
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.08)',
            touchAction: 'manipulation',
          }}
        >
          <Delete className="w-4 h-4 md:w-5 md:h-5 text-red-400 group-hover:text-red-300 transition-colors" />
          <div
            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(239, 68, 68, 0.06)' }}
          />
        </button>
        <button
          disabled={disabled}
          onPointerDown={(e) => {
            e.stopPropagation();
            handleActionDown('ENTER');
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onKey('ENTER');
          }}
          className={cn(
            'relative w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all group',
            actionPressed === 'ENTER' && 'wg-key-press'
          )}
          style={{
            background: 'rgba(52, 211, 153, 0.08)',
            border: '1.5px solid rgba(52, 211, 153, 0.35)',
            boxShadow: '0 0 20px rgba(52, 211, 153, 0.12)',
            touchAction: 'manipulation',
          }}
        >
          <Check
            className="w-4 h-4 md:w-5 md:h-5 text-emerald-400 group-hover:text-emerald-300 transition-colors"
            strokeWidth={2.5}
          />
          <div
            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(52, 211, 153, 0.06)' }}
          />
        </button>
      </div>

      {/* Linha divisória com glow */}
      <div className="relative flex items-center justify-center mb-2 md:mb-3">
        <div className="w-full h-px bg-white/5" />
        <div
          className="absolute w-20 h-px"
          style={{
            background: `linear-gradient(to right, transparent, rgba(var(--theme-primary-rgb), 0.4), transparent)`,
          }}
        />
      </div>

      {/* Teclado */}
      <div className="flex flex-col gap-[4px] sm:gap-[5px] md:gap-[6px] items-center w-full px-0.5 sm:px-1">
        {KEYBOARD_ROWS.map((row, ri) => (
          <div key={ri} className="flex gap-[3px] md:gap-[4px] w-full justify-center">
            {ri === 1 && <div style={{ flex: 0.5 }} />}
            {ri === 2 && <div style={{ flex: 1.5 }} />}
            {row.map((key) => {
              const state = keyStates[key];
              const isPressed = !!pressedKeys[key];

              return (
                <button
                  key={key}
                  disabled={disabled}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handlePointerDown(key);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!disabled) onKey(key);
                  }}
                  className={cn(
                    'border rounded-[7px] md:rounded-[9px] font-bold uppercase select-none flex items-center justify-center transition-all duration-150',
                    KEY_BG[state || 'default'],
                    isPressed && 'wg-key-press'
                  )}
                  style={{
                    flex: 1,
                    height: 'clamp(36px, min(10vw, 5.5dvh), 50px)',
                    touchAction: 'manipulation',
                  }}
                >
                  <span className="text-[11px] sm:text-[12px] md:text-[13px] lg:text-[14px]">{key}</span>
                </button>
              );
            })}
            {ri === 1 && <div style={{ flex: 0.5 }} />}
            {ri === 2 && <div style={{ flex: 1.5 }} />}
          </div>
        ))}
      </div>
    </div>
  );
}
