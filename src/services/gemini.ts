const BASE = import.meta.env.VITE_API_URL ?? "";

/**
 * Takes user's raw scene description and returns an AI-enhanced, more vivid version.
 */
export async function enhanceScenePrompt(rawPrompt: string): Promise<string> {
  try {
    const res = await fetch(`${BASE}/api/ai/enhance-scene`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: rawPrompt }),
    });
    if (!res.ok) throw new Error("Server error");
    const data = await res.json();
    return data.enhancedText;
  } catch (error) {
    console.error("enhanceScenePrompt error:", error);
    return rawPrompt;
  }
}

/**
 * Generates 4 panel descriptions as an array of strings.
 */
export async function generatePanelDescriptions(
  scene: string,
  genre: string,
  style: string,
  title: string
): Promise<string[]> {
  try {
    const res = await fetch(`${BASE}/api/ai/generate-panels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scene, genre, style, title }),
    });
    if (!res.ok) throw new Error("Server error");
    const data = await res.json();
    return data.panels;
  } catch (error) {
    console.error("generatePanelDescriptions error:", error);
    return [
      "Panel 1: Establishing wide shot.",
      "Panel 2: Close-up on the protagonist.",
      "Panel 3: Action beat.",
      "Panel 4: Reaction shot.",
    ];
  }
}

/**
 * Generates a single line of dialogue for a character in a scene.
 * Returns a short quote string (max 12 words).
 */
export async function generateDialogue(
  panelContext: string,
  character: string
): Promise<string> {
  try {
    const res = await fetch(`${BASE}/api/ai/generate-dialogue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ panelContext, character }),
    });
    if (!res.ok) throw new Error("Server error");
    const data = await res.json();
    return data.dialogue;
  } catch (error) {
    console.error("generateDialogue error:", error);
    return "No one ever truly disappears.";
  }
}

/**
 * Streams the enhanced prompt chunk by chunk, calling onChunk for each piece.
 */
export async function streamSceneEnhancement(
  rawPrompt: string,
  onChunk: (text: string) => void
): Promise<void> {
  try {
    const url = `${BASE}/api/ai/stream-scene?prompt=${encodeURIComponent(rawPrompt)}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      if (event.data === "[DONE]") {
        eventSource.close();
        return;
      }
      try {
        const data = JSON.parse(event.data);
        if (data.text) {
          onChunk(data.text);
        } else if (data.error) {
          onChunk(`\n[${data.error}]`);
          eventSource.close();
        }
      } catch (err) {
        console.error("Failed to parse stream event:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("EventSource error:", err);
      eventSource.close();
      onChunk("\n[AI Enhancement unavailable. Please try again.]");
    };
  } catch (error) {
    console.error("streamSceneEnhancement error:", error);
    onChunk("\n[AI Enhancement unavailable. Please try again.]");
  }
}
