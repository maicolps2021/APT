import type { Lead } from '../types';

/**
 * Defines the structure of the message sent to the TV display.
 */
export interface TVWelcomeMessage {
  lead: Lead;
  welcomeMessage: string;
}

export const CHANNEL_NAME = 'tv-welcome-messages';

let _ch: BroadcastChannel | null = null;

/**
 * Safely gets a singleton instance of the BroadcastChannel.
 * Returns null if the API is not supported by the browser.
 * @returns {BroadcastChannel | null}
 */
export function getTvChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  
  // Check for BroadcastChannel constructor
  const BC: any = (window as any).BroadcastChannel;
  if (!BC) return null;

  // Create singleton instance if it doesn't exist
  if (!_ch) {
    try {
      _ch = new BC(CHANNEL_NAME);
    } catch (e) {
      console.error("Failed to create BroadcastChannel:", e);
      return null;
    }
  }
  
  return _ch;
}
