import { GoogleGenAI } from "@google/genai";

// Según las directrices, la clave API debe provenir de process.env.API_KEY.
// Se asume que el entorno de compilación (por ejemplo, Vite) está configurado para exponer esta variable.
const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI | null = null;

if (API_KEY) {
  try {
    // FIX: Inicializar el cliente GoogleGenAI según las directrices.
    ai = new GoogleGenAI({ apiKey: API_KEY });
  } catch (e) {
    console.error("Failed to initialize GoogleGenAI client:", e);
    // Asegurarse de que `ai` permanezca nulo si la inicialización falla.
    ai = null;
  }
} else {
  // Esta advertencia es útil para los desarrolladores.
  console.warn(
    "Gemini API key (process.env.API_KEY) not found. AI-powered features will be disabled."
  );
}

/**
 * Devuelve la instancia inicializada del cliente GoogleGenAI si está disponible.
 * Esta función proporciona un único punto de acceso al cliente.
 * @returns {GoogleGenAI | null} La instancia del cliente o nulo si la clave API no está configurada.
 */
export function getGeminiClient(): GoogleGenAI | null {
  return ai;
}

/**
 * Comprueba si el cliente Gemini se ha inicializado correctamente.
 * Esto es útil para renderizar condicionalmente componentes de la interfaz de usuario que dependen de la IA.
 * @returns {boolean} Verdadero si el cliente está disponible, falso en caso contrario.
 */
export function hasGemini(): boolean {
  return ai !== null;
}
