// lib/phone.ts

export type PhoneNormalized = {
  e164: string;        // "+14155550123" | "+50688888888"
  countryGuess?: string;
  local?: string;      // si default CR, la parte local de 8 dígitos
};

/**
 * Normaliza teléfonos internacionales sin dependencias:
 * - Si empieza con "+": acepta de 7 a 15 dígitos tras el "+"
 * - Si NO empieza con "+": aplica default "CR":
 *     - 8 dígitos => "+506" + local
 *     - 11 dígitos empezando por 506 => "+506" + últimos 8
 *     - 12 dígitos empezando por 0506 => "+506" + últimos 8
 * - Cualquier otro caso: null (inválido)
 *
 * NOTA: Esto no valida patrones nacionales avanzados; es un saneador simple.
 */
export function normalizePhone(raw: string | undefined | null, opts?: { defaultCountry?: 'CR' }) : PhoneNormalized | null {
  if (!raw) return null;
  const s = String(raw).trim();
  const digits = s.replace(/\D+/g, '');

  // Caso internacional explícito: "+<7-15 dígitos>"
  if (s.startsWith('+')) {
    const d = s.slice(1).replace(/\D+/g, '');
    if (d.length >= 7 && d.length <= 15) {
      return { e164: `+${d}` };
    }
    return null;
  }

  // Sin "+" => asumimos Costa Rica como default
  const def = (opts?.defaultCountry ?? 'CR');
  if (def === 'CR') {
    // 8 dígitos locales
    if (/^\d{8}$/.test(digits)) {
      return { e164: `+506${digits}`, countryGuess: 'CR', local: digits };
    }
    // 506 + 8 dígitos
    if (/^506\d{8}$/.test(digits)) {
      const local = digits.slice(-8);
      return { e164: `+506${local}`, countryGuess: 'CR', local };
    }
    // 0506 + 8 dígitos (algunos escriben 0 prefijo)
    if (/^0506\d{8}$/.test(digits)) {
      const local = digits.slice(-8);
      return { e164: `+506${local}`, countryGuess: 'CR', local };
    }
  }

  // No reconocible
  return null;
}

/** Solo embellece local CR en UI (no afecta E.164) */
export function prettifyLocalCR(local: string): string {
  if (!/^\d{8}$/.test(local)) return local;
  return `${local.slice(0,4)} ${local.slice(4)}`;
}