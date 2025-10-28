// lib/status.ts

export type LeadStatus = 'NEW' | 'CONTACTED' | 'PROPOSED' | 'WON' | 'LOST';

const NEXT_STEP_TO_STATUS: Record<string, LeadStatus> = {
  'condiciones': 'PROPOSED',
  'reunion': 'CONTACTED',
  'llamada15': 'CONTACTED',
  'famtrip': 'CONTACTED',
  'whatsapp': 'CONTACTED',
};

export function inferStatusFromLead(lead: any): LeadStatus {
  const raw = (lead?.status || '').toString().trim().toUpperCase();
  if (['NEW', 'CONTACTED', 'PROPOSED', 'WON', 'LOST'].includes(raw)) {
    return raw as LeadStatus;
  }
  
  const ns = (lead?.next_step || '').toString().trim().toLowerCase();
  if (ns && NEXT_STEP_TO_STATUS[ns]) {
    return NEXT_STEP_TO_STATUS[ns];
  }

  return 'NEW';
}
