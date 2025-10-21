// Fix for "Property 'env' does not exist on type 'ImportMeta'"
// In a typical Vite project, this would be handled by a d.ts file (e.g., vite-env.d.ts).
// Since we cannot add files, we augment the ImportMeta type directly in this module.
// Fix: Expanded the env interface to include all VITE environment variables used in the project. This resolves type errors in other files like lib/config.ts.
declare global {
  interface ImportMeta {
    readonly env: {
      readonly VITE_SUPABASE_URL: string;
      readonly VITE_SUPABASE_ANON_KEY: string;
      readonly VITE_ORG_UUID: string;
      readonly VITE_EVENT_CODE: string;
      readonly VITE_EVENT_DATES?: string;
      readonly VITE_WHATSAPP?: string;
      readonly VITE_TV_BUCKET?: string;
      readonly VITE_TV_PREFIX?: string;
    };
  }
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL (VITE_SUPABASE_URL) and Anon Key (VITE_SUPABASE_ANON_KEY) must be provided in environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);