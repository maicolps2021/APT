// This file now only handles the global type augmentation for Vite environment variables.
// The client initialization has been moved and repurposed for Firebase in `lib/supabaseClient.ts`.

declare global {
  interface ImportMeta {
    readonly env: {
      // Firebase Config
      readonly VITE_FIREBASE_API_KEY: string;
      readonly VITE_FIREBASE_AUTH_DOMAIN: string;
      readonly VITE_FIREBASE_PROJECT_ID: string;
      readonly VITE_FIREBASE_STORAGE_BUCKET: string;
      readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
      readonly VITE_FIREBASE_APP_ID: string;
      
      // App Config
      readonly VITE_ORG_UUID: string;
      readonly VITE_EVENT_CODE: string;
      readonly VITE_EVENT_DATES?: string;
      readonly VITE_WHATSAPP?: string;
      readonly VITE_TV_BUCKET?: string;
      readonly VITE_TV_PREFIX?: string;
      readonly VITE_BUILDERBOT_API_KEY?: string;
      readonly VITE_BUILDERBOT_ID?: string;
    };
  }
}

// Supabase client has been removed.
// FIX: Add export {} to make this file a module and allow global augmentation.
export {};
