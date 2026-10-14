export interface CounterBoxProps {
  value: number;
  label: string;
}

export function CounterBox({ value, label }: CounterBoxProps) {
  return (
    <div className="relative flex flex-col items-center gap-2">
      <div className="relative w-16 md:w-20 px-2 py-4 rounded-xl border border-[var(--theme-primary)]/50 backdrop-blur-xl text-center overflow-hidden transition-all duration-300 shadow-[0_0_20px_rgba(var(--theme-primary-rgb),0.4),inset_0_0_15px_rgba(var(--theme-primary-rgb),0.15)] hover:shadow-[0_0_40px_rgba(var(--theme-primary-rgb),0.7),inset_0_0_25px_rgba(var(--theme-primary-rgb),0.3)] bg-white/[0.03]">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--theme-primary)]/20 to-transparent pointer-events-none" />
        <span
          className="block font-bold font-mono text-white leading-none"
          style={{
            fontSize: 'clamp(1.4rem, 4vw, 2.5rem)',
            textShadow: '0 0 10px var(--theme-primary), 0 0 20px var(--theme-primary)',
          }}
        >
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span
        className="text-[10px] md:text-[11px] uppercase tracking-[0.2em] font-bold"
        style={{ color: 'var(--theme-accent)', textShadow: '0 0 8px rgba(255,77,148,0.5)' }}
      >
        {label}
      </span>
    </div>
  );
}
