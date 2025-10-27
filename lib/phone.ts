// lib/phone.ts

export type PhoneNormalized = {
  e164: string;       // p.ej. "+50688888888"
  local: string;      // p.ej. "88888888"
  country: 'CR';
};

/**
 * Normaliza números de Costa Rica aceptando:
 *  - "8888-8888"
 *  - "506 8888 8888"
 *  - "+50688888888"
 *  - "88888888"
 * Devuelve null si no se puede normalizar a 8 dígitos locales.
 */
export function normalizePhoneCR(raw: string | undefined | null): PhoneNormalized | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D+/g, ''); // solo dígitos

  // Casos:
  // - 8 dígitos: asumir CR local
  if (digits.length === 8) {
    return { e164: `+506${digits}`, local: digits, country: 'CR' };
  }

  // - 11 dígitos empezando con 506 -> CR con CC explícito
  if (digits.length === 11 && digits.startsWith('506')) {
    const local = digits.slice(-8);
    return { e164: `+506${local}`, local, country: 'CR' };
  }

  // - 12 dígitos empezando con 0506 (algunos usuarios escriben 0 prefijo)
  if (digits.length === 12 && digits.startsWith('0506')) {
    const local = digits.slice(-8);
    return { e164: `+506${local}`, local, country: 'CR' };
  }

  // - Si trae "+506" con símbolos, el bloque anterior ya lo captura por dígitos.
  // Cualquier otro formato no CR -> no lo normalizamos aquí
  return null;
}

/** Sanea visualmente para entrada UI (quita separadores obvios) */
export function prettifyLocalCR(local: string): string {
  // "88888888" -> "8888 8888"
  if (!/^\d{8}$/.test(local)) return local;
  return `${local.slice(0,4)} ${local.slice(4)}`;
}
