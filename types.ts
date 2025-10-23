

export interface Lead {
  id: string;
  created_at: string;
  org_id: string;
  event_code: string;
  source: 'QR' | 'MANUAL';
  day: number;
  slot: 'AM' | 'PM';
  name: string;
  company?: string;
  role?: 'Guia' | 'Agencia' | 'Hotel' | 'Mayorista' | 'Transportista' | 'Otro';
  channel?: string;
  whatsapp?: string;
  email?: string;
  interest?: 'Tour' | 'Traslado' | 'Ambos';
  // FIX: Added 'WhatsApp' to the next_step union type to match its usage across the application.
  next_step?: 'Reunion' | 'Llamada15' | 'Condiciones' | 'FamTrip' | 'WhatsApp';
  scoring?: 'A' | 'B' | 'C';
  owner?: string;
  meeting_at?: string;
  notes?: string;
  tags?: string[];
  // FIX: Added the 'status' property to the Lead interface to resolve a TypeScript error in LeadList.tsx, where it was being used to update a lead's state.
  status?: 'NEW' | 'CONTACTED' | 'PROPOSED' | 'WON' | 'LOST';
}

export interface Raffle {
  id: string;
  org_id: string;
  event_code: string;
  day: number;
  prize: string;
  winner_lead_id: string;
  drawn_at: string;
  status: 'Planned' | 'Drawn' | 'Delivered';
}

export interface MentionLog {
  id?: string;
  created_at?: string;
  org_id: string;
  event_code: string;
  day: number;
  slot: 'AM' | 'PM';
  mention_id: string; // The unique ID from content.ts
  type: 'mention' | 'micro';
}

export interface ChannelDistribution {
  [key: string]: number;
}

export interface DailyLeads {
  day: number;
  count: number;
}

export interface KPIsData {
  total_leads: number;
  leads_by_channel: ChannelDistribution;
  leads_by_day: DailyLeads[];
}
