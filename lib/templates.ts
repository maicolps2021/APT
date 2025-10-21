
import type { Lead } from '../types';

/**
 * Generates a pre-filled WhatsApp message link for a given lead.
 * @param lead The lead object containing contact details.
 * @returns A string URL for a wa.me link.
 */
export const generateWhatsAppLink = (lead: Lead): string => {
    const name = lead.name.split(' ')[0]; // Use first name for a personal touch
    const message = encodeURIComponent(`¡Hola ${name}! Gracias por visitarnos en el stand de Arenal Conagui. En breve te enviaremos la información de colaborador a tu correo. ¡Saludos!`);
    const phone = (lead.whatsapp || '').replace(/\D/g, "");
    if (!phone) return '#';
    return `https://wa.me/${phone}?text=${message}`;
};

/**
 * Generates a pre-filled email (mailto) link for a given lead.
 * @param lead The lead object containing contact details.
 * @returns A string for a mailto: link.
 */
export const generateEmailLink = (lead: Lead): string => {
    if (!lead.email) return '#';
    const name = lead.name.split(' ')[0];
    const subject = encodeURIComponent(`Propuesta Colaborador Arenal Conagui para ${lead.company || lead.name}`);
    const body = encodeURIComponent(`Estimado/a ${name},

Un placer saludarte.

Adjunto a este correo encontrarás nuestras condiciones y tarifas para colaboradores. Estamos a tu disposición para cualquier consulta.

¡Gracias por tu interés en Arenal Conagui!

Saludos cordiales,
El equipo de Arenal Conagui
`);
    return `mailto:${lead.email}?subject=${subject}&body=${body}`;
};
