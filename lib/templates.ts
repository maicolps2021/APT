


import type { Lead } from '../types';

/**
 * Generates a pre-filled WhatsApp message link or just the message text for a given lead.
 * @param lead The lead object containing contact details.
 * @param textOnly If true, returns only the message string.
 * @returns A string URL for a wa.me link or the message text.
 */
export const generateWhatsAppLink = (lead: Lead, textOnly = false): string => {
    const name = lead.name.split(' ')[0]; // Use first name for a personal touch
    const message = `¡Hola ${name}! Gracias por visitarnos en el stand de Arenal Private Tours by Small Groups. En breve te enviaremos la información de colaborador a tu correo. ¡Saludos!`;
    
    if (textOnly) {
        return message;
    }

    const encodedMessage = encodeURIComponent(message);
    const phone = (lead.whatsapp || '').replace(/\D/g, "");
    if (!phone) return '#';
    return `https://wa.me/${phone}?text=${encodedMessage}`;
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