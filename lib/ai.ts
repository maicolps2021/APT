import { GoogleGenAI } from "@google/genai";

export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

let ai: GoogleGenAI | null = null;

export function hasGemini() {
  if (!GEMINI_API_KEY) {
    // This warning is helpful for developers but won't break the app.
    console.warn("[AI] Gemini API key not configured. AI features disabled.");
    return false;
  }
  return true;
}

export function getGeminiClient() {
  if (!hasGemini()) {
    return null;
  }
  // Initialize the client only once (singleton pattern)
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return ai;
}
