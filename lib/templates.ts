import type { Lead } from '../types';
import { db } from './supabaseClient'; // Path kept for simplicity, points to Firebase now
import { collection, getDocs, query, where } from 'firebase/firestore';
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
        const templatesRef = collection(db, 'message_templates');
        const q = query(templatesRef,
            where('org_id', '==', ORG_UUID),
            where('event_code', '==', EVENT_CODE),
            where('channel', '==', lead.role)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.warn(`No template found for role: ${lead.role}. Using fallback.`);
            return fallbackMessage;
        }
        
        const templateDoc = querySnapshot.docs[0].data();

        if (!templateDoc || !templateDoc.template) {
            return fallbackMessage;
        }

        return templateDoc.template.replace(/\{nombre\}/g, name);

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
