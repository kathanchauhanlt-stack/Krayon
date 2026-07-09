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
import { GoogleGenAI } from "@google/genai";

dotenv.config({ path: ".env.local" });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH   = path.join(__dirname, "ainime.db");

// ── Open / create database ──────────────────────────────────────────────────
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");   // faster concurrent reads
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
    status       TEXT NOT NULL DEFAULT 'draft',   -- 'draft' | 'final'
    badge        TEXT NOT NULL DEFAULT 'WORK IN PROGRESS',
    mana_count   INTEGER NOT NULL DEFAULT 0,
    remix_count  INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pages (
    id           TEXT PRIMARY KEY,
    comic_id     TEXT NOT NULL REFERENCES comics(id) ON DELETE CASCADE,
    page_number  INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS panels (
    id           TEXT PRIMARY KEY,
    page_id      TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    panel_order  INTEGER NOT NULL DEFAULT 0,
    image_url    TEXT,
    dialogue     TEXT,
    caption      TEXT,
    panel_type   TEXT DEFAULT 'normal',   -- 'normal' | 'accent' | 'wide'
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
    locked       INTEGER NOT NULL DEFAULT 0,   -- 0=false, 1=true
    pages_count  INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── Seed demo data (only if tables are empty) ───────────────────────────────
const userCount = (db.prepare("SELECT COUNT(*) as c FROM users").get() as any).c;
if (userCount === 0) {
  const insertUser = db.prepare(`
    INSERT INTO users (id, username, rank, bio, avatar_url)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertComic = db.prepare(`
    INSERT INTO comics (id, title, author_id, cover_url, genre, style, concept, status, badge, mana_count, remix_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertDraft = db.prepare(`
    INSERT INTO drafts (id, user_id, title, genre, style, progress, locked, pages_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Users
  insertUser.run("u1", "ZeroX",   "Grand Architect",    "Weaving realities from the void.", null);
  insertUser.run("u2", "Luna_Dev","Adept Weaver",        "Dreamscaper and pixel architect.", null);
  insertUser.run("u3", "Chronos", "Grand Architect",    "Time bends for no one but me.",   null);
  insertUser.run("u4", "BrassCog","Novice Chronicler",  "Gears and steam, always.",        null);
  insertUser.run("u5", "RedSeal", "Master Illusionist", "Crimson ink flows eternal.",       null);

  // Comics
  const comics = [
    ["c1","Neon Ronin: Echoes of Neo-Kyoto","u1","https://images.unsplash.com/photo-1578632292335-df3abbb0d586?q=80&w=800","Cyberpunk","Manga","A ronin navigates a neon-soaked dystopia","final","EPIC FINALE",1240,88],
    ["c2","Aetheria: The Floating Spire","u2","https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=800","Fantasy","American Comic","A mage discovers a city adrift in the clouds","draft","WORK IN PROGRESS",856,42],
    ["c3","Void Walker: Singularity","u3","https://images.unsplash.com/photo-1614728263952-84ea206f99b6?q=80&w=800","Sci-Fi","Noir","An entity crosses the boundary of dimensions","final","TRENDING",3200,245],
    ["c4","Steam Heart","u4","https://images.unsplash.com/photo-1589149098258-3e9102ca63d3?q=80&w=800","Noir","Webtoon","Love between a clockmaker and an automaton","draft","WORK IN PROGRESS",450,15],
    ["c5","Crimson Mandate","u5","https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=800","Fantasy","Painted","A blood pact that shattered an empire","final","NEW DROP",720,34],
    ["c6","Ghost Protocol Omega","u1","https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?q=80&w=800","Cyberpunk","American Comic","Ghosts of the net rise against their creators","final","EPIC FINALE",1900,112],
  ];
  for (const c of comics) insertComic.run(...c as any);

  // Drafts for ZeroX (u1)
  insertDraft.run("d1","u1","The Ruined Spires","Fantasy","Painted",65,1,12);
  insertDraft.run("d2","u1","Cyber-Soul 2099","Cyberpunk","Manga",12,0,3);
  insertDraft.run("d3","u1","Witch of the Red Glade","Horror","Webtoon",98,1,22);
  insertDraft.run("d4","u1","Iron Meridian","Sci-Fi","American Comic",44,0,8);

  console.log("✅ Database seeded with demo data");
}

// ── Express app ─────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.API_PORT ?? 3001;

app.use(cors({ origin: "*" }));
app.use(express.json());

// ─── helper: generate a short ID ───────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);

// ══════════════════════════════════════════════════════════════════════════════
//  COMICS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/comics?status=final|draft&genre=X&search=X
app.get("/api/comics", (req, res) => {
  const { status, genre, search } = req.query;
  let sql = `
    SELECT c.*, u.username as author_name
    FROM comics c
    JOIN users u ON u.id = c.author_id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (status) { sql += " AND c.status = ?"; params.push(status); }
  if (genre)  { sql += " AND c.genre  = ?"; params.push(genre); }
  if (search) { sql += " AND (c.title LIKE ? OR u.username LIKE ?)"; params.push(`%${search}%`, `%${search}%`); }
  sql += " ORDER BY c.mana_count DESC";
  res.json(db.prepare(sql).all(...params));
});

// GET /api/comics/:id
app.get("/api/comics/:id", (req, res) => {
  const comic = db.prepare(`
    SELECT c.*, u.username as author_name
    FROM comics c JOIN users u ON u.id = c.author_id
    WHERE c.id = ?
  `).get(req.params.id);
  if (!comic) return res.status(404).json({ error: "Not found" });
  res.json(comic);
});

// POST /api/comics  — create a new comic (from Forge)
app.post("/api/comics", (req, res) => {
  const { title, author_id = "u1", cover_url, genre, style, concept, status = "draft" } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });
  const id = `c_${uid()}`;
  const badge = status === "final" ? "EPIC FINALE" : "WORK IN PROGRESS";
  db.prepare(`
    INSERT INTO comics (id, title, author_id, cover_url, genre, style, concept, status, badge)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, author_id, cover_url ?? null, genre ?? "Fantasy", style ?? "American Comic", concept ?? null, status, badge);
  res.status(201).json({ id });
});

// PATCH /api/comics/:id  — publish / update
app.patch("/api/comics/:id", (req, res) => {
  const { title, cover_url, genre, style, concept, status } = req.body;
  const badge = status === "final" ? "EPIC FINALE" : "WORK IN PROGRESS";
  db.prepare(`
    UPDATE comics
    SET title=COALESCE(?,title), cover_url=COALESCE(?,cover_url),
        genre=COALESCE(?,genre), style=COALESCE(?,style),
        concept=COALESCE(?,concept), status=COALESCE(?,status), badge=?
    WHERE id=?
  `).run(title, cover_url, genre, style, concept, status, badge, req.params.id);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════════════
//  MANA (likes)
// ══════════════════════════════════════════════════════════════════════════════

// POST /api/comics/:id/mana  — toggle like (user hardcoded as u1 for now)
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

// GET /api/comics/:id/mana?user_id=X
app.get("/api/comics/:id/mana", (req, res) => {
  const { user_id = "u1" } = req.query;
  const liked = !!db.prepare("SELECT id FROM mana WHERE user_id=? AND comic_id=?").get(user_id, req.params.id);
  const count = (db.prepare("SELECT mana_count FROM comics WHERE id=?").get(req.params.id) as any)?.mana_count ?? 0;
  res.json({ liked, count });
});

// ══════════════════════════════════════════════════════════════════════════════
//  DRAFTS (Vault)
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/drafts?user_id=X
app.get("/api/drafts", (req, res) => {
  const { user_id = "u1" } = req.query;
  res.json(db.prepare("SELECT * FROM drafts WHERE user_id=? ORDER BY updated_at DESC").all(user_id));
});

// POST /api/drafts  — save draft from Forge
app.post("/api/drafts", (req, res) => {
  const { title, user_id = "u1", genre, style, concept } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });
  const id = `d_${uid()}`;
  db.prepare(`
    INSERT INTO drafts (id, user_id, title, genre, style, concept)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, user_id, title, genre ?? "Fantasy", style ?? "American Comic", concept ?? null);
  res.status(201).json({ id });
});

// PATCH /api/drafts/:id
app.patch("/api/drafts/:id", (req, res) => {
  const { progress, locked, pages_count, title, concept } = req.body;
  db.prepare(`
    UPDATE drafts
    SET progress=COALESCE(?,progress), locked=COALESCE(?,locked),
        pages_count=COALESCE(?,pages_count), title=COALESCE(?,title),
        concept=COALESCE(?,concept), updated_at=datetime('now')
    WHERE id=?
  `).run(progress, locked, pages_count, title, concept, req.params.id);
  res.json({ ok: true });
});

// DELETE /api/drafts/:id
app.delete("/api/drafts/:id", (req, res) => {
  db.prepare("DELETE FROM drafts WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════════════
//  USERS / GUILD
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/users/:id
app.get("/api/users/:id", (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "Not found" });
  const artifacts = (db.prepare("SELECT COUNT(*) as c FROM comics WHERE author_id=? AND status='final'").get(req.params.id) as any).c;
  const mana      = (db.prepare("SELECT COALESCE(SUM(mana_count),0) as m FROM comics WHERE author_id=?").get(req.params.id) as any).m;
  const followers = (db.prepare("SELECT COUNT(*) as c FROM follows WHERE following_id=?").get(req.params.id) as any).c;
  const published = db.prepare("SELECT * FROM comics WHERE author_id=? AND status='final' ORDER BY created_at DESC").all(req.params.id);
  res.json({ ...(user as object), artifacts, mana, followers, published });
});

// PATCH /api/users/:id
app.patch("/api/users/:id", (req, res) => {
  const { username, bio, rank } = req.body;
  db.prepare(`
    UPDATE users SET username=COALESCE(?,username), bio=COALESCE(?,bio), rank=COALESCE(?,rank) WHERE id=?
  `).run(username, bio, rank, req.params.id);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════════════
//  AI PROXIES (GEMINI)
// ══════════════════════════════════════════════════════════════════════════════

// POST /api/ai/enhance-scene
app.post("/api/ai/enhance-scene", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt is required" });

  const systemInstruction =
    "You are a professional comic book writer and visual artist. Enhance this scene description to be more cinematic, visual, and comic-book ready. Keep it under 150 words. Return ONLY the enhanced text, no labels or explanations.";

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${systemInstruction}\n\n${prompt}`,
    });
    res.json({ enhancedText: result.text ?? prompt });
  } catch (error: any) {
    console.error("Gemini enhanceScenePrompt error:", error);
    res.status(500).json({ error: error.message ?? "Gemini error" });
  }
});

// POST /api/ai/generate-panels
app.post("/api/ai/generate-panels", async (req, res) => {
  const { scene, genre, style, title } = req.body;
  if (!scene) return res.status(400).json({ error: "scene is required" });

  const systemInstruction = `You are a professional comic book writer. 
Comic title: "${title || "Untitled"}". Genre: ${genre || "Fantasy"}. Art style: ${style || "American Comic"}.
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
    const lines = raw
      .split(/\n/)
      .map((l) => l.replace(/^\d+\.\s*/u, "").trim())
      .filter((l) => l.length > 0);

    while (lines.length < 4) {
      lines.push(`Panel ${lines.length + 1}: The scene continues...`);
    }
    res.json({ panels: lines.slice(0, 4) });
  } catch (error: any) {
    console.error("Gemini generatePanelDescriptions error:", error);
    res.status(500).json({ error: error.message ?? "Gemini error" });
  }
});

// POST /api/ai/generate-dialogue
app.post("/api/ai/generate-dialogue", async (req, res) => {
  const { panelContext, character } = req.body;
  if (!panelContext || !character) {
    return res.status(400).json({ error: "panelContext and character are required" });
  }

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
    const words = text.split(/\s+/);
    res.json({ dialogue: words.slice(0, 12).join(" ") });
  } catch (error: any) {
    console.error("Gemini generateDialogue error:", error);
    res.status(500).json({ error: error.message ?? "Gemini error" });
  }
});

// GET /api/ai/stream-scene
app.get("/api/ai/stream-scene", async (req, res) => {
  const { prompt } = req.query;
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "prompt query param is required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const systemInstruction =
    "You are a professional comic book writer and visual artist. Enhance this scene description to be more cinematic, visual, and comic-book ready. Keep it under 150 words. Return ONLY the enhanced text, no labels or explanations.";

  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: `${systemInstruction}\n\n${prompt}`,
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("Gemini streamSceneEnhancement error:", error);
    res.write(`data: ${JSON.stringify({ error: "AI Enhancement unavailable" })}\n\n`);
    res.end();
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  HEALTH
// ══════════════════════════════════════════════════════════════════════════════
app.get("/api/health", (_req, res) => res.json({ status: "ok", db: DB_PATH }));

app.listen(PORT, () => {
  console.log(`\n🚀 KRAYON API running → http://localhost:${PORT}/api/health`);
  console.log(`📦 Database          → ${DB_PATH}\n`);
});
