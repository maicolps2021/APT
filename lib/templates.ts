import { doc, getDoc } from 'firebase/firestore';
import { db } from './supabaseClient';
import { ORG_UUID } from './config';
import type { Lead } from '../types';


export type LeadCategory = 'guia'|'agencia'|'hotel'|'mayorista'|'transportista'|'otro';

export async function loadWATemplates(orgId: string): Promise<Record<string,string>> {
  const snap = await getDoc(doc(db, 'orgs', orgId, 'settings', 'whatsapp_templates'));
  const data = (snap.exists() ? snap.data() : {}) as Record<string, string>;
  return data;
}

export function pickTemplate(templates: Record<string,string>, category?: string): string {
  const key = (category || '').toLowerCase();
  return (templates[key] || templates['otro'] || '').trim();
}

export function renderTemplate(tpl: string, vars: Record<string,string>) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_,k) => (vars[k] ?? ''));
}


export async function getResolvedWhatsAppText(lead: Lead): Promise<string> {
    const orgId = lead.org_id || ORG_UUID;
    if (!orgId) return '';
    
    const templates = await loadWATemplates(orgId);
    const category = lead.role?.toLowerCase();
    const tpl = pickTemplate(templates, category);
    
    const firstName = (lead.name || '').split(' ')[0] || 'there';
    
    // Fallback if no template is found or the found template is empty
    if (!tpl) {
        return `Hi ${firstName}, thanks for visiting our stand today! This is ${lead.company || 'our team'}. Let us know if you'd like a quick call or a tailored proposal.`;
    }
    
    return renderTemplate(tpl, { nombre: firstName });
}