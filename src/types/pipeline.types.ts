/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  KRAYON — Light Novel to Comic Pipeline: Type Definitions
 * ───────────────────────────────────────────────────────────────────────────────
 *  Firebase Realtime Database schema types.
 *  These interfaces map 1:1 to the JSON structure stored at:
 *    projects/{projectId}/...
 *
 *  IMPORTANT: Do NOT modify field names without updating pipelineDb.ts
 *  utility functions — they rely on exact path strings matching these shapes.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ── Pipeline Status ─────────────────────────────────────────────────────────

/** Tracks the current phase of the generation pipeline */
export type PipelineStatus =
  | "idle"                // Project created, awaiting user input
  | "generating_novel"    // Novelist Agent (Groq) is expanding the story
  | "generating_panels"   // Storyboarder Agent (Groq) is creating panel scripts
  | "rendering"           // Renderer Service (Flux AI) is generating images
  | "complete"            // All panels rendered successfully
  | "error";              // Pipeline halted due to an error

// ── Project Metadata ────────────────────────────────────────────────────────

export interface ProjectMetadata {
  title: string;
  genre: string;
  /** Global art style directive passed to all image prompts (e.g. "Manga", "American Comic") */
  global_style: string;
  created_at: number;       // Unix timestamp (ms)
  updated_at: number;       // Unix timestamp (ms)
  status: PipelineStatus;
  owner_id: string;         // Firebase Auth UID or fallback user ID
  /** Optional error message when status === "error" */
  error_message?: string;
}

// ── Light Novel ─────────────────────────────────────────────────────────────

export interface LightNovelScene {
  scene_number: number;
  title: string;
  /** The full narrative body text for this scene */
  body: string;
  /** Physical setting / location description */
  setting: string;
  /** Character names present in this scene (must match keys in CharacterMap) */
  characters_present: string[];
}

/** The complete Light Novel, stored under projects/{id}/light_novel */
export interface LightNovel {
  /** The user's original raw story prompt — preserved verbatim */
  raw_prompt: string;
  /** Map of scenes keyed by scene ID (e.g. "scene_001") */
  scenes: Record<string, LightNovelScene>;
}

// ── Character Glossary ──────────────────────────────────────────────────────

export interface CharacterEntry {
  /** Display name (e.g. "General Kael") */
  name: string;
  /**
   * Flux LoRA adapter ID for this character's visual consistency.
   * Empty string if no LoRA is assigned yet.
   */
  lora_id: string;
  /**
   * The exact trigger word that activates the LoRA in Flux prompts.
   * The Storyboarder Agent MUST replace character names with this token
   * when building image_prompt strings.
   */
  trigger_word: string;
  /** Detailed visual description for consistent rendering across panels */
  visual_description: string;
}

/** Map of characters keyed by character ID (e.g. "char_kael") */
export type CharacterMap = Record<string, CharacterEntry>;

// ── Comic Panels ────────────────────────────────────────────────────────────

/** Bubble type system matching manga conventions */
export type BubbleType =
  | "speech"    // Oval bubble — normal spoken dialogue
  | "thought"   // Cloud bubble with dots — internal monologue
  | "shout"     // Jagged spiky starburst — battle cry, extreme emotion
  | "whisper"   // Dashed outline oval — soft/secret speech, fear
  | "caption";  // Rectangular box — narrator voice, time/place stamps

export interface ComicBubble {
  /** Named character (e.g. "General Kael") or "NARRATOR" for captions */
  character: string;
  type: BubbleType;
  text: string;
}

/** Status of an individual panel's image generation */
export type PanelRenderStatus =
  | "pending"     // Awaiting rendering
  | "rendering"   // Flux AI is currently generating
  | "complete"    // Image URL is populated
  | "error";      // Rendering failed

export interface ComicPanel {
  panel_order: number;
  /** Reference to the scene this panel depicts (e.g. "scene_001") */
  scene_ref: string;
  /**
   * The fully-constructed image prompt sent to Flux AI.
   * Character names are REPLACED with their trigger_word tokens.
   * Includes style directives, camera angles, lighting, etc.
   */
  image_prompt: string;
  /** Character IDs present in this panel (keys from CharacterMap) */
  characters_present: string[];
  /** Flux AI generated image URL — null until rendering completes */
  image_url: string | null;
  /** Current render state of this panel */
  status: PanelRenderStatus;
  /** Dialogue/narration bubbles overlaid on this panel */
  bubbles: Record<string, ComicBubble>;
}

/** Map of panels keyed by panel ID (e.g. "panel_001") */
export type ComicPanelMap = Record<string, ComicPanel>;

// ── Root Project Node ───────────────────────────────────────────────────────

/**
 * Complete project structure stored at: projects/{projectId}
 *
 * Firebase Realtime Database JSON shape:
 * ```
 * projects/
 *   {projectId}/
 *     metadata/     → ProjectMetadata
 *     light_novel/  → LightNovel
 *     characters/   → CharacterMap
 *     comic_panels/ → ComicPanelMap
 * ```
 */
export interface PipelineProject {
  metadata: ProjectMetadata;
  light_novel: LightNovel;
  characters: CharacterMap;
  comic_panels: ComicPanelMap;
}
