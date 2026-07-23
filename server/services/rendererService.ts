/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  KRAYON — Renderer Service (Step 4)
 * ───────────────────────────────────────────────────────────────────────────────
 *  Image generation pipeline using Flux AI (via NVIDIA NIM FLUX.2-Klein-4B).
 *
 *  For each panel:
 *  1. Reads the panel's image_prompt and characters_present from Firebase
 *  2. Constructs the full Flux prompt with style/genre modifiers
 *  3. Injects LoRA trigger words (already in image_prompt from Storyboarder)
 *  4. Calls the NVIDIA NIM API to generate the image
 *  5. Updates the image_url in Firebase on completion
 *
 *  LORA SUPPORT:
 *  Trigger words are injected into prompts by the Storyboarder Agent (Step 3).
 *  The lora_id field on characters is reserved for future endpoints that
 *  support direct LoRA adapter loading (e.g., fal.ai, Replicate).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ── Types ───────────────────────────────────────────────────────────────────

interface CharacterEntry {
  name: string;
  lora_id: string;
  trigger_word: string;
  visual_description: string;
}

type CharacterMap = Record<string, CharacterEntry>;

// ── Lazy env access ─────────────────────────────────────────────────────────

let _nvidiaKey: string | undefined;
function getNvidiaKey(): string {
  if (_nvidiaKey === undefined) {
    _nvidiaKey = process.env.NVIDIA_API_KEY ?? "";
  }
  return _nvidiaKey;
}

const NVIDIA_NIM_ENDPOINT =
  "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b";

// ── Genre / Style Art Direction ─────────────────────────────────────────────

const GENRE_ART: Record<string, { art: string; light: string; technique: string; mood: string }> = {
  "Shonen": {
    art:       "dynamic shonen manga panel, bold heavy ink outlines, high-contrast black and white illustration",
    light:     "dramatic rim lighting, intense directional backlight, deep shadow contrast",
    technique: "speed lines radiating from impact point, screentone texture, cross-hatching for depth",
    mood:      "explosive raw power, intense determination, battle-hardened energy",
  },
  "Shojo": {
    art:       "delicate shojo manga style, fine elegant ink lines, soft flowing composition",
    light:     "soft warm diffused lighting, golden hour glow, gentle ethereal rim light",
    technique: "floral screentone background, sparkle dot-pattern texture, thin graceful linework",
    mood:      "romantic tender atmosphere, emotional warmth, gentle and graceful feeling",
  },
  "Fantasy": {
    art:       "epic fantasy manga panel, richly detailed ink illustration, ornate world-building composition",
    light:     "dramatic mystical lighting, magical energy glow, chiaroscuro shadows",
    technique: "intricate cross-hatching, dense screentone layers, epic cinematic framing",
    mood:      "mythic grandeur, sense of wonder, heroic epic atmosphere",
  },
  "Sci-Fi": {
    art:       "cyberpunk manga panel, clean futuristic ink illustration, sleek technical linework",
    light:     "neon rim lighting with cyan and magenta hues, holographic glow effects",
    technique: "circuit-pattern screentones, geometric cross-hatching, HUD overlay elements",
    mood:      "cold dystopian tension, technological awe, cyberpunk atmosphere",
  },
  "Horror": {
    art:       "horror manga panel, heavy oppressive dark ink, unsettling composition",
    light:     "single harsh light source casting twisted shadows, extreme chiaroscuro",
    technique: "dense heavy cross-hatching, solid black screentones, distortion lines",
    mood:      "suffocating dread, psychological terror, creeping darkness",
  },
  "Romance": {
    art:       "romance manga panel, soft expressive ink style, intimate close composition",
    light:     "warm golden soft lighting, gentle bokeh background glow",
    technique: "soft dot-pattern screentones, flowing graceful linework, blush rendering",
    mood:      "heartfelt emotion, tender intimacy, bittersweet longing",
  },
  "Action": {
    art:       "action manga panel, explosive dynamic ink illustration, high-energy kinetic composition",
    light:     "dramatic hard side lighting, impact flash effects, high contrast shadow play",
    technique: "dense speed lines, impact burst radiating lines, motion blur ink strokes",
    mood:      "raw adrenaline, explosive movement, unstoppable force",
  },
  "Slice of Life": {
    art:       "slice of life manga panel, clean casual ink style, warm authentic everyday composition",
    light:     "natural soft ambient daylight, cozy warm room lighting",
    technique: "light clean halftone screentones, minimal precise linework",
    mood:      "cozy authentic warmth, relatable human moment, nostalgic feeling",
  },
};

const STYLE_GUIDE: Record<string, string> = {
  "American Comic": "American comic book art, bold cel-shaded colors, thick black outlines, Marvel DC heroic aesthetic",
  "Manga":          "authentic Japanese manga, crisp black and white ink, professional publication quality",
  "Manhwa":         "Korean manhwa webtoon style, full-color digital painting, clean modern art",
  "European Comic": "Franco-Belgian bande dessinée, ligne claire clean precise lines, rich detailed colors",
  "Chibi":          "super-deformed chibi manga, cute exaggerated large-head proportions, playful rounded linework",
  "Noir":           "noir comic, stark high-contrast monochrome, heavy shadow, Frank Miller aesthetic",
};

// ── Prompt Builder ──────────────────────────────────────────────────────────

/**
 * Build the full Flux image generation prompt by combining:
 * 1. The panel's image_prompt (already has trigger words from Storyboarder)
 * 2. Genre-specific art direction
 * 3. Style-specific rendering guide
 * 4. Technical quality directives
 */
function buildFluxPrompt(
  imagePrompt: string,
  style: string,
  genre: string,
): string {
  const gp = GENRE_ART[genre] ?? GENRE_ART["Action"];
  const sd = STYLE_GUIDE[style] ?? `${style} comic art, professional illustration`;

  return [
    imagePrompt,              // Subject + action FIRST (highest FLUX weight)
    gp.art,                   // Genre art identity
    sd,                       // Style rendering direction
    gp.light,                 // Lighting
    gp.technique,             // Visual techniques
    gp.mood,                  // Atmosphere
    "single panel composition, no text overlays, no speech bubbles visible, no panel borders",
    "high definition, sharp crisp focus, professional publication quality",
  ].join(", ");
}

// ── Image Generation ────────────────────────────────────────────────────────

/**
 * Generate a comic panel image via NVIDIA NIM FLUX.2-Klein-4B.
 *
 * Returns a base64 data URI on success, or a Pollinations URL as fallback.
 */
export async function generatePanelImage(
  imagePrompt: string,
  style: string,
  genre: string,
  seed?: number,
): Promise<string> {
  const prompt = buildFluxPrompt(imagePrompt, style, genre);
  const imageSeed = seed ?? Math.floor(Math.random() * 2147483647);
  const apiKey = getNvidiaKey();

  // ── Try NVIDIA NIM ─────────────────────────────────────────────────────
  if (apiKey) {
    try {
      const resp = await fetch(NVIDIA_NIM_ENDPOINT, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "accept": "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          width: 1024,
          height: 1024,
          steps: 4,
          seed: imageSeed % 2147483647,
          cfg_scale: 1,
          samples: 1,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => resp.statusText);
        throw new Error(`NVIDIA NIM ${resp.status}: ${errText.slice(0, 200)}`);
      }

      const data = await resp.json() as {
        artifacts?: Array<{ base64: string; finishReason: string; seed: number }>;
      };

      const b64 = data.artifacts?.[0]?.base64;
      if (b64) {
        console.log(`✅ RENDERER: NVIDIA NIM image OK (seed=${imageSeed})`);
        return `data:image/jpeg;base64,${b64}`;
      }
      throw new Error("NVIDIA NIM returned empty artifacts");
    } catch (e: any) {
      console.warn(`⚠️  RENDERER: NVIDIA NIM failed (${e.message}) — Pollinations fallback`);
    }
  } else {
    console.warn("⚠️  RENDERER: NVIDIA_API_KEY not set — Pollinations fallback");
  }

  // ── Pollinations fallback ──────────────────────────────────────────────
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=1&model=flux&seed=${imageSeed}`;
}

/**
 * Render a single panel: generate image and return the URL.
 *
 * This function does NOT write to Firebase — the caller (pipeline router)
 * handles the Firebase update to maintain clean separation of concerns.
 *
 * @param imagePrompt       - The panel's image_prompt (trigger words already substituted)
 * @param charactersPresent - Character IDs in this panel (for LoRA loading in future)
 * @param characters        - Full character map (for LoRA metadata lookup)
 * @param style             - Art style directive
 * @param genre             - Story genre
 * @returns The generated image URL (base64 data URI or Pollinations URL)
 */
export async function renderPanel(
  imagePrompt: string,
  charactersPresent: string[],
  characters: CharacterMap,
  style: string,
  genre: string,
): Promise<string> {
  // Future: extract LoRA IDs from characters for endpoints that support them
  const _loraIds = charactersPresent
    .map(id => characters[id]?.lora_id)
    .filter(Boolean);

  // For now, trigger words are already in the image_prompt (from Storyboarder)
  // and the NVIDIA NIM endpoint doesn't support custom LoRAs.
  // The _loraIds are collected for future Replicate/fal.ai integration.

  return generatePanelImage(imagePrompt, style, genre);
}
