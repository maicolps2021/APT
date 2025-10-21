import { getGeminiClient } from './ai';
import type { Lead } from '../types';

export const generateWelcomeMessage = async (lead: Lead): Promise<string> => {
  const ai = getGeminiClient();
  
  const fallbackMessage = `A huge welcome to ${lead.name} from ${lead.company}! We're so glad you could join us.`;

  if (!ai) {
    return fallbackMessage;
  }

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
    return fallbackMessage;
  }
};
