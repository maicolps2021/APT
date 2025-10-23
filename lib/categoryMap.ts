
import { LeadCategory, LEAD_CATEGORY_LABELS } from '../types';

// The canonical order for display in UI elements like dropdowns
export const LEAD_CATEGORY_ORDER: LeadCategory[] = [
  'touroperador',
  'hoteles',
  'transportistas',
  'parques',
  'guias',
  'souvenirs_restaurantes',
];

// Maps old, deprecated values to the new canonical slugs
const LEGACY_CATEGORY_MAP: Record<string, LeadCategory> = {
  'agencia': 'touroperador',
  'mayorista': 'touroperador',
  'hotel': 'hoteles',
  'transportista': 'transportistas',
  'guia': 'guias',
  'otro': 'souvenirs_restaurantes',
  // handle potential typos or variations
  'guías': 'guias',
  'souvenirs y restaurantes': 'souvenirs_restaurantes',
};

/**
 * Converts a legacy category value to its new canonical slug.
 * If the value is already a valid new slug, it returns it as is.
 * @param value The category string to normalize.
 * @returns A canonical LeadCategory slug or the original value if no mapping is found.
 */
export function normalizeCategory(value?: string): string {
  const key = (value || '').toLowerCase().trim();
  if (!key) return 'touroperador'; // Default fallback

  // Check if it's a legacy value
  if (LEGACY_CATEGORY_MAP[key]) {
    return LEGACY_CATEGORY_MAP[key];
  }
  
  // Check if it's already a new, valid slug
  if (LEAD_CATEGORY_ORDER.includes(key as LeadCategory)) {
    return key;
  }

  // Fallback for unknown values, map to a sensible default
  return 'touroperador';
}

/**
 * Gets the user-friendly label for any category value (legacy or new).
 * @param value The category string (e.g., 'guia', 'hoteles').
 * @returns The display label (e.g., 'Guías', 'Hoteles').
 */
export function getCategoryLabel(value?: string): string {
  const normalized = normalizeCategory(value) as LeadCategory;
  return LEAD_CATEGORY_LABELS[normalized] || 'Desconocido';
}
