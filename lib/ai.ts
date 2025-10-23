import { GoogleGenAI } from "@google/genai";
import { VITE_API_KEY } from './config';

let ai: GoogleGenAI | null = null;

if (VITE_API_KEY) {
  try {
    ai = new GoogleGenAI({ apiKey: VITE_API_KEY });
  } catch (e) {
    console.error("Failed to initialize GoogleGenAI client:", e);
    ai = null;
  }
} else {
  console.warn(
    "Gemini API key (VITE_API_KEY) not found in environment variables. AI-powered features will be disabled."
  );
}

/**
 * Returns the initialized GoogleGenAI client instance if available.
 * This function provides a single point of access to the client.
 * @returns {GoogleGenAI | null} The client instance or null if the API key is not configured.
 */
export function getGeminiClient(): GoogleGenAI | null {
  return ai;
}

/**
 * Checks if the Gemini client has been initialized successfully.
 * This is useful for conditionally rendering UI components that rely on AI.
 * @returns {boolean} True if the client is available, false otherwise.
 */
export function hasGemini(): boolean {
  return ai !== null;
}
