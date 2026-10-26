export async function generateHeroVideo(): Promise<string | null> {
  try {
    const response = await fetch('/api/generate-hero-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data?.videoUrl || null;
  } catch (error) {
    console.warn("Hero video generation not active:", error);
    return null;
  }
}
