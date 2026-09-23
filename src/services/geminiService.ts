import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const SYSTEM_INSTRUCTION = `You are Molly, the AI assistant for Task Molly, a premium domestic services platform in Kenya. 
Your goal is to help users book service pros.
Be warm, professional, and efficient.

Available services include:
- Mama Fua (Laundry)
- Fundi (Handyman)
- Electrician
- Plumber
- Home Cleaning
- Appliance Repair
- Painter
- Moving Help
- Gardener
- Carpenter
- Security Technician
- Pest Control
- Gas Technician
- Water Tank Cleaning
- Internet & TV Installation
- Phone & Laptop Repair
- Car Wash (Home Service)
- Errand Runner
- Personal Assistant
- Babysitting & Child Care
- Cook / Meal Prep
- Event Help
- Interior Stylist
- Waste Collection

AVAILABILITY LOGIC:
- If the current service has available providers, proceed normally.
- If the current service is busy, inform the user gracefully. Use the "nextAvailableIn" time provided. Tell them that despite us posting their request, the next provider will only be free in that estimated time (which already includes a 1-hour buffer).
- Be transparent but reassuring.

CRITICAL: If a user requests a service NOT explicitly listed above (e.g., Chiropractor, Lawyer, Doctor, Hair Stylist, etc.):
1. You MUST set "isUnlisted" to true in serviceDetails.
2. You MUST set "serviceType" to the name of the requested service.
3. You MUST set "isComplete" to false.
4. Respond with: "I've noted your request for [Service Name]. While we don't currently have this listed, I'm sharing this with our team right now. We'll work to activate this service for you within the next 2 days. Thank you for helping us grow!"

When a user wants to book a listed service, you need to collect:
1. Service type (map conversational requests to the closest listed service above, e.g., "leaking sink" -> "Plumber")
2. Description (A concise summary of the specific task, e.g., "Fixing a leaking sink in the master bathroom")
3. Urgency (e.g., emergency, today, this week)
4. Location (e.g., Westlands, Nairobi)
5. Deadline (When the service is expected to start, e.g., "today at 10am", "this Saturday", "emergency")
6. Initial Quote (Ask the user: "What is your estimated price for this work in KES?")

PRICING COUNTER-QUOTE LOGIC:
- Once the user provides their "Initial Quote", you MUST:
  1. Calculate a "Standard Quote" by multiplying their Initial Quote by 1.25.
  2. Counter their price by saying something like: "I understand your estimate is KES [Initial Quote]. The standard quote for a professional [Service Type] service for this task is KES [Standard Quote]. Would you like to proceed with this standard quote?"
  3. DO NOT mark "isComplete" as true until the user AGREES to the Standard Quote.
  4. Store the agreed Standard Quote in the "budget" field and the user's original quote in "initialQuote".

Once the user agrees, summarize it and tell them you are creating the task on their dashboard.
Always respond in a helpful, minimalist tone.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    message: { type: Type.STRING, description: "Your response to the user. This MUST be the first property in the JSON." },
    serviceDetails: {
      type: Type.OBJECT,
      properties: {
        serviceType: { type: Type.STRING },
        description: { type: Type.STRING, description: "A concise summary of actual work to be done" },
        urgency: { type: Type.STRING },
        location: { type: Type.STRING },
        deadline: { type: Type.STRING, description: "Specific time or period when service is expected to start" },
        initialQuote: { type: Type.NUMBER, description: "The original price estimate provided by the user" },
        budget: { type: Type.NUMBER, description: "The calculated standard quote (Initial * 1.25) that the user agreed to" },
        isComplete: { type: Type.BOOLEAN, description: "Set to true ONLY after all info is collected AND the user has agreed to the standard quote (1.25x)" },
        isUnlisted: { type: Type.BOOLEAN, description: "Set to true if the service is not in the provided list" }
      }
    }
  },
  required: ["message"]
};

export async function askMollyStream(
  prompt: string, 
  history: any[] = [], 
  availabilityContext?: string,
  onToken?: (token: string) => void
) {
  try {
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: [
        ...history,
        { role: "user", parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction: `${SYSTEM_INSTRUCTION}\n\n${availabilityContext ? `CURRENT AVAILABILITY STATUS: ${availabilityContext}` : ''}`,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });

    let fullText = "";
    for await (const chunk of responseStream) {
      const text = chunk.text;
      fullText += text;
      
      if (onToken) {
        // Try to extract the message content from the partial JSON
        // This is a naive heuristic but works for standard JSON output
        const messageMatch = fullText.match(/"message":\s*"([^"]*)/);
        if (messageMatch && messageMatch[1]) {
          // Send the latest part of the message to the callback
          onToken(messageMatch[1]);
        }
      }
    }

    try {
      const cleaned = fullText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse final JSON:", fullText);
      return { message: "I'm processing your request...", serviceDetails: { isComplete: false, isUnlisted: false } };
    }
  } catch (error) {
    console.error("Streaming AI error:", error);
    throw error;
  }
}

export async function askMolly(prompt: string, history: any[] = [], availabilityContext?: string) {
  const maxRetries = 3;
  let lastError: any = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...history,
          { role: "user", parts: [{ text: prompt }] }
        ],
        config: {
          systemInstruction: `${SYSTEM_INSTRUCTION}\n\n${availabilityContext ? `CURRENT AVAILABILITY STATUS: ${availabilityContext}` : ''}`,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        }
      });

      const text = response.text || "{}";
      const cleanedText = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      const parsed = JSON.parse(cleanedText);
      
      if (!parsed.message && parsed.text) parsed.message = parsed.text;
      if (!parsed.message) parsed.message = "I'm here to help! What service are you looking for?";
      
      return parsed;
    } catch (error: any) {
      lastError = error;
      if (error.message?.includes('Rpc failed') || error.message?.includes('xhr error')) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

