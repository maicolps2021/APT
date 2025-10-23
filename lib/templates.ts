
import type { Lead } from '../types';
import { supabase } from './supabaseClient';
import { ORG_UUID, EVENT_CODE } from './config';

/**
 * Fetches the personalized WhatsApp message template from the database based on the lead's role.
 * Falls back to a generic message if no template is found.
 * @param lead The lead object.
 * @returns A promise that resolves to the personalized message string.
 */
export const getPersonalizedWhatsAppMessage = async (lead: Lead): Promise<string> => {
    const name = lead.name.split(' ')[0]; // Use first name
    const fallbackMessage = `¡Hola ${name}! Gracias por visitarnos en el stand de Arenal Private Tours by Small Groups. En breve te enviaremos la información de colaborador a tu correo. ¡Saludos!`;

    if (!lead.role) {
        return fallbackMessage;
    }

    try {
        const { data, error } = await supabase
            .from('message_templates')
            .select('template')
            .eq('org_id', ORG_UUID)
            .eq('event_code', EVENT_CODE)
            .eq('channel', lead.role)
            .single();
        
        if (error || !data || !data.template) {
            console.warn(`No template found for role: ${lead.role}. Using fallback.`);
            return fallbackMessage;
        }

        return data.template.replace(/\{nombre\}/g, name);

    } catch (err) {
        console.error("Error fetching message template:", err);
        return fallbackMessage;
    }
};


/**
 * Generates a pre-filled email (mailto) link for a given lead.
 * @param lead The lead object containing contact details.
 * @returns A string for a mailto: link.
 */
export const generateEmailLink = (lead: Lead): string => {
    if (!lead.email) return '#';
    const name = lead.name.split(' ')[0];
    const subject = encodeURIComponent(`Propuesta Colaborador Arenal Private Tours by Small Groups para ${lead.company || lead.name}`);
    const body = encodeURIComponent(`Estimado/a ${name},

Un placer saludarte.

Adjunto a este correo encontrarás nuestras condiciones y tarifas para colaboradores. Estamos a tu disposición para cualquier consulta.

¡Gracias por tu interés en Arenal Private Tours by Small Groups!

Saludos cordiales,
El equipo de Arenal Private Tours by Small Groups
`);
    return `mailto:${lead.email}?subject=${subject}&body=${body}`;
};
