// FIX: Add type definitions for import.meta.env to resolve TypeScript errors
// when Vite's client types are not automatically available.
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_ORG_UUID?: string;
  readonly VITE_EVENT_CODE?: string;
  readonly VITE_EVENT_DATES?: string;
  readonly VITE_WHATSAPP?: string;
  readonly VITE_TV_BUCKET?: string;
  readonly VITE_TV_PREFIX?: string;
  readonly VITE_BUILDERBOT_API_KEY?: string;
  readonly VITE_BUILDERBOT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}


// Firebase Environment Variables
export const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// App-specific Environment Variables
export const ORG_UUID = import.meta.env.VITE_ORG_UUID;
export const EVENT_CODE = import.meta.env.VITE_EVENT_CODE;
export const EVENT_DATES = import.meta.env.VITE_EVENT_DATES ?? '2025-10-27,2025-10-28,2025-10-29';
export const WHATSAPP = import.meta.env.VITE_WHATSAPP ?? '+50663520923';
export const TV_BUCKET = import.meta.env.VITE_TV_BUCKET ?? 'tv'; // This now refers to the root folder in Firebase Storage
export const TV_PREFIX = import.meta.env.VITE_TV_PREFIX ?? 'conagui2025';
export const BUILDERBOT_API_KEY = import.meta.env.VITE_BUILDERBOT_API_KEY;
export const BUILDERBOT_ID = import.meta.env.VITE_BUILDERBOT_ID;
