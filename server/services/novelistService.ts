/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  KRAYON — Novelist Agent Service (Step 2)
 * ───────────────────────────────────────────────────────────────────────────────
 *  Calls the Groq API to expand a user's raw story prompt into a structured
 *  Light Novel, broken down into [SCENE] blocks.
 *
 *  NARRATIVE STRICTNESS:
 *  The system prompt enforces absolute fidelity to the user's story.
 *  The AI is explicitly forbidden from hallucinating extra lore, characters,
 *  plot twists, or hierarchy inversions not present in the source material.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type OpenAI from "openai";

// ── Types (mirroring src/types/pipeline.types.ts for server use) ────────────

interface LightNovelScene {
  scene_number: number;
  title: string;
  body: string;
  setting: string;
  characters_present: string[];
}

interface LightNovel {
  raw_prompt: string;
  scenes: Record<string, LightNovelScene>;
}

// ── System Prompt ───────────────────────────────────────────────────────────

const NOVELIST_SYSTEM_PROMPT = `You are KRAYON-NOVELIST, a strictly faithful narrative expansion engine for the Krayon AI comic creation platform.

YOUR SOLE PURPOSE: Take a user's story concept and expand it into structured Light Novel prose, broken into [SCENE] blocks. You add atmospheric detail, vivid descriptions, and natural dialogue — but you NEVER alter the story's core structure, characters, or events.

═══ NON-NEGOTIABLE RULES ═══

1. ZERO HALLUCINATION POLICY:
   - NEVER introduce characters the user did not mention or imply
   - NEVER add locations, factions, organizations, or worlds not in the source
   - NEVER create abilities, magic systems, or technologies not described
   - NEVER invent backstory or lore beyond what the user provides

2. HIERARCHY & RELATIONSHIP LOCKDOWN:
   - If the user defines a power structure (e.g., "General Kael serves Prince Aric, and the Prince serves King Aldric"), this hierarchy is ABSOLUTE and IMMUTABLE
   - Do NOT add secret betrayals, hidden agendas, or covert alliances
   - Do NOT add romantic tension between characters unless the user explicitly describes it
   - A loyal servant stays loyal. A kind ruler stays kind. A villain stays villainous.
   - Respect the EXACT chain of command as stated — no inversions, no nuance, no "secret doubts"

3. NO UNSOLICITED DRAMA:
   - Do NOT add surprise twists or shocking reveals
   - Do NOT add mysterious prophecies or ominous foreshadowing
   - Do NOT add moral ambiguity to clearly-defined characters
   - Do NOT add internal conflicts the user didn't describe
   - If the user's story is simple, keep it simple. Complexity must come from the USER, not from you.

4. SCOPE DISCIPLINE:
   - Short/simple concept → 3-5 scenes
   - Medium concept → 5-8 scenes
   - Complex multi-act story → 8-12 scenes
   - NEVER pad with filler scenes. Every scene must advance the user's stated plot.

5. CHARACTER FIDELITY:
   - Characters must behave EXACTLY as the user describes them
   - Use ONLY the character names the user provides
   - Maintain consistent characterization throughout all scenes

═══ OUTPUT FORMAT (STRICT) ═══

You MUST structure your output as sequential [SCENE] blocks in this exact format:

[SCENE 1: Scene Title Here]
Setting: Detailed description of the location/environment
Characters: Character Name 1, Character Name 2

(150-300 words of narrative prose for this scene. Include vivid sensory descriptions, atmospheric detail, and natural dialogue in quotes with character attribution.)

[SCENE 2: Next Scene Title]
Setting: Description
Characters: Names

(Continue the narrative...)

═══ PROSE RULES ═══
- Third person limited perspective
- Vivid sensory descriptions (sight, sound, smell, touch)
- Dialogue in quotes: "text," Character said.
- Consistent genre-appropriate tone and vocabulary
- No meta-commentary, no fourth-wall breaks
- No author notes or explanations outside the narrative`;

// ── Scene Parser ────────────────────────────────────────────────────────────

/**
 * Parse raw LLM output into structured scene objects.
 * Handles variations in formatting from the LLM.
 */
function parseScenes(rawText: string): Record<string, LightNovelScene> {
  const scenes: Record<string, LightNovelScene> = {};

  // Split on [SCENE X: ...] markers (lookahead to keep the delimiter)
  const parts = rawText.split(/(?=\[SCENE\s+\d+)/i).filter(s => s.trim());

  for (const part of parts) {
    // Extract scene header
    const headerMatch = part.match(/\[SCENE\s+(\d+):\s*(.+?)\]/i);
    if (!headerMatch) continue;

    const sceneNum = parseInt(headerMatch[1], 10);
    const sceneId = `scene_${String(sceneNum).padStart(3, "0")}`;
    const content = part.slice(headerMatch[0].length).trim();

    // Extract Setting: line (case-insensitive)
    const settingMatch = content.match(/^Setting:\s*(.+?)$/im);
    const setting = settingMatch?.[1]?.trim() ?? "";

    // Extract Characters: line
    const charsMatch = content.match(/^Characters:\s*(.+?)$/im);
    const characterNames = charsMatch?.[1]
      ?.split(",")
      .map(s => s.trim())
      .filter(Boolean) ?? [];

    // Everything remaining after metadata lines is the body prose
    let body = content;
    if (settingMatch) body = body.replace(settingMatch[0], "");
    if (charsMatch) body = body.replace(charsMatch[0], "");
    body = body.trim();

    scenes[sceneId] = {
      scene_number: sceneNum,
      title: headerMatch[2].trim(),
      setting,
      characters_present: characterNames,
      body,
    };
  }

  return scenes;
}

// ── Main Export ──────────────────────────────────────────────────────────────

/**
 * Generate a structured Light Novel from a user's raw story prompt.
 *
 * @param groq     - OpenAI-compatible client pointed at Groq API
 * @param model    - Groq model ID (e.g. "llama-3.3-70b-versatile")
 * @param rawPrompt - The user's original story concept
 * @param genre    - Story genre (e.g. "Fantasy", "Sci-Fi")
 * @param style    - Art style context (e.g. "Manga", "American Comic")
 * @returns The complete LightNovel object ready to save to Firebase
 */
export async function generateLightNovel(
  groq: OpenAI,
  model: string,
  rawPrompt: string,
  genre: string,
  style: string,
): Promise<{ lightNovel: LightNovel; rawText: string }> {
  const userMessage = `STORY CONCEPT:
Genre: ${genre}
Art Style Context: ${style}
Story:
${rawPrompt}

Expand this into a structured Light Novel with [SCENE] blocks. Follow the output format strictly. Remember: add prose and atmosphere, but do NOT change the story, characters, or relationships in ANY way.`;

  console.log(`📖 NOVELIST: Generating Light Novel for "${rawPrompt.slice(0, 60)}..."`);

  const completion = await groq.chat.completions.create({
    model,
    messages: [
      { role: "system", content: NOVELIST_SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    max_tokens: 8000,
    temperature: 0.7,
  });

  const rawText = (completion.choices[0]?.message?.content ?? "").trim();

  if (!rawText) {
    throw new Error("Novelist agent returned empty response");
  }

  // Parse scenes from the raw text
  const scenes = parseScenes(rawText);
  const sceneCount = Object.keys(scenes).length;

  if (sceneCount === 0) {
    // Fallback: treat the entire output as a single scene
    console.warn("⚠️  NOVELIST: No [SCENE] markers found — wrapping as single scene");
    scenes["scene_001"] = {
      scene_number: 1,
      title: "The Story",
      body: rawText,
      setting: "",
      characters_present: [],
    };
  }

  console.log(`✅ NOVELIST: Generated ${Object.keys(scenes).length} scenes`);

  const lightNovel: LightNovel = {
    raw_prompt: rawPrompt,
    scenes,
  };

  return { lightNovel, rawText };
}
