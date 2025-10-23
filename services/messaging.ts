// services/messaging.ts
import { hasBuilderBot, sendBuilderBotMessage } from './builderbotService';
import { MESSENGER } from '../lib/config';

export type SendWhatsAppParams = {
  to: string;
  text: string;
  leadId?: string;
  templateId?: string;
};

function normPhone(p?: string) {
  if (!p) return '';
  return p.replace(/[()\-\s]/g,'').trim();
}

export function isReady(): boolean {
  if (MESSENGER === 'builderbot') return hasBuilderBot();
  if (MESSENGER === 'wa') return true;
  return false;
}

export function providerName(): 'builderbot'|'wa'|'none' {
  if (MESSENGER === 'builderbot') return hasBuilderBot() ? 'builderbot' : 'wa';
  return MESSENGER;
}

export async function sendWhatsApp({ to, text }: SendWhatsAppParams): Promise<'sent'|'opened'> {
  const phone = normPhone(to);
  const provider = providerName();

  if (provider === 'builderbot') {
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
