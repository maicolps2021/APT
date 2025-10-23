// FIX: Removed the reference to "vite/client" to resolve the "Cannot find type definition file" error.
// The necessary `ImportMeta` and `ImportMetaEnv` interfaces are defined below,
// which is sufficient for this project's usage.

interface ImportMetaEnv {
  // Event
  readonly VITE_ORG_UUID?: string;
  readonly VITE_EVENT_CODE?: string;
  readonly VITE_EVENT_DATES?: string;

  // Contact & Messaging
  readonly VITE_MESSENGER?: 'builderbot' | 'wa' | 'none';
  readonly VITE_MSG_AUTO?: 'true' | 'false';
  readonly VITE_WHATSAPP?: string;

  // API Keys
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_BUILDERBOT_API_KEY?: string;
  readonly VITE_BUILDERBOT_ID?: string;

  // Firebase
  readonly VITE_FIREBASE_CONFIG?: string;

  // TV Display
  readonly VITE_TV_PREFIX?: string;
  readonly VITE_TV_WELCOME_DURATION_MS?: string;
  readonly VITE_TV_OVERLAY_THEME?: 'glass' | 'gradient';
  readonly VITE_TV_SHOW_QUEUE_COUNT?: 'true' | 'false';
  readonly VITE_TV_LOGO_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
