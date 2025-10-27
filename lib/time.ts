// lib/time.ts
const TZ = 'America/Costa_Rica';

export function formatCRDay(d: Date): string {
  // "YYYY-MM-DD" en CR
  const y = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year:'numeric' }).format(d);
  const m = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, month:'2-digit' }).format(d);
  const dd = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, day:'2-digit' }).format(d);
  return `${y}-${m}-${dd}`;
}

export function slotCR(d: Date): 'AM'|'PM' {
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour:'2-digit', hour12:false }).format(d));
  return h < 12 ? 'AM' : 'PM';
}
