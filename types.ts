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
