// lib/time.ts
const TZ = 'America/Costa_Rica';

export function formatCRDay(d: Date = new Date()): string {
  // "YYYY-MM-DD" en CR
  const y = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year:'numeric' }).format(d);
  const m = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, month:'2-digit' }).format(d);
  const dd = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, day:'2-digit' }).format(d);
  return `${y}-${m}-${dd}`;
}

export function startEndOfCRDay(d: Date = new Date()) {
  const key = formatCRDay(d);
  // CR es UTC-6, no DST; dejamos -06:00 fijo
  return {
    start: new Date(`${key}T00:00:00.000-06:00`),
    end:   new Date(`${key}T23:59:59.999-06:00`)
  };
}

export function slotCR(d: Date): 'AM'|'PM' {
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour:'2-digit', hour12:false }).format(d));
  return h < 12 ? 'AM' : 'PM';
}