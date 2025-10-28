
import { doc, getDoc } from 'firebase/firestore';
import { db } from './supabaseClient';
import { ORG_UUID } from './config';
import type { Lead } from '../types';
import { normalizeCategory } from './categoryMap';


export type LeadCategory = 'guia'|'agencia'|'hotel'|'mayorista'|'transportista'|'otro';

export async function loadWATemplates(orgId: string): Promise<Record<string,string>> {
  const snap = await getDoc(doc(db, 'orgs', orgId, 'settings', 'whatsapp_templates'));
  const data = (snap.exists() ? snap.data() : {}) as Record<string, string>;
  return data;
}

export function pickTemplate(templates: Record<string,string>, category?: string): string {
  const normalizedKey = normalizeCategory(category);
  // Fallback chain: specific category -> touroperador -> guias -> empty
  return (templates[normalizedKey] || templates['touroperador'] || templates['guias'] || '').trim();
}

export function renderTemplate(tpl: string, vars: Record<string,string>) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_,k) => (vars[k] ?? ''));
}


export async function getResolvedWhatsAppText(lead: Lead): Promise<string> {
    const orgId = lead.org_id || ORG_UUID;
    if (!orgId) return '';
    
    const templates = await loadWATemplates(orgId);
    const category = lead.role;
    const tpl = pickTemplate(templates, category);
    
    const firstName = (lead.name || '').split(' ')[0] || 'there';
    
    // Fallback if no template is found or the found template is empty
    if (!tpl) {
        return `Hi ${firstName}, thanks for visiting our stand today! This is ${lead.company || 'our team'}. Let us know if you'd like a quick call or a tailored proposal.`;
    }
    
    return renderTemplate(tpl, { nombre: firstName });
}

/**
 * Renderiza una plantilla reemplazando placeholders {campo}
 * con valores tomados de `lead` y `settings`.
 * Si un campo no existe, deja {campo} tal cual (no rompe).
 */
export function renderTemplateFromSettings(opts: {
  template: string;
  lead: Record<string, any>;
  settings: Record<string, any>;
}) {
  const { template, lead = {}, settings = {} } = opts;

  const name: string = (lead.name || '').toString().trim();
  const firstName = name.split(' ')[0] || '';
  const cat = (lead.category || lead.role || '').toString();

  const base: Record<string, any> = {
    nombre: firstName || name,
    nombre_completo: name,
    empresa: lead.company || lead.organization || '',
    categoria: cat,
    role: lead.role || '',
    email: lead.email || '',
    telefono: lead.phone_e164 || lead.phone || lead.phone_raw || '',
    dia: lead.day || '',
    slot: lead.slot || '',
    evento: settings.event_code || '',
    org: settings.org_name || settings.organization || '',
  };

  // Mezcla para soportar placeholders personalizados definidos en Configuración
  const bag: Record<string, any> = { ...settings, ...lead, ...base };

  return template.replace(/\{([a-zA-Z0-9_\.]+)\}/g, (_, key) => {
    const v = bag[key];
    return (v === undefined || v === null) ? `{${key}}` : String(v);
  });
}

/**
 * Usa la MISMA plantilla de WhatsApp definida en Settings (por categoría).
 * Fallback a 'otro' y luego a un saludo genérico.
 */
export function renderWhatsTemplateForLead(opts: {
  settings: any;
  lead: any;
}) {
  const { settings = {}, lead = {} } = opts;
  const tpls: Record<string, string> = settings.whatsappTemplates || settings.templates || {};
  const catKey = String((lead.category || lead.role || 'otro')).toLowerCase();
  const tpl = tpls[catKey] || tpls['otro'] || 'Hola {nombre}. ¡Gracias por visitarnos!';
  return renderTemplateFromSettings({ template: tpl, lead, settings });
}