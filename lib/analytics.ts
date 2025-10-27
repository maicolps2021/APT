// lib/analytics.ts
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './supabaseClient';

const TZ = 'America/Costa_Rica';

// This helper function formats a date into a "YYYY-MM-DD" string based on the Costa Rica timezone.
// It's crucial for querying the `day` field which should be stored in the same format.
function formatCRDay(d: Date): string {
  const y = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric' }).format(d);
  const m = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, month: '2-digit' }).format(d);
  const dd = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, day: '2-digit' }).format(d);
  return `${y}-${m}-${dd}`;
}

export type LeadsPerHourPoint = { hour: number; count: number };

export async function getLeadsPerHour(opts: {
  orgId: string;
  eventCode: string;
  date: Date;
}): Promise<LeadsPerHourPoint[]> {
  const day = formatCRDay(opts.date);

  // Initialize 24 buckets, one for each hour, to ensure the chart always has 24 bars.
  const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));

  const leadsRef = collection(db, 'leads');
  const q = query(
    leadsRef,
    where('org_id', '==', opts.orgId),
    where('event_code', '==', opts.eventCode),
    where('day', '==', day) // Query by the pre-calculated 'day' field for simplicity and timezone consistency.
  );

  const snap = await getDocs(q);
  snap.forEach(doc => {
    const data = doc.data();
    // Use created_at for bucketing. Fallback to updated_at if necessary, or parse from string.
    const createdAt = data?.created_at?.toDate?.() ?? 
                      data?.updated_at?.toDate?.() ??
                      (typeof data?.created_at === 'string' ? new Date(data.created_at) : null);

    if (!createdAt || isNaN(createdAt.getTime())) return;

    const hourStr = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ,
      hour: '2-digit',
      hour12: false,
    }).format(createdAt);
    
    // `Intl.DateTimeFormat` can return '24' for midnight, which should be mapped to hour 0.
    let h = Number(hourStr);
    if (h === 24) {
        h = 0;
    }
    
    // Ensure the hour is within the valid range [0, 23] and increment the corresponding bucket.
    if (h >= 0 && h <= 23 && !Number.isNaN(h)) {
      buckets[h].count += 1;
    }
  });

  return buckets;
}
