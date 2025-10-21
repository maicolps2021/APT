import { getGeminiClient } from './ai';
import type { Lead, KPIsData } from '../types';

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

export const generateKpiAnalysis = async (query: string, kpis: KPIsData): Promise<string> => {
  const ai = getGeminiClient();
  if (!ai) {
    return "AI client is not available. Please configure the Gemini API key.";
  }

  const prompt = `
You are an expert event analyst for "Arenal Private Tours Operated by Small Groups La Fortuna Private Tours".
You have been provided with the following Key Performance Indicator (KPI) data for the event.

**KPI Data:**
- Total Leads Captured: ${kpis.total_leads}
- Leads by Channel:
  ${Object.entries(kpis.leads_by_channel).map(([channel, count]) => `- ${channel}: ${count}`).join('\n  ')}
- Leads Captured Per Day:
  ${kpis.leads_by_day.map(({ day, count }) => `- Day ${day}: ${count}`).join('\n  ')}

**User's Query:**
"${query}"

Please provide a detailed and insightful analysis based on the data to answer the user's query.
Your response should be structured, clear, and actionable. Use markdown for formatting.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingBudget: 32768,
        },
      },
    });
    return response.text;
  } catch (error) {
    console.error("Error generating KPI analysis:", error);
    if (error instanceof Error) {
        return `An error occurred while generating the analysis: ${error.message}`;
    }
    return "An unknown error occurred while generating the analysis.";
  }
};