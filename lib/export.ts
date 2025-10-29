import type { Lead } from '../types';

export type FirestoreTimestamp = { toDate?: () => Date } | any;

function toISO(v: any): string {
  if (!v) return '';
  // Firestore Timestamps are often represented as strings in JSON contexts or after certain transformations.
  // We prioritize the toDate method if it exists, which is the most reliable way.
  if (v && typeof v.toDate === 'function') {
    try {
      return v.toDate().toISOString();
    } catch {
      // Fallback if toDate fails
    }
  }
  // Handle if it's already an ISO string
  if (typeof v === 'string') {
    // Basic check to see if it resembles an ISO string
    if (!isNaN(Date.parse(v))) {
        return new Date(v).toISOString();
    }
    return v;
  }
  // Handle if it's a Date object
  if (v instanceof Date) {
      return v.toISOString();
  }
  // Handle numeric timestamps (milliseconds)
  if (typeof v === 'number') {
      return new Date(v).toISOString();
  }
  return '';
}


export interface LeadCsvRow {
  name?: string;
  company?: string;
  email?: string;
  phone_e164?: string;
  phone_local?: string;
  role?: string;
  status?: string;
  next_step?: string;
  day?: string | number;
  slot?: string;
  created_at?: string;
}

export function exportLeadsCsv(leads: Lead[]) {
  // Map full Lead objects to flat CSV rows
  const rows: LeadCsvRow[] = (leads || []).map((l) => ({
    name: l?.name ?? '',
    company: l?.company ?? '',
    email: l?.email ?? '',
    phone_e164: l?.phone_e164 ?? '',
    phone_local: l?.phone_local ?? '',
    role: l?.role ?? '',
    status: l?.status ?? '',
    next_step: l?.next_step ?? '',
    day: l?.day ?? '',
    slot: l?.slot ?? '',
    created_at: toISO(l?.created_at),
  }));

  // Build a simple CSV
  const headers = [
    'name', 'company', 'email', 'phone_e164', 'phone_local',
    'role', 'status', 'next_step', 'day', 'slot', 'created_at'
  ];
  
  const escape = (s: any) => {
    const str = (s ?? '').toString();
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };
  
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape((r as any)[h])).join(',')),
  ];
  
  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  // Download without extra dependencies
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads_export_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
