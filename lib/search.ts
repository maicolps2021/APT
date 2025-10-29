// lib/search.ts

/**
 * Converts a value to a normalized string for searching:
 * lowercase, trimmed, and without diacritical marks.
 * @param s The input value of any type.
 * @returns A normalized string.
 */
export function normalizeStr(s: any): string {
  if (s === null || s === undefined) {
    return '';
  }
  return String(s)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/**
 * Checks if a haystack string includes a needle string,
 * performing a normalized, accent-insensitive comparison.
 * @param haystack The string to search within.
 * @param needle The string to search for.
 * @returns True if the needle is found, false otherwise.
 */
export function includesNorm(haystack: string, needle: string): boolean {
  return normalizeStr(haystack).includes(normalizeStr(needle));
}
