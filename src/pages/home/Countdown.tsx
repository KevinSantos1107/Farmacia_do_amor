import { useTimeLeft } from './useTimeLeft';
import { CounterBox } from './CounterBox';

export interface CountdownProps {
  startMs: number | null | undefined;
}

export function Countdown({ startMs }: CountdownProps) {
  const time = useTimeLeft(startMs, 1000);

  if (!time) return null;

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-x-4 md:gap-x-12 gap-y-8 p-6 md:p-8 rounded-[2rem] border border-[var(--theme-primary)]/30 bg-white/[0.02] backdrop-blur-2xl shadow-[0_0_50px_rgba(var(--theme-primary-rgb),0.15)] justify-items-center">
      <CounterBox value={time.years} label="Anos" />
      <CounterBox value={time.months} label="Meses" />
      <CounterBox value={time.days} label="Dias" />

      <CounterBox value={time.hours} label="Horas" />
      <CounterBox value={time.minutes} label="Min" />
      <CounterBox value={time.seconds} label="Seg" />
    </div>
  );
}
