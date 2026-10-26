// Molly, the AI concierge, talks to Gemini through Firebase AI Logic.
// The website is static (GitHub Pages) and has no server, so Gemini can't be called with a
// private key from here. Firebase AI Logic keeps the Gemini key inside the task-molly Firebase
// project and lets the browser call the model directly. It works the same on task-molly.com
// and in the AI Studio preview.
//
// One-time setup (already needed before this works): Firebase console > task-molly >
// AI Logic > Get started > Gemini Developer API.
import { getAI, getGenerativeModel, GoogleAIBackend, Schema, type Content, type GenerativeModel } from 'firebase/ai';
import { app } from '../firebase';
import { mollyInstructionWithAvailability } from '../lib/mollyPrompt';
import { parseMollyJson, partialMessage, type AskMollyResponse } from '../lib/mollyResponse';

export type { AskMollyResponse, ServiceDetails } from '../lib/mollyResponse';

// gemini-3.5-flash: available without the paid Blaze plan, and Google guarantees it won't be shut
// down before May 2027 (newer Flash versions are marked "short-term availability").
export const MOLLY_MODEL = 'gemini-3.5-flash';

const SERVICE_DETAILS_FIELDS = [
  'serviceType', 'description', 'urgency', 'location', 'deadline',
  'initialQuote', 'budget', 'isComplete', 'isUnlisted',
];

const RESPONSE_SCHEMA = Schema.object({
  properties: {
    message: Schema.string({ description: 'Your response to the user. This MUST be the first property in the JSON.' }),
    serviceDetails: Schema.object({
      properties: {
        serviceType: Schema.string(),
        description: Schema.string({ description: 'A concise summary of actual work to be done' }),
        urgency: Schema.string(),
        location: Schema.string(),
        deadline: Schema.string({ description: 'Specific time or period when service is expected to start' }),
        initialQuote: Schema.number({ description: 'The original price estimate provided by the user' }),
        budget: Schema.number({ description: 'The calculated standard quote (Initial * 1.25) that the user agreed to' }),
        isComplete: Schema.boolean({ description: 'Set to true ONLY after all info is collected AND the user has agreed to the standard quote (1.25x)' }),
        isUnlisted: Schema.boolean({ description: 'Set to true if the service is not in the provided list' }),
      },
      optionalProperties: SERVICE_DETAILS_FIELDS,
    }),
  },
  optionalProperties: ['serviceDetails'],
});

let ai: ReturnType<typeof getAI> | null = null;

function mollyModel(availabilityContext?: string): GenerativeModel {
  ai ??= getAI(app, { backend: new GoogleAIBackend() });
  return getGenerativeModel(ai, {
    model: MOLLY_MODEL,
    systemInstruction: mollyInstructionWithAvailability(availabilityContext),
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });
}

// Gemini expects the conversation to start with the user, so drop Molly's opening greeting.
function toContents(history: Content[], prompt: string): Content[] {
  const turns = history.filter(turn => turn.parts?.some(p => 'text' in p && p.text));
  while (turns.length && turns[0].role !== 'user') turns.shift();
  return [...turns, { role: 'user', parts: [{ text: prompt }] }];
}

export async function askMollyStream(
  prompt: string,
  history: Content[] = [],
  availabilityContext?: string,
  onToken?: (partialMessage: string) => void,
): Promise<AskMollyResponse> {
  const result = await mollyModel(availabilityContext).generateContentStream({
    contents: toContents(history, prompt),
  });

  let fullText = '';
  for await (const chunk of result.stream) {
    fullText += chunk.text();
    const soFar = partialMessage(fullText);
    if (soFar && onToken) onToken(soFar);
  }

  if (!fullText) fullText = (await result.response).text();
  return parseMollyJson(fullText);
}

export async function askMolly(
  prompt: string,
  history: Content[] = [],
  availabilityContext?: string,
): Promise<AskMollyResponse> {
  const result = await mollyModel(availabilityContext).generateContent({
    contents: toContents(history, prompt),
  });
  return parseMollyJson(result.response.text());
}
