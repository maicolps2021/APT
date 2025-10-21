
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
  role?: 'Guia' | 'Agencia' | 'Hotel' | 'Mayorista' | 'Otro';
  channel?: string;
  whatsapp?: string;
  email?: string;
  interest?: 'Tour' | 'Traslado' | 'Ambos';
  next_step?: 'Reunion' | 'Llamada15' | 'Condiciones' | 'FamTrip';
  scoring?: 'A' | 'B' | 'C';
  owner?: string;
  meeting_at?: string;
  notes?: string;
  tags?: string[];
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
