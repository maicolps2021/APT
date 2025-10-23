import { getGeminiClient } from './ai';
import type { Lead, KPIsData } from '../types';

export const generateWelcomeMessage = async (lead: Lead): Promise<string> => {
  const ai = getGeminiClient();

  const firstName = (lead.name || '').trim().split(' ')[0] || 'there';
  const company = (lead.company || '').trim() || 'our team';
  const fallbackMessage = `Hi ${firstName}! Great to have you here — welcome to ${company}.`;

  if (!ai) {
    console.warn("Gemini client not available, returning fallback welcome message.");
    return fallbackMessage;
  }

  const prompt = `
System instruction: You are a booth greeter. Write a short, friendly welcome message in English (max 2 short sentences). Avoid emojis.

User request:
- First name: ${firstName}
- Company: ${company}
- Context: A message for a big screen at a trade show booth.
- Tone: Warm, concise, professional.
- Output: Just the message text, no prefixes or quotes.
  `.trim();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    const text = response.text?.trim();
    return text || fallbackMessage;
  } catch (error) {
    console.error("Error generating welcome message with Gemini:", error);
    return fallbackMessage;
  }
};

export const generateKpiAnalysis = async (query: string, kpis: KPIsData): Promise<string> => {
  const ai = getGeminiClient();
  const safeQuery = (query || '').trim();

  if (!ai) {
    return "AI client is not available. Please configure the Gemini API key.";
  }

  if (!kpis) {
    return "KPI data is not available for analysis.";
  }

  const prompt = `
You are an expert event analyst for "Arenal Private Tours Operated by Small Groups La Fortuna Private Tours".
You have been provided with the following Key Performance Indicator (KPI) data for the event.

**KPI Data:**
- Total Leads Captured: ${kpis.total_leads || 0}
- Leads by Channel:
  ${Object.entries(kpis.leads_by_channel || {}).map(([channel, count]) => `- ${channel}: ${count}`).join('\n  ') || 'No channel data.'}
- Leads Captured Per Day:
  ${(kpis.leads_by_day || []).map(({ day, count }) => `- Day ${day}: ${count}`).join('\n  ') || 'No daily data.'}

**User's Query:**
"${safeQuery || 'Provide a general summary.'}"

Please provide a detailed and insightful analysis based on the data to answer the user's query.
Your response should be structured, clear, and actionable. Use markdown for formatting.
  `.trim();

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
    return response.text?.trim() || "The analysis returned an empty response.";
  } catch (error) {
    console.error("Error generating KPI analysis:", error);
    if (error instanceof Error) {
        return `An error occurred while generating the analysis: ${error.message}`;
    }
    return "An unknown error occurred while generating the analysis.";
  }
};
