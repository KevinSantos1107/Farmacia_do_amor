import { Delete, Check } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { KEYBOARD_ROWS, KEY_BG } from './wordConstants';

interface WordKeyboardProps {
  keyStates: Record<string, string>;
  onKey: (key: string) => void;
}

export function WordKeyboard({ keyStates, onKey }: WordKeyboardProps) {
  return (
    <div className="w-full pb-2 pt-0.5 px-2">
      {/* Botões de apagar e confirmar */}
      <div className="flex items-center justify-center gap-5 mb-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onKey('BACKSPACE');
          }}
          className="relative w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 group"
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1.5px solid rgba(239, 68, 68, 0.3)',
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.08)',
          }}
        >
          <Delete className="w-4 h-4 text-red-400 group-hover:text-red-300 transition-colors" />
          <div
            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(239, 68, 68, 0.06)' }}
          />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onKey('ENTER');
          }}
          className="relative w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 group"
          style={{
            background: 'rgba(52, 211, 153, 0.08)',
            border: '1.5px solid rgba(52, 211, 153, 0.35)',
            boxShadow: '0 0 20px rgba(52, 211, 153, 0.12)',
          }}
        >
          <Check
            className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300 transition-colors"
            strokeWidth={2.5}
          />
          <div
            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(52, 211, 153, 0.06)' }}
          />
        </button>
      </div>

      {/* Linha divisória com glow */}
      <div className="relative flex items-center justify-center mb-2">
        <div className="w-full h-px bg-white/5" />
        <div
          className="absolute w-20 h-px"
          style={{
            background: `linear-gradient(to right, transparent, rgba(var(--theme-primary-rgb), 0.4), transparent)`,
          }}
        />
      </div>

      {/* Teclado */}
      <div className="flex flex-col gap-[5px] items-center w-full px-1">
        {KEYBOARD_ROWS.map((row, ri) => (
          <div key={ri} className="flex gap-[3px] w-full justify-center">
            {ri === 1 && <div style={{ flex: 0.5 }} />}
            {ri === 2 && <div style={{ flex: 1.5 }} />}
            {row.map((key) => {
              const state = keyStates[key];
              return (
                <button
                  key={key}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onKey(key);
                  }}
                  className={cn(
                    'border rounded-[7px] font-semibold uppercase select-none flex items-center justify-center transition-all duration-150',
                    KEY_BG[state || 'default']
                  )}
                  style={{ flex: 1, height: 'clamp(38px, 10.5vw, 50px)' }}
                >
                  <span className="text-[12px]">{key}</span>
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
