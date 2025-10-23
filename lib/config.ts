// lib/config.ts

// Fallback tolerante a tipo (no afecta runtime con Vite)
const ENV = (typeof import.meta !== 'undefined' && (import.meta as any)?.env) ? (import.meta as any).env : {};

// --- Event Configuration ---
export const ORG_UUID = ENV.VITE_ORG_UUID || 'b3b7c8f0-1e1a-4b0a-8b1a-0e1a4b0a8b1a';
export const EVENT_CODE = ENV.VITE_EVENT_CODE || 'CONAGUI2024';
export const EVENT_DATES = ENV.VITE_EVENT_DATES || '2024-08-27, 2024-08-28, 2024-08-29';

// --- Contact & Messaging ---
export const WHATSAPP = ENV.VITE_WHATSAPP || '+50688888888';
export const MESSENGER: 'builderbot' | 'wa' | 'none' = (ENV.VITE_MESSENGER as any) || 'wa';
export const MSG_AUTO = (ENV.VITE_MSG_AUTO || 'false') === 'true';


// --- API Keys & Integration ---
// For Gemini. The file lib/ai.ts expects this variable name.
export const VITE_API_KEY = ENV.VITE_GEMINI_API_KEY || '';
export const BUILDERBOT_API_KEY = ENV.VITE_BUILDERBOT_API_KEY || '';
export const BUILDERBOT_ID = ENV.VITE_BUILDERBOT_ID || '';

// --- Firebase Configuration ---
// This should be a JSON string in your .env file.
// Example: VITE_FIREBASE_CONFIG='{"apiKey": "...", "authDomain": "...", ...}'
export const FIREBASE_CONFIG = (() => {
    try {
        // Fallback to an empty string if env var is not set to avoid parsing 'undefined'
        return JSON.parse(ENV.VITE_FIREBASE_CONFIG || '{}');
    } catch (e) {
        console.error("Failed to parse VITE_FIREBASE_CONFIG. It must be a valid JSON string.", e);
        return {};
    }
})();


// --- TV Display Configuration ---
export const TV_PREFIX = ENV.VITE_TV_PREFIX || 'tv-assets-conagui2024';
export const TV_WELCOME_DURATION_MS = Number(ENV.VITE_TV_WELCOME_DURATION_MS || 12000);
export const TV_OVERLAY_THEME: 'glass' | 'gradient' = (ENV.VITE_TV_OVERLAY_THEME as any) || 'glass';
export const TV_SHOW_QUEUE_COUNT = (ENV.VITE_TV_SHOW_QUEUE_COUNT || 'true') === 'true';
export const TV_LOGO_URL = ENV.VITE_TV_LOGO_URL || '/logo-apt.svg';