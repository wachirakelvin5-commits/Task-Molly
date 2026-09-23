import { GoogleGenAI } from "@google/genai";

export async function generateHeroVideo() {
  try {
    // Create a new instance right before the call to ensure the latest API key is used
    const apiKey = process.env.API_KEY || "";
    const ai = new GoogleGenAI({ apiKey });

    const prompt = "A high-quality 15-second cinematic video for a home service platform. The video starts with a professional plumber fixing a sink, then cuts to a woman happily doing laundry in a bright room, and finally cuts to a diverse team of men and women deep-cleaning a modern house. The transitions are smooth and the lighting is warm and professional.";
    
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    // Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("No video URI returned");

    // Fetch the video using the API key in the header
    const response = await fetch(downloadLink, {
      method: 'GET',
      headers: {
        'x-goog-api-key': apiKey,
      },
    });

    if (!response.ok) throw new Error("Failed to fetch generated video");
    
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Error generating video:", error);
    // If the error is about missing entity, it might be an API key issue
    if (error instanceof Error && error.message.includes("Requested entity was not found")) {
      throw new Error("API_KEY_RESET"); // Signal to UI to reset key
    }
    return null;
  }
}
