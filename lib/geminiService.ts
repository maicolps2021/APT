import { getGeminiClient } from './ai';
import type { Lead, KPIsData } from '../types';

export const generateWelcomeMessage = async (lead: Lead): Promise<string> => {
  const ai = getGeminiClient();
  
  const fallbackMessage = `A huge welcome to ${lead.name} from ${lead.company}! We're so glad you could join us.`;

  if (!ai) {
    return fallbackMessage;
  }

  const prompt = `You are a copywriter for an event screen.
Your task is to write a short, fun, energetic WELCOME message for an attendee.

**Language requirement:** Always write the final message **in English only**. Do not translate into any other language, even if the input is not in English.

**Attendee Details**
- Name: ${lead.name}
- Company: ${lead.company || 'Independent'}

**Style & Length**
- 1–2 sentences max.
- Friendly, upbeat, professional.
- You may use at most one emoji, or none. Avoid hashtags and ALL CAPS.

**Content Rules**
- Greet the person by first name.
- If company is present, reference it positively once.
- No sensitive claims, no promises, no slang that could be offensive.
- Avoid repeating the event name unless it is natural.

**Output**
- Return only the final message text. No quotes, no prefixes, no markdown, no JSON.`;

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
