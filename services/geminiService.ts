
import { GoogleGenAI } from "@google/genai";
import type { Lead } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("Gemini API key is not set in environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateWelcomeMessage = async (lead: Lead): Promise<string> => {
  const prompt = `Generate a short, fun, and energetic welcome message for an event attendee.
  
  Attendee Details:
  - Name: ${lead.name}
  - Company: ${lead.company}
  
  The message should be one or two sentences. Be creative and welcoming. For example, you can mention their company in a positive light or add a fun, generic fact.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating welcome message:", error);
    return `A huge welcome to ${lead.name} from ${lead.company}! We're so glad you could join us.`;
  }
};
