import { BUILDERBOT_API_KEY, BUILDERBOT_ID } from '../lib/config';
import { resolvePhoneE164Strict, resolveTestRecipientFromEnv } from './messaging';

/**
 * Checks if the BuilderBot API key and Bot ID are configured in the environment variables.
 * @returns {boolean} True if both credentials are set, false otherwise.
 */
export function hasBuilderBot(): boolean {
  return !!(BUILDERBOT_API_KEY && BUILDERBOT_ID);
}

/**
 * Sends a WhatsApp message using the BuilderBot API.
 * @param {any} lead The lead object containing phone information.
 * @param {string} content The text content of the message.
 * @param {object} [opts] Optional parameters.
 * @param {boolean} [opts.forceTest] - If true, sends to a test recipient from env vars if the lead has no valid phone.
 * @returns {Promise<any>} A promise that resolves with the JSON response from the API.
 * @throws Will throw an error if credentials are not configured, the phone is invalid, or if the API request fails.
 */
export async function sendBuilderBotMessage(lead: any, content: string, opts?: { forceTest?: boolean }): Promise<any> {
  if (!hasBuilderBot()) {
    throw new Error('BuilderBot credentials (API Key and Bot ID) are not configured.');
  }

  let to = resolvePhoneE164Strict(lead);

  if (!to && opts?.forceTest) {
    to = resolveTestRecipientFromEnv();
  }

  if (!/^\+\d{7,15}$/.test(to)) {
    throw new Error('PHONE_INVALID_E164');
  }
  
  // eslint-disable-next-line no-console
  console.info('[BuilderBot] Sending to:', to, 'leadId:', lead?.id);


  // BuilderBot expects the number without the leading '+'
  const sanitizedNumber = to.substring(1);
  const url = `https://app.builderbot.cloud/api/v2/${BUILDERBOT_ID}/messages`;

  const headers = {
    'Content-Type': 'application/json',
    'x-api-builderbot': BUILDERBOT_API_KEY!,
  };

  const body = JSON.stringify({
    messages: {
      content: content,
    },
    number: sanitizedNumber,
    checkIfExists: false,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`BuilderBot API request failed with status ${response.status}: ${errorBody}`);
  }

  return response.json();
}