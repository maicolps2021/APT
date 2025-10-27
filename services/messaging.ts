// services/messaging.ts
import { hasBuilderBot, sendBuilderBotMessage } from './builderbotService';
import { MESSENGER, WHATSAPP } from '../lib/config';
import { normalizePhone } from '../lib/phone';

export type SendWhatsAppParams = {
  to: string;
  text: string;
  leadId?: string;
  templateId?: string;
};

export type Provider = 'builderbot' | 'wa' | 'none';

function normPhone(p?: string) {
  if (!p) return '';
  const norm = normalizePhone(p, { defaultCountry: 'CR' });
  if (norm) {
    // wa.me and builderbot expect digits only, without the '+'
    return norm.e164.substring(1); 
  }
  // Fallback for non-CR numbers or other formats
  return p.replace(/\D/g,'').trim();
}

export function isReady(): boolean {
  if (MESSENGER === 'builderbot') return hasBuilderBot();
  if (MESSENGER === 'wa') return true;
  return false;
}

export function providerName(): Provider {
  if (MESSENGER === 'builderbot') return hasBuilderBot() ? 'builderbot' : 'wa';
  return MESSENGER;
}

/** Comportamiento por configuración (retrocompatible) */
export async function sendWhatsApp({ to, text }: SendWhatsAppParams): Promise<'sent'|'opened'> {
  return sendWhatsAppVia(providerName(), { to, text });
}

/** NUEVO: forzar proveedor explícito por acción */
export async function sendWhatsAppVia(provider: Provider, { to, text }: SendWhatsAppParams): Promise<'sent'|'opened'> {
  const phone = normPhone(to);
  if (!phone) throw new Error('Invalid phone');

  if (provider === 'builderbot') {
    if (!hasBuilderBot()) throw new Error('BuilderBot not available');
    // The builderbot service now expects a lead object. This function is now legacy.
    // We pass a mock lead object for compatibility.
    await sendBuilderBotMessage({ phone_raw: to }, text);
    return 'sent';
  }
  if (provider === 'wa') {
    const url = `https://wa.me/${encodeURIComponent(phone)}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    return 'opened';
  }
  throw new Error('Messenger disabled');
}

export function resolvePhoneE164Strict(lead: any): string {
  // 1) Si ya trae E.164 válido
  const e = String(lead?.phone_e164 || '').trim();
  if (/^\+\d{7,15}$/.test(e)) return e;

  // 2) Intentar normalizar cualquiera de los campos crudos del LEAD
  const candidates = [
    lead?.phone, lead?.phone_number, lead?.telefono, lead?.whatsapp, lead?.phone_raw
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    const n = normalizePhone(c, { defaultCountry: 'CR' });
    if (n) return n.e164;
  }

  // 3) Nada más. NO usar env fallback aquí.
  return '';
}

/** Úsalo solo cuando explícitamente se quiera testear */
export function resolveTestRecipientFromEnv(): string {
  const test = (import.meta as any)?.env?.VITE_TEST_RECIPIENT || '';
  return /^\+\d{7,15}$/.test(test) ? test : '';
}