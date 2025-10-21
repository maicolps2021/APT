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
}
