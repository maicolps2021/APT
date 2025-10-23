// FIX: Removed reference to "vite/client" which was causing a type definition error.
// Using a type assertion on import.meta.env to bypass the missing types, which should be
// configured in tsconfig.json.
const env = (import.meta as any).env;

// Firebase Environment Variables
export const FIREBASE_CONFIG = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

// App-specific Environment Variables
export const ORG_UUID = env.VITE_ORG_UUID;
export const EVENT_CODE = env.VITE_EVENT_CODE;
export const EVENT_DATES = env.VITE_EVENT_DATES ?? '2025-10-27,2025-10-28,2025-10-29';
export const TV_BUCKET = env.VITE_TV_BUCKET ?? 'tv'; // This now refers to the root folder in Firebase Storage
export const TV_PREFIX = env.VITE_TV_PREFIX ?? 'conagui2025';
export const BUILDERBOT_API_KEY = env.VITE_BUILDERBOT_API_KEY;
export const BUILDERBOT_ID = env.VITE_BUILDERBOT_ID;
export const VITE_API_KEY = env.VITE_API_KEY;

// Messaging Configuration
// Preferred messenger: 'builderbot' | 'wa' | 'none'
export const MESSENGER = (env.VITE_MESSENGER || 'wa') as 'builderbot'|'wa'|'none';

// Auto-send messages (for future use)
export const MSG_AUTO = (env.VITE_MSG_AUTO || 'false') === 'true';

// Fallback WhatsApp number
export const WHATSAPP = env.VITE_WHATSAPP || '';

// TV overlay settings
export const TV_WELCOME_DURATION_MS = Number(env.VITE_TV_WELCOME_DURATION_MS || 12000);
// 'glass' | 'gradient'
export const TV_OVERLAY_THEME = (env.VITE_TV_OVERLAY_THEME || 'glass') as 'glass'|'gradient';
// Mostrar contador de cola "Up next: N"
export const TV_SHOW_QUEUE_COUNT = (env.VITE_TV_SHOW_QUEUE_COUNT || 'true') === 'true';
// Logo (opcional): URL pública o ruta local
export const TV_LOGO_URL = env.VITE_TV_LOGO_URL || '';