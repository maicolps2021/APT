// services/messaging.ts
import { hasBuilderBot, sendBuilderBotMessage } from './builderbotService';
import { MESSENGER } from '../lib/config';
import { normalizePhoneCR } from '../lib/phone';

export type SendWhatsAppParams = {
  to: string;
  text: string;
  leadId?: string;
  templateId?: string;
};

export type Provider = 'builderbot' | 'wa' | 'none';

function normPhone(p?: string) {
  if (!p) return '';
  const norm = normalizePhoneCR(p);
  if (norm) {
    // wa.me and builderbot expect digits only, without the '+'
    return norm.e164.substring(1); 
  }
  // Fallback for non-CR numbers or other formats
  return p.replace(/[()\-\s]/g,'').trim();
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
    await sendBuilderBotMessage(phone, text);
    return 'sent';
  }
  if (provider === 'wa') {
    const url = `https://wa.me/${encodeURIComponent(phone)}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    return 'opened';
  }
  throw new Error('Messenger disabled');
}
