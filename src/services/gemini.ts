import { GoogleGenAI } from "@google/genai";

let genAI: GoogleGenAI | null = null;

const getGemini = (): GoogleGenAI => {
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });
  }
  return genAI;
};

/**
 * Takes user's raw scene description and returns an AI-enhanced, more vivid version.
 */
export async function enhanceScenePrompt(rawPrompt: string): Promise<string> {
  const ai = getGemini();
  const systemInstruction =
    "You are a professional comic book writer and visual artist. Enhance this scene description to be more cinematic, visual, and comic-book ready. Keep it under 150 words. Return ONLY the enhanced text, no labels or explanations.";

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${systemInstruction}\n\n${rawPrompt}`,
    });
    return result.text ?? rawPrompt;
  } catch (error) {
    console.error("Gemini enhanceScenePrompt error:", error);
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
  const ai = getGemini();

  const systemInstruction = `You are a professional comic book writer. 
Comic title: "${title || "Untitled"}". Genre: ${genre}. Art style: ${style}.
Given the scene below, generate exactly 4 panel descriptions for a comic page.
Format your response as a numbered list:
1. Panel 1: ...
2. Panel 2: ...
3. Panel 3: ...
4. Panel 4: ...
Each description should be one sentence describing camera angle, action, and mood. Do NOT add extra text.`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${systemInstruction}\n\nScene: ${scene}`,
    });

    const raw = result.text ?? "";
    // Split by numbered list pattern
    const lines = raw
      .split(/\n/)
      .map((l) => l.replace(/^\d+\.\s*/u, "").trim())
      .filter((l) => l.length > 0);

    // Ensure we always return exactly 4 elements
    while (lines.length < 4) {
      lines.push(`Panel ${lines.length + 1}: The scene continues...`);
    }
    return lines.slice(0, 4);
  } catch (error) {
    console.error("Gemini generatePanelDescriptions error:", error);
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
  const ai = getGemini();

  const prompt = `You are writing dialogue for a comic book character.
Character: ${character}.
Scene context: ${panelContext}.
Write ONE single line of dialogue (maximum 12 words) that this character would say. Return ONLY the dialogue text, no quotation marks, no attribution, no explanations.`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const text = (result.text ?? "").trim().replace(/^["']|["']$/g, "");
    // Clamp to 12 words
    const words = text.split(/\s+/);
    return words.slice(0, 12).join(" ");
  } catch (error) {
    console.error("Gemini generateDialogue error:", error);
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
  const ai = getGemini();

  const systemInstruction =
    "You are a professional comic book writer and visual artist. Enhance this scene description to be more cinematic, visual, and comic-book ready. Keep it under 150 words. Return ONLY the enhanced text, no labels or explanations.";

  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: `${systemInstruction}\n\n${rawPrompt}`,
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        onChunk(text);
      }
    }
  } catch (error) {
    console.error("Gemini streamSceneEnhancement error:", error);
    onChunk("\n[AI Enhancement unavailable. Please try again.]");
  }
}
