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

export async function askMollyStream(
  prompt: string, 
  history: any[] = [], 
  availabilityContext?: string,
  onToken?: (token: string) => void
): Promise<AskMollyResponse> {
  try {
    const response = await fetch('/api/ask-molly-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, history, availabilityContext })
    });

    if (!response.ok || !response.body) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResult: AskMollyResponse | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.type === 'token' && onToken && typeof data.text === 'string') {
              onToken(data.text);
            } else if (data.type === 'done' && data.result) {
              finalResult = data.result;
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          } catch (e) {
            // Ignore non-JSON or partial lines
          }
        }
      }
    }

    if (finalResult) {
      return finalResult;
    }

    // If stream ended without explicit done payload, fallback to standard call
    return await askMolly(prompt, history, availabilityContext);
  } catch (error) {
    console.warn("Client streaming fallback to standard call:", error);
    return await askMolly(prompt, history, availabilityContext);
  }
}

export async function askMolly(
  prompt: string, 
  history: any[] = [], 
  availabilityContext?: string
): Promise<AskMollyResponse> {
  const response = await fetch('/api/ask-molly', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, history, availabilityContext })
  });

  if (!response.ok) {
    throw new Error(`AI request failed with status ${response.status}`);
  }

  return response.json();
}
