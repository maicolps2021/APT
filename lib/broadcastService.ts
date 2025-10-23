import type { Lead } from '../types';

/**
 * Defines the structure of the message sent to the TV display.
 */
export interface TVWelcomeMessage {
  lead: Lead;
  welcomeMessage: string;
}

/**
 * A dedicated BroadcastChannel for sending real-time welcome messages
 * from the lead capture form to the TV display page.
 */
export const tvChannel = new BroadcastChannel('tv-welcome-messages');
