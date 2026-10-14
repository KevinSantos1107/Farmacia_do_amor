import {
  differenceInSeconds,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  differenceInMonths,
  differenceInYears,
} from 'date-fns';

export interface TimeLeft {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalDays: number;
}

export function getTimeLeft(startDate: Date): TimeLeft {
  const now = new Date();
  const years = differenceInYears(now, startDate);
  const wy = new Date(startDate);
  wy.setFullYear(wy.getFullYear() + years);
  const months = differenceInMonths(now, wy);
  const wm = new Date(wy);
  wm.setMonth(wm.getMonth() + months);
  const days = differenceInDays(now, wm);
  const wd = new Date(wm);
  wd.setDate(wd.getDate() + days);
  const hours = differenceInHours(now, wd);
  const wh = new Date(wd);
  wh.setHours(wh.getHours() + hours);
  const minutes = differenceInMinutes(now, wh);
  const wmin = new Date(wh);
  wmin.setMinutes(wmin.getMinutes() + minutes);
  const seconds = differenceInSeconds(now, wmin);
  const totalDays = differenceInDays(now, startDate);
  return { years, months, days, hours, minutes, seconds, totalDays };
}
