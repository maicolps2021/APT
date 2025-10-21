import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

export function hasGemini() {
  // Fix: Use process.env.API_KEY as per coding guidelines.
  if (!process.env.API_KEY) {
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
    // Fix: Use process.env.API_KEY as per coding guidelines.
    // The key's existence is checked in hasGemini, so the non-null assertion is safe.
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  }
  return ai;
}