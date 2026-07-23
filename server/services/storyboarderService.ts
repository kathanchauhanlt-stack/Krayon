/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  KRAYON — Storyboarder Agent Service (Step 3)
 * ───────────────────────────────────────────────────────────────────────────────
 *  Converts a generated Light Novel into a structured comic panel script
 *  using the Groq API with JSON mode.
 *
 *  KEY LOGIC:
 *  - Reads the Light Novel text + Character Glossary
 *  - Generates panel scripts with strict JSON output
 *  - Replaces character names with their Flux AI trigger_word in image_prompt
 *  - Outputs ComicPanelMap ready to save to Firebase
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type OpenAI from "openai";

// ── Types (mirroring pipeline.types.ts for server use) ──────────────────────

interface CharacterEntry {
  name: string;
  lora_id: string;
  trigger_word: string;
  visual_description: string;
}

type CharacterMap = Record<string, CharacterEntry>;

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

interface ComicBubble {
  character: string;
  type: "speech" | "thought" | "shout" | "whisper" | "caption";
  text: string;
}

interface ComicPanel {
  panel_order: number;
  scene_ref: string;
  image_prompt: string;
  characters_present: string[];
  image_url: string | null;
  status: "pending" | "rendering" | "complete" | "error";
  bubbles: Record<string, ComicBubble>;
}

type ComicPanelMap = Record<string, ComicPanel>;

// ── System Prompt ───────────────────────────────────────────────────────────

const STORYBOARDER_SYSTEM_PROMPT = `You are KRAYON-STORYBOARDER, a comic panel scripting engine for the Krayon AI comic creation platform. You convert Light Novel scenes into structured comic panel scripts in strict JSON format.

═══ CRITICAL RULE: TRIGGER WORD SUBSTITUTION ═══

You will receive a CHARACTER GLOSSARY mapping character names to their Flux AI trigger words and visual descriptions. In EVERY image_prompt you write, you MUST:

1. REPLACE the character's NAME with their TRIGGER WORD from the glossary
2. INCLUDE their visual_description alongside the trigger word
3. If the trigger_word is empty, use ONLY the visual_description to represent the character

EXAMPLE:
  Glossary entry: "General Kael" → trigger_word: "genkael_v1", visual_description: "tall muscular warrior, dark plate armor, scarred face, silver hair"
  
  ❌ WRONG:  "General Kael standing before the throne in golden light"
  ✅ CORRECT: "WS: genkael_v1 tall muscular warrior dark plate armor scarred face silver hair standing before ornate throne room, golden light streaming through stained glass"

If a character has NO trigger word AND no visual description, describe them generically based on the narrative context.

═══ PANEL CONSTRUCTION RULES ═══

1. Convert each scene into 2-4 comic panels (proportional to scene complexity)
2. CAMERA ANGLES — vary these and NEVER repeat the same angle consecutively:
   - WS (Wide Shot): Full figures + environment, establishing shots
   - MS (Medium Shot): Waist-up, good for dialogue
   - CU (Close-Up): Face only, maximum emotion
   - LA (Low Angle): Looking up — power, dominance, heroism
   - OTS (Over-the-Shoulder): Confrontation, dialogue facing
   - ECU (Extreme Close-Up): Eyes, hands, weapons — peak intensity
   - HA (High Angle): Looking down — vulnerability, overview
3. image_prompt must be a VISUAL DESCRIPTION ONLY:
   - NO character names (use trigger words + visual descriptions)
   - NO dialogue text in the image prompt
   - NO story narration — describe what the IMAGE shows
   - Include lighting, composition, atmosphere
4. Max 2 bubbles per panel — never more
5. Bubble types: "speech", "thought", "shout", "whisper", "caption"
6. In bubble "character" field, use the character's DISPLAY NAME (not trigger word)
7. "caption" type bubbles should have character set to "NARRATOR"
8. Approximately 30% of panels should be silent (empty bubbles array)

═══ STRICT NARRATIVE FIDELITY ═══
- Panel content must ONLY depict events from the Light Novel text
- Do NOT add scenes, events, or dialogue not present in the source
- Do NOT change character relationships or plot elements
- Every panel must trace back to a specific passage in the novel

═══ OUTPUT FORMAT (STRICT JSON) ═══

Respond with ONLY valid JSON. No markdown fences, no explanation, no text outside the JSON.

{
  "panels": [
    {
      "panel_order": 0,
      "scene_ref": "scene_001",
      "image_prompt": "CAMERA: detailed visual description with trigger words substituted for character names, including lighting and composition",
      "characters_present": ["char_id_from_glossary"],
      "bubbles": [
        {
          "character": "Character Display Name",
          "type": "speech",
          "text": "Actual dialogue from the novel"
        }
      ]
    }
  ]
}`;

// ── Character Glossary Builder ──────────────────────────────────────────────

/**
 * Build a human-readable character glossary string for the LLM prompt.
 */
function buildCharacterGlossary(characters: CharacterMap): string {
  const entries = Object.entries(characters);
  if (entries.length === 0) {
    return "CHARACTER GLOSSARY: No characters defined. Describe characters generically based on the narrative.";
  }

  let glossary = "CHARACTER GLOSSARY:\n";
  for (const [charId, char] of entries) {
    glossary += `- "${char.name}" (ID: ${charId})\n`;
    glossary += `  trigger_word: "${char.trigger_word || "(none)"}"\n`;
    glossary += `  visual_description: "${char.visual_description || "(not specified)"}"\n`;
    if (char.lora_id) {
      glossary += `  lora_id: "${char.lora_id}"\n`;
    }
    glossary += "\n";
  }

  return glossary;
}

/**
 * Build the full novel text from scene objects for the LLM prompt.
 */
function buildNovelText(scenes: Record<string, LightNovelScene>): string {
  const sortedScenes = Object.entries(scenes)
    .sort(([, a], [, b]) => a.scene_number - b.scene_number);

  let text = "";
  for (const [sceneId, scene] of sortedScenes) {
    text += `[SCENE ${scene.scene_number}: ${scene.title}] (ref: ${sceneId})\n`;
    if (scene.setting) text += `Setting: ${scene.setting}\n`;
    if (scene.characters_present.length > 0) {
      text += `Characters: ${scene.characters_present.join(", ")}\n`;
    }
    text += `\n${scene.body}\n\n`;
  }

  return text;
}

// ── Post-Processing ─────────────────────────────────────────────────────────

/**
 * Post-process the LLM's panel output to ensure data integrity.
 * - Validates and fixes trigger word substitution in image_prompt
 * - Ensures all required fields are present
 * - Converts bubbles array to a Record<string, ComicBubble>
 */
function postProcessPanels(
  rawPanels: any[],
  characters: CharacterMap,
): ComicPanelMap {
  const panelMap: ComicPanelMap = {};

  // Build a name → (trigger_word + visual_description) lookup for post-processing
  const nameToVisual: Record<string, string> = {};
  for (const [charId, char] of Object.entries(characters)) {
    const visual = [char.trigger_word, char.visual_description]
      .filter(Boolean)
      .join(" ");
    if (visual) {
      nameToVisual[char.name.toLowerCase()] = visual;
    }
  }

  for (let i = 0; i < rawPanels.length; i++) {
    const raw = rawPanels[i];
    const panelId = `panel_${String(i).padStart(3, "0")}`;

    // Ensure image_prompt has trigger words (post-process safety net)
    let imagePrompt: string = String(raw.image_prompt || raw.scene || "");

    // Check if any character names still appear in the prompt and replace them
    for (const [name, visual] of Object.entries(nameToVisual)) {
      const nameRegex = new RegExp(`\\b${escapeRegex(name)}\\b`, "gi");
      if (nameRegex.test(imagePrompt)) {
        imagePrompt = imagePrompt.replace(nameRegex, visual);
      }
    }

    // Process bubbles → convert array to Record
    const bubblesArray: any[] = Array.isArray(raw.bubbles) ? raw.bubbles : [];
    const bubblesMap: Record<string, ComicBubble> = {};
    for (let b = 0; b < Math.min(bubblesArray.length, 2); b++) {
      const bubble = bubblesArray[b];
      const bubbleId = `bubble_${String(b).padStart(2, "0")}`;
      bubblesMap[bubbleId] = {
        character: String(bubble.character || "NARRATOR"),
        type: isValidBubbleType(bubble.type) ? bubble.type : "speech",
        text: String(bubble.text || ""),
      };
    }

    // Resolve characters_present to valid char IDs
    const charsPresent: string[] = Array.isArray(raw.characters_present)
      ? raw.characters_present.filter((id: string) =>
          typeof id === "string" && id.length > 0
        )
      : [];

    panelMap[panelId] = {
      panel_order: typeof raw.panel_order === "number" ? raw.panel_order : i,
      scene_ref: String(raw.scene_ref || "scene_001"),
      image_prompt: imagePrompt,
      characters_present: charsPresent,
      image_url: null,
      status: "pending",
      bubbles: bubblesMap,
    };
  }

  return panelMap;
}

function isValidBubbleType(type: any): type is ComicBubble["type"] {
  return ["speech", "thought", "shout", "whisper", "caption"].includes(type);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Main Export ──────────────────────────────────────────────────────────────

/**
 * Generate comic panel scripts from a Light Novel and Character Glossary.
 *
 * @param groq        - OpenAI-compatible client pointed at Groq API
 * @param model       - Groq model ID
 * @param lightNovel  - The structured Light Novel (from Novelist Agent)
 * @param characters  - Character glossary with trigger words and LoRA IDs
 * @param genre       - Story genre for style context
 * @param style       - Art style directive
 * @returns ComicPanelMap ready to save to Firebase
 */
export async function generateComicPanels(
  groq: OpenAI,
  model: string,
  lightNovel: LightNovel,
  characters: CharacterMap,
  genre: string,
  style: string,
): Promise<ComicPanelMap> {
  const novelText = buildNovelText(lightNovel.scenes);
  const glossary = buildCharacterGlossary(characters);
  const sceneCount = Object.keys(lightNovel.scenes).length;

  const userMessage = `COMIC BRIEF:
Genre: ${genre}
Art Style: ${style}
Total Scenes: ${sceneCount}

${glossary}

═══ LIGHT NOVEL TEXT ═══

${novelText}

Convert this Light Novel into comic panels. Generate 2-4 panels per scene. Follow the trigger word substitution rules EXACTLY. Output ONLY valid JSON.`;

  console.log(`🎬 STORYBOARDER: Converting ${sceneCount} scenes into panels...`);

  const completion = await groq.chat.completions.create({
    model,
    messages: [
      { role: "system", content: STORYBOARDER_SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
    max_tokens: 8000,
    temperature: 0.6,
  });

  const rawContent = (completion.choices[0]?.message?.content ?? "").trim();

  if (!rawContent) {
    throw new Error("Storyboarder agent returned empty response");
  }

  // Parse JSON (Groq JSON mode ensures valid JSON)
  let parsed: any;
  try {
    parsed = JSON.parse(rawContent);
  } catch (e) {
    // Try stripping markdown fences as fallback
    const cleaned = rawContent
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    parsed = JSON.parse(cleaned);
  }

  const rawPanels: any[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.panels)
      ? parsed.panels
      : [];

  if (rawPanels.length === 0) {
    throw new Error("Storyboarder agent returned no panels");
  }

  // Post-process: validate, fix trigger words, convert to ComicPanelMap
  const panelMap = postProcessPanels(rawPanels, characters);
  const panelCount = Object.keys(panelMap).length;

  console.log(`✅ STORYBOARDER: Generated ${panelCount} panels from ${sceneCount} scenes`);

  return panelMap;
}
