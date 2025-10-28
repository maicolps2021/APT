// services/email.ts
import { renderWhatsTemplateForLead } from '../lib/templates';
import type { Lead } from '../types';

function makeSubject(lead: Partial<Lead>, settings: any) {
  const org = settings?.org_name || 'Arenal Private Tours';
  const name = (lead?.name || '').toString().trim();
  const firstName = name.split(' ')[0];
  return firstName ? `${org} — Hola ${firstName}` : `${org} — Hola`;
}

/** Construye un mailto: usando la MISMA plantilla de WhatsApp (Settings + placeholders) */
export function buildMailtoUsingSettings(lead: Partial<Lead>, settings: any): string {
  const to = (lead?.email || '').toString().trim();
  if (!to) return '';

  const bodyText = renderWhatsTemplateForLead({ settings, lead });
  const subject = encodeURIComponent(makeSubject(lead, settings));
  const body = encodeURIComponent(bodyText);

  return `mailto:${to}?subject=${subject}&body=${body}`;
}
