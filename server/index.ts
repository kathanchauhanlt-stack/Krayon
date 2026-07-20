/**
 * Krayon — Express API Server
 * Stack: Express 4 + better-sqlite3 (file-based, zero config)
 * Run: npx tsx server/index.ts
 */

import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs";

dotenv.config({ path: ".env.local" });

// ── Groq client (OpenAI-compatible, free tier) ───────────────────────────────
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY ?? "",
  baseURL: "https://api.groq.com/openai/v1",
});
const GROQ_MODEL = "llama-3.3-70b-versatile";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH   = path.join(__dirname, "ainime.db");
const SPECS_DIR = path.join(__dirname, "specs");

// Ensure specs directory exists for JSON records
if (!fs.existsSync(SPECS_DIR)) fs.mkdirSync(SPECS_DIR, { recursive: true });

// ── Open / create database ──────────────────────────────────────────────────
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Schema ─────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           TEXT PRIMARY KEY,
    username     TEXT UNIQUE NOT NULL,
    rank         TEXT NOT NULL DEFAULT 'Novice Chronicler',
    bio          TEXT DEFAULT 'Weaving realities from the void.',
    avatar_url   TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS comics (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    author_id    TEXT NOT NULL REFERENCES users(id),
    cover_url    TEXT,
    genre        TEXT NOT NULL DEFAULT 'Fantasy',
    style        TEXT NOT NULL DEFAULT 'American Comic',
    concept      TEXT,
    status       TEXT NOT NULL DEFAULT 'draft',
    badge        TEXT NOT NULL DEFAULT 'WORK IN PROGRESS',
    mana_count   INTEGER NOT NULL DEFAULT 0,
    remix_count  INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pages (
    id           TEXT PRIMARY KEY,
    comic_id     TEXT NOT NULL REFERENCES comics(id) ON DELETE CASCADE,
    page_number  INTEGER NOT NULL DEFAULT 1,
    layout       TEXT NOT NULL DEFAULT 'grid-2x2',
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS panels (
    id           TEXT PRIMARY KEY,
    page_id      TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    panel_order  INTEGER NOT NULL DEFAULT 0,
    image_url    TEXT,
    dialogue     TEXT,
    caption      TEXT,
    panel_type   TEXT DEFAULT 'normal',
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS mana (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id),
    comic_id     TEXT NOT NULL REFERENCES comics(id),
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, comic_id)
  );

  CREATE TABLE IF NOT EXISTS follows (
    id           TEXT PRIMARY KEY,
    follower_id  TEXT NOT NULL REFERENCES users(id),
    following_id TEXT NOT NULL REFERENCES users(id),
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(follower_id, following_id)
  );

  CREATE TABLE IF NOT EXISTS drafts (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id),
    title        TEXT NOT NULL,
    genre        TEXT NOT NULL DEFAULT 'Fantasy',
    style        TEXT NOT NULL DEFAULT 'American Comic',
    concept      TEXT,
    progress     INTEGER NOT NULL DEFAULT 0,
    locked       INTEGER NOT NULL DEFAULT 0,
    pages_count  INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS comic_specs (
    id           TEXT PRIMARY KEY,
    comic_id     TEXT REFERENCES comics(id) ON DELETE CASCADE,
    spec_json    TEXT NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── Safe schema migrations (idempotent) ─────────────────────────────────────
const addColumnIfMissing = (table: string, col: string, def: string) => {
  try {
    const cols = (db.prepare(`PRAGMA table_info(${table})`).all() as any[]).map(c => c.name);
    if (!cols.includes(col)) {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`).run();
      console.log(`✅ Added column ${table}.${col}`);
    }
  } catch {/* already exists */}
};
addColumnIfMissing("panels", "bubbles_json", "TEXT");
addColumnIfMissing("panels", "sfx",          "TEXT");
addColumnIfMissing("panels", "character_name", "TEXT");
addColumnIfMissing("panels", "bubble_type",    "TEXT DEFAULT 'speech'");

// ── Seed minimal user data (only if DB is fresh) ────────────────────────────
const userCount = (db.prepare("SELECT COUNT(*) as c FROM users").get() as any).c;
if (userCount === 0) {
  db.prepare(`INSERT INTO users (id, username, rank, bio, avatar_url) VALUES (?, ?, ?, ?, ?)`)
    .run("u1", "Creator", "Grand Architect", "Weaving realities from the void.", null);
  console.log("✅ Default user created");
}

// ── Express app ─────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.API_PORT ?? 3001;

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

const uid = () => Math.random().toString(36).slice(2, 10);

// ══════════════════════════════════════════════════════════════════════════════
//  COMICS
// ══════════════════════════════════════════════════════════════════════════════

app.get("/api/comics", (req, res) => {
  const { status, genre, search } = req.query;
  let sql = `SELECT c.*, u.username as author_name FROM comics c JOIN users u ON u.id = c.author_id WHERE 1=1`;
  const params: any[] = [];
  if (status) { sql += " AND c.status = ?"; params.push(status); }
  if (genre)  { sql += " AND c.genre  = ?"; params.push(genre); }
  if (search) { sql += " AND (c.title LIKE ? OR u.username LIKE ?)"; params.push(`%${search}%`, `%${search}%`); }
  sql += " ORDER BY c.mana_count DESC";
  res.json(db.prepare(sql).all(...params));
});

app.get("/api/comics/:id", (req, res) => {
  const comic = db.prepare(`SELECT c.*, u.username as author_name FROM comics c JOIN users u ON u.id = c.author_id WHERE c.id = ?`).get(req.params.id);
  if (!comic) return res.status(404).json({ error: "Not found" });
  res.json(comic);
});

app.post("/api/comics", (req, res) => {
  const { title, author_id = "u1", cover_url, genre, style, concept, status = "draft" } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });
  const id = `c_${uid()}`;
  const badge = status === "final" ? "EPIC FINALE" : "WORK IN PROGRESS";
  db.prepare(`INSERT INTO comics (id, title, author_id, cover_url, genre, style, concept, status, badge) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, title, author_id, cover_url ?? null, genre ?? "Fantasy", style ?? "American Comic", concept ?? null, status, badge);
  res.status(201).json({ id });
});

app.patch("/api/comics/:id", (req, res) => {
  const { title, cover_url, genre, style, concept, status } = req.body;
  const badge = status === "final" ? "EPIC FINALE" : "WORK IN PROGRESS";
  db.prepare(`UPDATE comics SET title=COALESCE(?,title), cover_url=COALESCE(?,cover_url), genre=COALESCE(?,genre), style=COALESCE(?,style), concept=COALESCE(?,concept), status=COALESCE(?,status), badge=? WHERE id=?`).run(title, cover_url, genre, style, concept, status, badge, req.params.id);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════════════
//  MANA
// ══════════════════════════════════════════════════════════════════════════════

app.post("/api/comics/:id/mana", (req, res) => {
  const { user_id = "u1" } = req.body;
  const existing = db.prepare("SELECT id FROM mana WHERE user_id=? AND comic_id=?").get(user_id, req.params.id);
  if (existing) {
    db.prepare("DELETE FROM mana WHERE user_id=? AND comic_id=?").run(user_id, req.params.id);
    db.prepare("UPDATE comics SET mana_count = MAX(0, mana_count - 1) WHERE id=?").run(req.params.id);
    res.json({ liked: false });
  } else {
    db.prepare("INSERT INTO mana (id,user_id,comic_id) VALUES (?,?,?)").run(uid(), user_id, req.params.id);
    db.prepare("UPDATE comics SET mana_count = mana_count + 1 WHERE id=?").run(req.params.id);
    res.json({ liked: true });
  }
});

app.get("/api/comics/:id/mana", (req, res) => {
  const { user_id = "u1" } = req.query;
  const liked = !!db.prepare("SELECT id FROM mana WHERE user_id=? AND comic_id=?").get(user_id, req.params.id);
  const count = (db.prepare("SELECT mana_count FROM comics WHERE id=?").get(req.params.id) as any)?.mana_count ?? 0;
  res.json({ liked, count });
});

// ══════════════════════════════════════════════════════════════════════════════
//  DRAFTS
// ══════════════════════════════════════════════════════════════════════════════

app.get("/api/drafts", (req, res) => {
  const { user_id = "u1" } = req.query;
  res.json(db.prepare("SELECT * FROM drafts WHERE user_id=? ORDER BY updated_at DESC").all(user_id));
});

app.post("/api/drafts", (req, res) => {
  const { title, user_id = "u1", genre, style, concept } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });
  const id = `d_${uid()}`;
  db.prepare(`INSERT INTO drafts (id, user_id, title, genre, style, concept) VALUES (?, ?, ?, ?, ?, ?)`).run(id, user_id, title, genre ?? "Fantasy", style ?? "American Comic", concept ?? null);
  res.status(201).json({ id });
});

app.patch("/api/drafts/:id", (req, res) => {
  const { progress, locked, pages_count, title, concept } = req.body;
  db.prepare(`UPDATE drafts SET progress=COALESCE(?,progress), locked=COALESCE(?,locked), pages_count=COALESCE(?,pages_count), title=COALESCE(?,title), concept=COALESCE(?,concept), updated_at=datetime('now') WHERE id=?`).run(progress, locked, pages_count, title, concept, req.params.id);
  res.json({ ok: true });
});

app.delete("/api/drafts/:id", (req, res) => {
  db.prepare("DELETE FROM drafts WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════════════
//  USERS
// ══════════════════════════════════════════════════════════════════════════════

app.get("/api/users/:id", (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "Not found" });
  const artifacts = (db.prepare("SELECT COUNT(*) as c FROM comics WHERE author_id=? AND status='final'").get(req.params.id) as any).c;
  const mana      = (db.prepare("SELECT COALESCE(SUM(mana_count),0) as m FROM comics WHERE author_id=?").get(req.params.id) as any).m;
  const followers = (db.prepare("SELECT COUNT(*) as c FROM follows WHERE following_id=?").get(req.params.id) as any).c;
  const published = db.prepare("SELECT * FROM comics WHERE author_id=? AND status='final' ORDER BY created_at DESC").all(req.params.id);
  res.json({ ...(user as object), artifacts, mana, followers, published });
});

app.patch("/api/users/:id", (req, res) => {
  const { username, bio, rank } = req.body;
  db.prepare(`UPDATE users SET username=COALESCE(?,username), bio=COALESCE(?,bio), rank=COALESCE(?,rank) WHERE id=?`).run(username, bio, rank, req.params.id);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════════════
//  AI — ENHANCE SCENE
// ══════════════════════════════════════════════════════════════════════════════

app.post("/api/ai/enhance-scene", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt is required" });
  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a professional comic book writer. Enhance scene descriptions to be more cinematic and comic-book ready. Keep responses under 150 words. Return ONLY the enhanced text.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 300,
      temperature: 0.8,
    });
    res.json({ enhancedText: completion.choices[0]?.message?.content ?? prompt });
  } catch (e: any) {
    console.warn("Groq enhance-scene error:", e.message);
    res.json({ enhancedText: prompt }); // Silently fall back
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  KRAYON — AI COMIC GENERATION ENGINE  v2.0
//  ───────────────────────────────────────────────────────────────────────────
//  PROJECT CONTEXT (injected into AI system prompt):
//  Krayon is a next-generation AI manga/comic creation platform. Users give a
//  story concept, genre, and style — the AI writes the full manga script with
//  professional structure, cinematic camera direction, authentic dialogue bubbles
//  (speech/thought/shout/whisper/sfx), and produces manga-quality images via
//  NVIDIA NIM FLUX.2-Klein-4B.
//
//  FLOW:
//   User Input → Groq manga scriptwriter AI → structured panel scripts
//   panel scripts → genre-aware FLUX prompt builder → NVIDIA NIM images
//   all saved to SQLite + spec file → returned as complete comic
// ══════════════════════════════════════════════════════════════════════════════

/** ComicSpec: the structured JSON passed to/from Gemini */
interface ComicSpec {
  id: string;
  title: string;
  genre: string;
  style: string;
  prompt: string;
  panelCount: number;
  author_id: string;
  created_at: string;
  pages: SpecPage[];
}

interface SpecPage {
  page_number: number;
  layout: string;
  panels: SpecPanel[];
}

interface Bubble {
  character: string;  // Named character (e.g. "Ryuu", "UNIT-7") or "NARRATOR"
  type: "speech"      // oval bubble — normal spoken dialogue
    | "thought"       // cloud bubble with dots — internal monologue
    | "shout"         // jagged spiky starburst — battle cry, extreme emotion
    | "whisper"       // dashed outline oval — soft/secret speech, fear
    | "caption";      // rectangular box — narrator voice, time/place stamps
  text: string;       // The actual text content
}

interface SpecPanel {
  order: number;
  scene_description: string;   // What the image depicts
  caption: string | null;      // Narration text at top/bottom of panel
  dialogue: string | null;     // Legacy single-line dialogue (kept for compat)
  bubbles: Bubble[];           // NEW: rich multi-character dialogue
  sfx: string | null;          // Sound effect text e.g. "BOOM!"
  image_url: string;           // NVIDIA NIM FLUX.2-Klein-4B image (base64 data URI) or Pollinations fallback
}

// ── NVIDIA NIM FLUX.2-Klein-4B image generation ─────────────────────────────
const NVIDIA_NIM_ENDPOINT = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b";
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY ?? "";

/**
 * Build an expert FLUX prompt tuned for authentic manga/comic aesthetics per genre.
 * Formula (FLUX weights early tokens highest):
 *   [Subject+Action] → [Art Style] → [Lighting] → [Technique] → [Mood]
 */
function buildMangaImagePrompt(scene: string, style: string, genre: string): string {
  // Genre-specific visual DNA — what makes each genre look distinctive
  const genreArt: Record<string, { art: string; light: string; technique: string; mood: string }> = {
    "Shonen": {
      art:       "dynamic shonen manga panel, bold heavy ink outlines, high-contrast black and white illustration",
      light:     "dramatic rim lighting, intense directional backlight, deep shadow contrast",
      technique: "speed lines radiating from impact point, screentone texture on shadows, cross-hatching for depth, kinetic energy lines",
      mood:      "explosive raw power, intense determination, battle-hardened energy",
    },
    "Shojo": {
      art:       "delicate shojo manga style, fine elegant ink lines, soft flowing composition, expressive characters",
      light:     "soft warm diffused lighting, golden hour glow, gentle ethereal rim light",
      technique: "floral screentone background, sparkle dot-pattern texture, thin graceful linework, soft halftone gradients",
      mood:      "romantic tender atmosphere, emotional warmth, gentle and graceful feeling",
    },
    "Fantasy": {
      art:       "epic fantasy manga panel, richly detailed ink illustration, ornate world-building composition",
      light:     "dramatic mystical lighting, magical energy glow, chiaroscuro shadows, ethereal backlighting",
      technique: "intricate cross-hatching for texture, dense screentone layers, epic cinematic framing, detailed environment",
      mood:      "mythic grandeur, sense of wonder, heroic epic atmosphere",
    },
    "Sci-Fi": {
      art:       "cyberpunk manga panel, clean futuristic ink illustration, sleek technical linework, digital aesthetic",
      light:     "neon rim lighting with cyan and magenta hues, holographic glow effects, harsh industrial contrast",
      technique: "circuit-pattern screentones, geometric cross-hatching, perspective speed lines, HUD overlay elements",
      mood:      "cold dystopian tension, technological awe, cyberpunk atmosphere",
    },
    "Horror": {
      art:       "horror manga panel, heavy oppressive dark ink, unsettling composition, disturbing visual detail",
      light:     "single harsh light source casting long twisted shadows, extreme chiaroscuro, darkness consuming frame edges",
      technique: "dense heavy cross-hatching for shadow depth, solid black screentones, distortion lines, jagged edges",
      mood:      "suffocating dread, psychological terror, creeping supernatural darkness",
    },
    "Romance": {
      art:       "romance manga panel, soft expressive ink style, intimate close composition, heartfelt character art",
      light:     "warm golden soft lighting, gentle bokeh background glow, romantic twilight atmosphere",
      technique: "soft dot-pattern screentones, flowing graceful linework, blush rendering, tender intimate framing",
      mood:      "heartfelt emotion, tender intimacy, bittersweet longing",
    },
    "Action": {
      art:       "action manga panel, explosive dynamic ink illustration, high-energy kinetic composition",
      light:     "dramatic hard side lighting, impact flash effects, high contrast shadow play",
      technique: "dense speed lines, impact burst radiating lines, motion blur ink strokes, explosive screentone patterns",
      mood:      "raw adrenaline, explosive movement, unstoppable force",
    },
    "Slice of Life": {
      art:       "slice of life manga panel, clean casual ink style, warm authentic everyday composition",
      light:     "natural soft ambient daylight, cozy warm room lighting, gentle realistic shadows",
      technique: "light clean halftone screentones, minimal precise linework, expressive character faces, detailed background",
      mood:      "cozy authentic warmth, relatable human moment, nostalgic everyday feeling",
    },
  };

  // Style-specific art direction — how the overall rendering looks
  const styleGuide: Record<string, string> = {
    "American Comic": "American comic book art, bold cel-shaded colors, thick black outlines, Marvel and DC heroic aesthetic, dynamic perspective",
    "Manga":          "authentic Japanese manga, crisp black and white ink, professional Shueisha or Kodansha publication quality, clean screentones",
    "Manhwa":         "Korean manhwa webtoon style, full-color digital painting, clean modern art style, vertical scroll composition",
    "European Comic": "Franco-Belgian bande dessinée, ligne claire clean precise lines, rich detailed colors, Moebius and Tintin aesthetic",
    "Chibi":          "super-deformed chibi manga, cute exaggerated large-head proportions, playful simple rounded linework, adorable expression",
    "Noir":           "noir comic, stark high-contrast monochrome, heavy oppressive shadow, Frank Miller Sin City aesthetic, film noir atmosphere",
  };

  const gp = genreArt[genre] ?? genreArt["Action"];
  const sd = styleGuide[style] ?? `${style} comic art, professional illustration`;

  return [
    scene,           // Subject + action FIRST — highest FLUX weight
    gp.art,          // Art style identity
    sd,              // Style-specific rendering direction
    gp.light,        // Lighting
    gp.technique,    // Manga-specific visual techniques
    gp.mood,         // Atmosphere
    "single panel composition, no text overlays, no speech bubbles visible, no panel borders within image",
    "high definition, sharp crisp focus, professional manga publication quality",
  ].join(", ");
}

/**
 * Generate a comic panel image via NVIDIA NIM FLUX.2-Klein-4B.
 * Returns a base64 data URI (data:image/jpeg;base64,...) on success.
 * Falls back to Pollinations if key missing or call fails.
 */
async function generatePanelImage(
  scene: string, style: string, genre: string, seed: number
): Promise<string> {
  const prompt = buildMangaImagePrompt(scene, style, genre);

  if (NVIDIA_API_KEY) {
    try {
      const resp = await fetch(NVIDIA_NIM_ENDPOINT, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${NVIDIA_API_KEY}`,
          "accept": "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({ prompt, width: 1024, height: 1024, steps: 4, seed: seed % 2147483647, cfg_scale: 1, samples: 1 }),
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => resp.statusText);
        throw new Error(`NVIDIA NIM ${resp.status}: ${errText.slice(0, 200)}`);
      }

      const data = await resp.json() as { artifacts?: Array<{ base64: string; finishReason: string; seed: number }> };
      const b64 = data.artifacts?.[0]?.base64;

      if (b64) {
        console.log(`✅ NVIDIA NIM [${genre}/${style}] image OK (seed=${seed})`);
        return `data:image/jpeg;base64,${b64}`;
      }
      throw new Error("NVIDIA NIM: empty artifacts");
    } catch (e: any) {
      console.warn(`⚠️  NVIDIA NIM failed (${e.message}) — Pollinations fallback`);
    }
  } else {
    console.warn("⚠️  NVIDIA_API_KEY not set — Pollinations fallback");
  }

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=512&nologo=1&model=flux&seed=${seed}`;
}

/**
 * KRAYON-SENSEI — The Manga AI Brain
 * Generates structured comic pages using professional manga scripting knowledge.
 * Uses Groq (llama-3.3-70b) as the manga scriptwriter with expert context.
 */
async function generateComicStructure(spec: {
  title: string; genre: string; style: string;
  prompt: string; panelCount: number;
}): Promise<{ pages: SpecPage[]; characters: string[] }> {
  const panelsPerPage = 4;
  const totalPages = Math.ceil(spec.panelCount / panelsPerPage);
  const totalPanels = totalPages * panelsPerPage;

  interface AiPanel {
    scene: string;
    caption: string | null;
    dialogue: string | null;
    bubbles: Bubble[];
    sfx: string | null;
    panel_type: string;
  }
  let aiPanels: AiPanel[] = [];
  let characters: string[] = [];

  try {
    // ── KRAYON-SENSEI: The manga scriptwriter AI brain ────────────────────────
    const systemPrompt = `You are KRAYON-SENSEI, the expert manga scriptwriter AI for the Krayon platform — a professional AI-powered manga creation app.

YOUR ROLE: You write professional manga/comic scripts that will be rendered by an AI image model (NVIDIA FLUX.2-Klein-4B). Your scene descriptions are sent directly to the image AI, so they must be precise, cinematic, and painterly — as if directing a real manga artist.

PROFESSIONAL MANGA VISUAL LANGUAGE you must apply:

1. NARRATIVE ARC (enforce strictly):
   - ACT 1 — ESTABLISH: Wide shots, set the world, introduce protagonist. Mood-setting captions.
   - ACT 2 — INCITING MOMENT: Something disrupts peace. Conflict or antagonist introduced.
   - ACT 3 — RISING TENSION: Character reacts, makes a choice. Internal struggle (thought bubble).
   - ACT 4 — CLIMAX: Peak action or emotional peak. Maximum SFX. Most dynamic camera.
   - ACT 5 — TURNING POINT: Unexpected twist or revelation. Close-up on reaction face.
   - ACT 6 — RESOLUTION: Consequence shown. Thematic closing caption. Final mood.

2. CAMERA VOCABULARY (use these exact abbreviations in scene field):
   ELS = Extreme Long Shot (epic scale, tiny figures)
   WS = Wide Shot (full figures + environment)
   MS = Medium Shot (waist-up, dialogue)
   MCU = Medium Close-Up (chest-up, tension)
   CU = Close-Up (face only, emotion)
   ECU = Extreme Close-Up (eyes/hands/weapon, maximum intensity)
   LA = Low Angle (upward — power, dominance, heroism)
   HA = High Angle (downward — vulnerability, overview)
   OTS = Over The Shoulder (confrontation framing)
   POV = Point of View (reader sees through character's eyes)
   DT = Dutch Tilt (diagonal frame — chaos, madness, unease)

3. PANEL PACING RULES:
   - NEVER repeat same camera angle twice in a row
   - Rhythm: action → reaction → dialogue → action
   - 30% panels should be SILENT (no bubbles, pure visual)
   - Max 2 bubbles per panel — never more
   - SFX scale: whisper="tick", medium="CRACK!", climax="KRAKOOOOM!!!"
   - Establish with WS/ELS, build to MCU/CU, climax with LA+ECU

4. BUBBLE TYPE SYSTEM:
   "speech" = oval — normal spoken dialogue
   "thought" = cloud with dots — internal monologue only (never spoken)
   "shout" = jagged spiky burst — battle cry, rage, extreme shock (max 1 per page)
   "whisper" = dashed oval — secrets, weakness, fear, quiet voice
   "caption" = rectangular box — narrator, time stamps, location, thematic lines

5. MANGA VISUAL EFFECTS (describe in scene field for image AI):
   - "speed lines radiating from [point]" — motion, impact
   - "focus lines converging on [subject]" — attention, tension
   - "dark vertical gloom lines surrounding character" — despair, dread
   - "crackling energy aura emanating from character" — power, rage
   - "kinetic motion blur trailing [body part]" — fast movement
   - "dramatic screentone shadow patterns" — dark atmosphere

6. CHARACTER RULES:
   - Give every character a strong memorable NAME in their first appearance
   - Describe their appearance consistently every time (same hair, outfit, features)
   - Use character names in ALL bubble "character" fields — never "unknown"
   - Describe returning characters identically each panel (visual consistency for image AI)

OUTPUT: Respond with ONLY valid JSON — no markdown fences, no explanation.
Format: { "characters": ["Name1 — description", "Name2 — description"], "panels": [...] }
Each panel: { "scene": "CAMERA: visual description 20-35 words", "caption": string|null, "bubbles": [{character, type, text}], "sfx": string|null, "panel_type": "establishing"|"action"|"dialogue"|"reaction"|"splash" }`;

    const genreRules: Record<string, string> = {
      "Shonen":       "Include named special attack (shout type). 2+ panels with speed lines. Low-angle for hero power. Moment of doubt → overcome. Power-of-friendship theme.",
      "Shojo":        "2+ thought bubbles for internal emotion. 1 silent face panel. Floral/sparkle imagery in backgrounds. Poetic introspective captions. Build through near-misses.",
      "Horror":       "Slow calm opening, dread builds gradually. ECU on disturbing detail. Several silent panels. Final panel unresolved/disturbing. Minimal dialogue, maximum dread.",
      "Sci-Fi":       "Technical/robotic speech patterns. HUD displays and holographic screens in visuals. Dutch tilt in dystopian moments. POV through visor/screen.",
      "Fantasy":      "Open with ELS epic world establishing shot. Magic described as visual phenomena. 1 heroic LA shot. Archaic/epic dialogue register.",
      "Romance":      "2+ CU panels on eyes/faces. Long thought bubbles for feelings. Warm lighting environments. Build through proximity and eye contact.",
      "Action":       "Dense SFX throughout. Multiple DT shots. Speed lines in 2+ panels. Clear power dynamic between characters.",
      "Slice of Life": "Natural realistic dialogue. Background environments matter. Quiet emotional moments. No large SFX. Warmth through small details.",
    };

    const userPrompt = `COMIC BRIEF:
Title: "${spec.title}"
Genre: ${spec.genre}
Art Style: ${spec.style}
Story Concept: ${spec.prompt}
Total Panels: ${totalPanels} (${totalPages} page${totalPages > 1 ? "s" : ""}, ${panelsPerPage} panels each)

GENRE RULES for ${spec.genre}: ${genreRules[spec.genre] ?? "Create a compelling story with varied pacing."}

NARRATIVE ARC (distribute across ${totalPanels} panels):
- Panels 1-${Math.max(1, Math.ceil(totalPanels * 0.2))}: ACT 1 — Establish world + protagonist (use ELS/WS)
- Panels ${Math.max(2, Math.ceil(totalPanels * 0.2) + 1)}-${Math.ceil(totalPanels * 0.35)}: ACT 2 — Inciting moment, conflict appears
- Panels ${Math.ceil(totalPanels * 0.35) + 1}-${Math.ceil(totalPanels * 0.55)}: ACT 3 — Rising tension, stakes escalate
- Panels ${Math.ceil(totalPanels * 0.55) + 1}-${Math.ceil(totalPanels * 0.72)}: ACT 4 — CLIMAX — peak intensity (most dynamic)
- Panels ${Math.ceil(totalPanels * 0.72) + 1}-${Math.ceil(totalPanels * 0.86)}: ACT 5 — Twist/revelation (CU reaction)
- Panels ${Math.ceil(totalPanels * 0.86) + 1}-${totalPanels}: ACT 6 — Resolution + thematic close

EXAMPLE PERFECT PANEL:
{"scene":"LA: Ryuu — silver-haired warrior in torn black gi — fist raised skyward, energy crackling outward, speed lines radiating, explosion lighting behind him","caption":null,"bubbles":[{"character":"Ryuu","type":"shout","text":"PHANTOM BLADE — FINAL STRIKE!!!"}],"sfx":"KRAKOOOOM!!!","panel_type":"splash"}

Now write the complete "${spec.title}" manga script as JSON:`;

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt },
      ],
      max_tokens: 6000,
      temperature: 0.85,
    });

    const raw = (completion.choices[0]?.message?.content ?? "").trim()
      .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(raw);

    // Handle both {characters, panels} object AND legacy array format
    const panelArray = Array.isArray(parsed) ? parsed : (parsed?.panels ?? parsed);
    if (parsed?.characters) characters = parsed.characters;

    if (Array.isArray(panelArray)) {
      aiPanels = panelArray.slice(0, totalPanels).map((p: any) => ({
        scene:    String(p.scene || p.description || ""),
        caption:  p.caption ?? null,
        dialogue: p.dialogue ?? (p.bubbles?.[0]?.text ?? null),
        bubbles:  Array.isArray(p.bubbles) ? p.bubbles.map((b: any) => ({
          character: String(b.character || "NARRATOR"),
          type:      ["speech","thought","shout","whisper","caption"].includes(b.type) ? b.type : "speech",
          text:      String(b.text || ""),
        })) : [],
        sfx:        p.sfx ?? null,
        panel_type: p.panel_type ?? "action",
      }));
      console.log(`✅ KRAYON-SENSEI generated ${aiPanels.length} panels | Characters: ${characters.join(", ") || "parsed from panels"}`);
    }
  } catch (e: any) {
    console.warn(`⚠️  Groq unavailable (${e.message ?? "err"}) — using auto-generation`);
  }

  // ── Fallback: auto-generation from prompt ────────────────────────────────
  if (aiPanels.length < totalPanels) {
    const sentences = spec.prompt.replace(/[.!?]\s+/g, "||").split("||").map(s => s.trim()).filter(Boolean);
    const angles  = ["Wide establishing shot","Close-up shot","Medium shot","Over-the-shoulder shot","Low-angle shot","Bird's-eye view","Dramatic close-up"];
    const captions = ["The story begins...","Meanwhile...","Suddenly...","In the shadows...","Time stood still.","And so it goes...","The truth revealed.","No turning back now."];
    while (aiPanels.length < totalPanels) {
      const i = aiPanels.length;
      const sentence = sentences[i % sentences.length] ?? spec.prompt.slice(0, 80);
      aiPanels.push({
        scene:      `${angles[i % angles.length]}: ${sentence} — ${spec.genre} atmosphere, ${spec.style} art style`,
        caption:    i % 3 === 0 ? captions[i % captions.length] : null,
        dialogue:   null,
        bubbles:    [],
        sfx:        null,
        panel_type: i === 0 ? "establishing" : i === Math.floor(totalPanels * 0.6) ? "splash" : "action",
      });
    }
  }

  // ── Generate images via NVIDIA NIM (with Pollinations fallback) and group into pages ──
  const seed = Math.floor(Math.random() * 99999);
  const pages: SpecPage[] = [];
  for (let p = 0; p < totalPages; p++) {
    const pagePanels: SpecPanel[] = [];
    for (let j = 0; j < panelsPerPage; j++) {
      const idx = p * panelsPerPage + j;
      const ap = aiPanels[idx];
      // generatePanelImage is async — await each image (NVIDIA NIM is synchronous per request)
      const imageUrl = await generatePanelImage(ap.scene, spec.style, spec.genre, seed + idx);
      pagePanels.push({
        order:             j,
        scene_description: ap.scene,
        caption:           ap.caption,
        dialogue:          ap.dialogue,
        bubbles:           ap.bubbles ?? [],
        sfx:               ap.sfx ?? null,
        image_url:         imageUrl,
      });
    }
    pages.push({ page_number: p + 1, layout: "grid-2x2", panels: pagePanels });
  }

  return { pages, characters };
}

// POST /api/ai/generate-and-save
// Body: { title, genre, style, prompt, panelCount, author_id? }
// Returns: { comicId, specId, pages }
app.post("/api/ai/generate-and-save", async (req, res) => {
  const {
    title = "Untitled Comic",
    genre = "Fantasy",
    style = "American Comic",
    prompt,
    panelCount = 4,
    author_id = "u1",
  } = req.body;

  if (!prompt) return res.status(400).json({ error: "prompt is required" });

  try {
    // Step 1: Generate comic structure
    const { pages, characters } = await generateComicStructure({ title, genre, style, prompt, panelCount });
    console.log(`📚 Comic characters: ${characters.join(", ") || "(from story)"}`);

    // Step 2: Build the full ComicSpec JSON for record-keeping
    const specId  = `spec_${uid()}`;
    const comicId = `c_${uid()}`;
    const spec: ComicSpec = {
      id: specId, title, genre, style, prompt, panelCount,
      author_id, created_at: new Date().toISOString(), pages,
    };

    // Step 3: Save spec to file and DB
    const specFilePath = path.join(SPECS_DIR, `${specId}.json`);
    fs.writeFileSync(specFilePath, JSON.stringify(spec, null, 2));

    // Step 4: Persist everything to SQLite in a single transaction
    const save = db.transaction(() => {
      // Create the comic record
      db.prepare(`INSERT INTO comics (id, title, author_id, genre, style, concept, status, badge) VALUES (?, ?, ?, ?, ?, ?, 'final', 'NEW DROP')`).run(comicId, title, author_id, genre, style, prompt);

      // Store the spec reference
      db.prepare(`INSERT INTO comic_specs (id, comic_id, spec_json) VALUES (?, ?, ?)`).run(specId, comicId, JSON.stringify(spec));

      // Insert pages and panels
      for (const page of pages) {
        const pageId = `pg_${uid()}`;
        db.prepare(`INSERT INTO pages (id, comic_id, page_number, layout) VALUES (?, ?, ?, ?)`).run(pageId, comicId, page.page_number, page.layout);

        for (const panel of page.panels) {
          db.prepare(
            `INSERT INTO panels (id, page_id, panel_order, image_url, caption, dialogue, panel_type, bubbles_json, sfx)
             VALUES (?, ?, ?, ?, ?, ?, 'normal', ?, ?)`
          ).run(
            `pn_${uid()}`,
            pageId,
            panel.order,
            panel.image_url,
            panel.caption ?? null,
            panel.dialogue ?? null,
            panel.bubbles?.length ? JSON.stringify(panel.bubbles) : null,
            (panel as any).sfx ?? null
          );
        }
      }
    });

    save();
    console.log(`✅ Comic saved: ${comicId} (spec: ${specId})`);

    res.status(201).json({ comicId, specId, title, genre, style, pages });
  } catch (err: any) {
    console.error("generate-and-save error:", err);
    res.status(500).json({ error: err.message ?? "Generation failed" });
  }
});

// GET /api/comics/:id/read — returns comic + pages + panels for Reader
app.get("/api/comics/:id/read", (req, res) => {
  const comic = db.prepare(`SELECT c.*, u.username as author_name FROM comics c JOIN users u ON u.id = c.author_id WHERE c.id = ?`).get(req.params.id);
  if (!comic) return res.status(404).json({ error: "Comic not found" });

  const pages = db.prepare(`SELECT * FROM pages WHERE comic_id = ? ORDER BY page_number`).all(req.params.id);
  const result = (pages as any[]).map((page) => ({
    ...page,
    panels: (db.prepare(`SELECT * FROM panels WHERE page_id = ? ORDER BY panel_order`).all(page.id) as any[]).map(panel => ({
      ...panel,
      bubbles: panel.bubbles_json ? JSON.parse(panel.bubbles_json) : [],
    })),
  }));

  // Also return the spec if it exists
  const spec = db.prepare(`SELECT spec_json FROM comic_specs WHERE comic_id = ?`).get(req.params.id) as any;

  res.json({ comic, pages: result, spec: spec ? JSON.parse(spec.spec_json) : null });
});

// GET /api/specs/:id — get a specific spec JSON
app.get("/api/specs/:id", (req, res) => {
  const row = db.prepare(`SELECT * FROM comic_specs WHERE id = ?`).get(req.params.id) as any;
  if (!row) return res.status(404).json({ error: "Spec not found" });
  res.json(JSON.parse(row.spec_json));
});

// ══════════════════════════════════════════════════════════════════════════════
//  HEALTH
// ══════════════════════════════════════════════════════════════════════════════
app.get("/api/health", (_req, res) => res.json({ status: "ok", db: DB_PATH }));

app.listen(PORT, () => {
  console.log(`\n🚀 KRAYON API running → http://localhost:${PORT}/api/health`);
  console.log(`📦 Database          → ${DB_PATH}`);
  console.log(`📁 Specs dir         → ${SPECS_DIR}\n`);
});
