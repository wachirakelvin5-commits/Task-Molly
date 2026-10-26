// Reading Molly's JSON replies. Kept free of Firebase imports so it can be unit-tested.

export interface ServiceDetails {
  serviceType?: string;
  description?: string;
  urgency?: string;
  location?: string;
  deadline?: string;
  initialQuote?: number;
  budget?: number;
  isComplete?: boolean;
  isUnlisted?: boolean;
}

export interface AskMollyResponse {
  message: string;
  serviceDetails?: ServiceDetails;
}

// While the JSON is still streaming in, pull out the part of "message" received so far.
export function partialMessage(jsonSoFar: string): string | null {
  const match = jsonSoFar.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)/);
  if (!match) return null;
  let raw = match[1];
  if (raw.endsWith('\\')) raw = raw.slice(0, -1); // half-received escape sequence
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw;
  }
}

export function parseMollyJson(text: string): AskMollyResponse {
  const cleaned = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
  const parsed = JSON.parse(cleaned) as AskMollyResponse & { text?: string };
  if (!parsed.message && parsed.text) parsed.message = parsed.text;
  if (!parsed.message) parsed.message = "I'm here to help! What service are you looking for?";
  return parsed;
}
