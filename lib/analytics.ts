// lib/analytics.ts
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './supabaseClient';

const TZ = 'America/Costa_Rica';

function startEndOfCRDay(d: Date) {
  const y = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric' }).format(d);
  const m = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, month: '2-digit' }).format(d);
  const dd = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, day: '2-digit' }).format(d);
  // Using the explicit offset is the correct way to handle this without libraries
  const start = new Date(`${y}-${m}-${dd}T00:00:00-06:00`);
  const end = new Date(`${y}-${m}-${dd}T23:59:59.999-06:00`);
  return { start, end };
}

export type LeadsPerHourPoint = { hour: number; count: number };

export async function getLeadsPerHour(opts: {
  orgId: string; eventCode: string; date: Date;
}): Promise<LeadsPerHourPoint[]> {
  const { start, end } = startEndOfCRDay(opts.date);

  const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));

  const leadsRef = collection(db, 'leads');
  const q = query(
    leadsRef,
    where('org_id', '==', opts.orgId),
    where('event_code', '==', opts.eventCode),
    where('created_at', '>=', Timestamp.fromDate(start)),
    where('created_at', '<=', Timestamp.fromDate(end)),
    orderBy('created_at', 'asc')
  );

  const snap = await getDocs(q);
  snap.forEach(doc => {
    const data = doc.data();
    const createdAt = data?.created_at?.toDate();
    if (!createdAt) return;

    const hourStr = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ,
      hour: '2-digit',
      hour12: false,
    }).format(createdAt);
    
    // Intl can return '24' for midnight. We map it to hour 0.
    const h = Number(hourStr) % 24;

    if (h >= 0 && h <= 23) {
      buckets[h].count += 1;
    }
  });

  return buckets;
}
