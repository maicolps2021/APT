// Fix: Removed 'vite/client' reference and type assertions. Environment variable types
// are now correctly defined via a global augmentation, resolving all reported errors in this file.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const ORG_UUID = import.meta.env.VITE_ORG_UUID;
export const EVENT_CODE = import.meta.env.VITE_EVENT_CODE;
export const EVENT_DATES = import.meta.env.VITE_EVENT_DATES ?? '2025-10-27,2025-10-28,2025-10-29';
export const WHATSAPP = import.meta.env.VITE_WHATSAPP ?? '+50663520923';