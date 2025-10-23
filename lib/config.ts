// lib/config.ts

// Fallback tolerante para env
const ENV: Record<string, string | undefined> =
  (typeof import.meta !== 'undefined' && (import.meta as any)?.env)
    ? ((import.meta as any).env as Record<string, string | undefined>)
    : {};

function parseJsonSafe<T = any>(raw?: string): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
};

export function getFirebaseConfig(): FirebaseConfig {
  // 1) Intentar JSON completo
  const jsonCfg = parseJsonSafe<FirebaseConfig>(ENV.VITE_FIREBASE_CONFIG);
  const cfg: Partial<FirebaseConfig> = jsonCfg ? { ...jsonCfg } : {};

  // 2) Rellenar con variables individuales si faltan
  cfg.apiKey            = cfg.apiKey            || ENV.VITE_FIREBASE_API_KEY;
  cfg.authDomain        = cfg.authDomain        || ENV.VITE_FIREBASE_AUTH_DOMAIN;
  cfg.projectId         = cfg.projectId         || ENV.VITE_FIREBASE_PROJECT_ID;
  cfg.storageBucket     = cfg.storageBucket     || ENV.VITE_FIREBASE_STORAGE_BUCKET;
  cfg.messagingSenderId = cfg.messagingSenderId || ENV.VITE_FIREBASE_MESSAGING_SENDER_ID;
  cfg.appId             = cfg.appId             || ENV.VITE_FIREBASE_APP_ID;
  cfg.measurementId     = cfg.measurementId     || ENV.VITE_FIREBASE_MEASUREMENT_ID;

  // 3) Validación mínima
  const miss: string[] = [];
  (['apiKey','authDomain','projectId','storageBucket','messagingSenderId','appId'] as const).forEach(k => {
    // @ts-ignore
    if (!cfg[k] || String(cfg[k]).trim() === '') miss.push(k);
  });

  if (miss.length) {
    // No imprimas valores; solo claves faltantes
    throw new Error(
      `Firebase configuration is missing keys: ${miss.join(', ')}. ` +
      `Provide VITE_FIREBASE_CONFIG (JSON) o variables individuales VITE_FIREBASE_*`
    );
  }

  return cfg as FirebaseConfig;
}


// --- Event Configuration ---
export const ORG_UUID = ENV.VITE_ORG_UUID || 'b3b7c8f0-1e1a-4b0a-8b1a-0e1a4b0a8b1a';
export const EVENT_CODE = ENV.VITE_EVENT_CODE || 'CONAGUI2024';
export const EVENT_DATES = ENV.VITE_EVENT_DATES || '2024-08-27, 2024-08-28, 2024-08-29';

// --- Contact & Messaging ---
export const WHATSAPP = ENV.VITE_WHATSAPP || '+50688888888';
export const MESSENGER: 'builderbot' | 'wa' | 'none' = (ENV.VITE_MESSENGER as any) || 'wa';
export const MSG_AUTO = (ENV.VITE_MSG_AUTO || 'false') === 'true';


// --- API Keys & Integration ---

// Acepta múltiples alias: preferimos VITE_API_KEY (Cloudflare), luego VITE_GEMINI_API_KEY, luego GEMINI_API_KEY
export const GEMINI_API_KEY: string =
  ENV.VITE_API_KEY ||
  ENV.VITE_GEMINI_API_KEY ||
  ENV.GEMINI_API_KEY ||
  '';

// Modelo de IA a utilizar, con un fallback seguro.
export const GEMINI_MODEL_ID: string = ENV.VITE_GEMINI_MODEL_ID || 'gemini-1.5-flash';

export const BUILDERBOT_API_KEY = ENV.VITE_BUILDERBOT_API_KEY || '';
export const BUILDERBOT_ID = ENV.VITE_BUILDERBOT_ID || '';

// --- TV Display Configuration ---
export const TV_PREFIX = ENV.VITE_TV_PREFIX || 'tv-assets-conagui2024';
export const TV_WELCOME_DURATION_MS = Number(ENV.VITE_TV_WELCOME_DURATION_MS || 12000);
export const TV_OVERLAY_THEME: 'glass' | 'gradient' = (ENV.VITE_TV_OVERLAY_THEME as any) || 'glass';
export const TV_SHOW_QUEUE_COUNT = (ENV.VITE_TV_SHOW_QUEUE_COUNT || 'true') === 'true';
export const TV_LOGO_URL = ENV.VITE_TV_LOGO_URL || '/logo-apt.svg';
export const TV_RAFFLE_DURATION_MS = Number(ENV.VITE_TV_RAFFLE_DURATION_MS || 15000);
export const TV_RAFFLE_THEME: 'celebration' | 'glass' = (ENV.VITE_TV_RAFFLE_THEME as 'celebration' | 'glass') || 'celebration';