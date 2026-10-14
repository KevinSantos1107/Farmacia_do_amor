import { useState, useEffect, useMemo } from 'react';
import { getTimeLeft, type TimeLeft } from './getTimeLeft';

export function useTimeLeft(
  startMs: number | null | undefined,
  intervalMs: number = 1000
): TimeLeft | null {
  const [time, setTime] = useState<TimeLeft | null>(null);

  const startDate = useMemo(() => {
    return startMs != null ? new Date(startMs) : null;
  }, [startMs]);

  useEffect(() => {
    if (!startDate) {
      setTime(null);
      return;
    }

    const tick = () => setTime(getTimeLeft(startDate));
    tick();

    const interval = setInterval(tick, intervalMs);
    return () => clearInterval(interval);
  }, [startDate, intervalMs]);

  return time;
}
