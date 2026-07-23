/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  KRAYON — Pipeline Express Router
 * ───────────────────────────────────────────────────────────────────────────────
 *  Exposes the Light Novel → Comic pipeline as REST endpoints.
 *  Mounted at /api/pipeline in the main server.
 *
 *  Endpoints:
 *    POST /api/pipeline/create-project   — Create a new pipeline project
 *    POST /api/pipeline/generate-novel   — Run the Novelist Agent
 *    POST /api/pipeline/generate-panels  — Run the Storyboarder Agent
 *    POST /api/pipeline/render-panel     — Render a single panel image
 *    POST /api/pipeline/render-all       — Render all pending panels
 *    GET  /api/pipeline/project/:id      — Read a project from Firebase
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Router } from "express";
import OpenAI from "openai";
import { fbGet, fbSet, fbUpdate, generatePushId } from "../services/firebaseRest.js";
import { generateLightNovel } from "../services/novelistService.js";
import { generateComicPanels } from "../services/storyboarderService.js";
import { renderPanel } from "../services/rendererService.js";

// ── Lazy-init Groq client (avoids ESM import hoisting timing issue) ─────────

let _groq: OpenAI | null = null;
function getGroq(): OpenAI {
  if (!_groq) {
    _groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY ?? "",
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return _groq;
}

const GROQ_MODEL = "llama-3.3-70b-versatile";

// ── Router ──────────────────────────────────────────────────────────────────

const router = Router();

// ══════════════════════════════════════════════════════════════════════════════
//  POST /create-project — Create a new pipeline project in Firebase RTDB
// ══════════════════════════════════════════════════════════════════════════════

router.post("/create-project", async (req, res) => {
  try {
    const {
      title = "Untitled Project",
      genre = "Fantasy",
      style = "Manga",
      prompt = "",
      characters = {},
      owner_id = "u1",
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const projectId = `proj_${generatePushId()}`;
    const now = Date.now();

    // Build characters map with proper IDs
    const characterMap: Record<string, any> = {};
    if (typeof characters === "object" && !Array.isArray(characters)) {
      // Already keyed by ID
      Object.assign(characterMap, characters);
    } else if (Array.isArray(characters)) {
      // Convert array to keyed map
      for (const char of characters) {
        const charId = `char_${(char.name || "unknown").toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
        characterMap[charId] = {
          name: char.name || "Unknown",
          lora_id: char.lora_id || "",
          trigger_word: char.trigger_word || "",
          visual_description: char.visual_description || "",
        };
      }
    }

    const project = {
      metadata: {
        title,
        genre,
        global_style: style,
        created_at: now,
        updated_at: now,
        status: "idle",
        owner_id,
      },
      light_novel: {
        raw_prompt: prompt,
        scenes: {},
      },
      characters: characterMap,
      comic_panels: {},
    };

    await fbSet(`projects/${projectId}`, project);
    console.log(`✅ PIPELINE: Project created → ${projectId}`);

    res.status(201).json({ projectId, title });
  } catch (err: any) {
    console.error("Pipeline create-project error:", err);
    res.status(500).json({ error: err.message ?? "Failed to create project" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  POST /generate-novel — Run the Novelist Agent (Groq)
// ══════════════════════════════════════════════════════════════════════════════

router.post("/generate-novel", async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: "projectId is required" });

    // Read project from Firebase
    const project = await fbGet<any>(`projects/${projectId}`);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const rawPrompt = project.light_novel?.raw_prompt || "";
    if (!rawPrompt) return res.status(400).json({ error: "Project has no raw_prompt" });

    const genre = project.metadata?.genre || "Fantasy";
    const style = project.metadata?.global_style || "Manga";

    // Update status → generating_novel
    await fbUpdate(`projects/${projectId}/metadata`, {
      status: "generating_novel",
      updated_at: Date.now(),
    });

    // Call Novelist Agent
    const { lightNovel } = await generateLightNovel(
      getGroq(), GROQ_MODEL, rawPrompt, genre, style,
    );

    // Save Light Novel to Firebase
    await fbSet(`projects/${projectId}/light_novel`, lightNovel);

    // Update status → idle (ready for next step)
    await fbUpdate(`projects/${projectId}/metadata`, {
      status: "idle",
      updated_at: Date.now(),
    });

    const sceneCount = Object.keys(lightNovel.scenes).length;
    console.log(`✅ PIPELINE: Novel saved → ${sceneCount} scenes`);

    res.json({ ok: true, sceneCount, scenes: lightNovel.scenes });
  } catch (err: any) {
    console.error("Pipeline generate-novel error:", err);

    // Try to set error status
    try {
      const { projectId } = req.body;
      if (projectId) {
        await fbUpdate(`projects/${projectId}/metadata`, {
          status: "error",
          error_message: err.message,
          updated_at: Date.now(),
        });
      }
    } catch { /* ignore */ }

    res.status(500).json({ error: err.message ?? "Novel generation failed" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  POST /generate-panels — Run the Storyboarder Agent (Groq)
// ══════════════════════════════════════════════════════════════════════════════

router.post("/generate-panels", async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: "projectId is required" });

    // Read project from Firebase
    const project = await fbGet<any>(`projects/${projectId}`);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const lightNovel = project.light_novel;
    if (!lightNovel?.scenes || Object.keys(lightNovel.scenes).length === 0) {
      return res.status(400).json({ error: "No Light Novel scenes found. Generate the novel first." });
    }

    const characters = project.characters || {};
    const genre = project.metadata?.genre || "Fantasy";
    const style = project.metadata?.global_style || "Manga";

    // Update status → generating_panels
    await fbUpdate(`projects/${projectId}/metadata`, {
      status: "generating_panels",
      updated_at: Date.now(),
    });

    // Call Storyboarder Agent
    const panelMap = await generateComicPanels(
      getGroq(), GROQ_MODEL, lightNovel, characters, genre, style,
    );

    // Save panels to Firebase
    await fbSet(`projects/${projectId}/comic_panels`, panelMap);

    // Update status → idle (ready for rendering)
    await fbUpdate(`projects/${projectId}/metadata`, {
      status: "idle",
      updated_at: Date.now(),
    });

    const panelCount = Object.keys(panelMap).length;
    console.log(`✅ PIPELINE: ${panelCount} panels saved`);

    res.json({ ok: true, panelCount });
  } catch (err: any) {
    console.error("Pipeline generate-panels error:", err);

    try {
      const { projectId } = req.body;
      if (projectId) {
        await fbUpdate(`projects/${projectId}/metadata`, {
          status: "error",
          error_message: err.message,
          updated_at: Date.now(),
        });
      }
    } catch { /* ignore */ }

    res.status(500).json({ error: err.message ?? "Panel generation failed" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  POST /render-panel — Render a single panel's image (Flux AI)
// ══════════════════════════════════════════════════════════════════════════════

router.post("/render-panel", async (req, res) => {
  try {
    const { projectId, panelId } = req.body;
    if (!projectId || !panelId) {
      return res.status(400).json({ error: "projectId and panelId are required" });
    }

    // Read panel + project data from Firebase
    const [panel, project] = await Promise.all([
      fbGet<any>(`projects/${projectId}/comic_panels/${panelId}`),
      fbGet<any>(`projects/${projectId}`),
    ]);

    if (!panel) return res.status(404).json({ error: "Panel not found" });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const characters = project.characters || {};
    const style = project.metadata?.global_style || "Manga";
    const genre = project.metadata?.genre || "Fantasy";

    // Update panel status → rendering
    await fbUpdate(`projects/${projectId}/comic_panels/${panelId}`, {
      status: "rendering",
    });

    // Render the panel
    const imageUrl = await renderPanel(
      panel.image_prompt,
      panel.characters_present || [],
      characters,
      style,
      genre,
    );

    // Update panel with image URL
    await fbUpdate(`projects/${projectId}/comic_panels/${panelId}`, {
      image_url: imageUrl,
      status: "complete",
    });

    await fbUpdate(`projects/${projectId}/metadata`, {
      updated_at: Date.now(),
    });

    console.log(`✅ PIPELINE: Panel ${panelId} rendered`);
    res.json({ ok: true, panelId, imageUrl });
  } catch (err: any) {
    console.error("Pipeline render-panel error:", err);

    try {
      const { projectId, panelId } = req.body;
      if (projectId && panelId) {
        await fbUpdate(`projects/${projectId}/comic_panels/${panelId}`, {
          status: "error",
        });
      }
    } catch { /* ignore */ }

    res.status(500).json({ error: err.message ?? "Panel rendering failed" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  POST /render-all — Render all pending panels sequentially (Flux AI)
// ══════════════════════════════════════════════════════════════════════════════

router.post("/render-all", async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: "projectId is required" });

    const project = await fbGet<any>(`projects/${projectId}`);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const panels = project.comic_panels || {};
    const characters = project.characters || {};
    const style = project.metadata?.global_style || "Manga";
    const genre = project.metadata?.genre || "Fantasy";

    // Filter to only pending/error panels
    const pendingPanels = Object.entries(panels)
      .filter(([, panel]: [string, any]) =>
        panel.status === "pending" || panel.status === "error"
      )
      .sort(([, a]: [string, any], [, b]: [string, any]) =>
        (a.panel_order ?? 0) - (b.panel_order ?? 0)
      );

    if (pendingPanels.length === 0) {
      return res.json({ ok: true, renderedCount: 0, message: "No pending panels" });
    }

    // Update status → rendering
    await fbUpdate(`projects/${projectId}/metadata`, {
      status: "rendering",
      updated_at: Date.now(),
    });

    let renderedCount = 0;
    const errors: string[] = [];

    // Render panels sequentially (NVIDIA NIM is one-at-a-time)
    for (const [panelId, panel] of pendingPanels) {
      try {
        // Update panel status → rendering
        await fbUpdate(`projects/${projectId}/comic_panels/${panelId}`, {
          status: "rendering",
        });

        const imageUrl = await renderPanel(
          (panel as any).image_prompt,
          (panel as any).characters_present || [],
          characters,
          style,
          genre,
        );

        // Update panel with image
        await fbUpdate(`projects/${projectId}/comic_panels/${panelId}`, {
          image_url: imageUrl,
          status: "complete",
        });

        renderedCount++;
        console.log(`  ✅ Panel ${panelId} rendered (${renderedCount}/${pendingPanels.length})`);
      } catch (e: any) {
        console.warn(`  ⚠️  Panel ${panelId} failed: ${e.message}`);
        errors.push(`${panelId}: ${e.message}`);
        await fbUpdate(`projects/${projectId}/comic_panels/${panelId}`, {
          status: "error",
        }).catch(() => {});
      }
    }

    // Update project status
    const finalStatus = renderedCount === pendingPanels.length ? "complete" : "error";
    await fbUpdate(`projects/${projectId}/metadata`, {
      status: finalStatus,
      updated_at: Date.now(),
      ...(errors.length > 0 ? { error_message: `${errors.length} panels failed` } : {}),
    });

    console.log(`✅ PIPELINE: Rendered ${renderedCount}/${pendingPanels.length} panels`);
    res.json({ ok: true, renderedCount, totalPending: pendingPanels.length, errors });
  } catch (err: any) {
    console.error("Pipeline render-all error:", err);

    try {
      const { projectId } = req.body;
      if (projectId) {
        await fbUpdate(`projects/${projectId}/metadata`, {
          status: "error",
          error_message: err.message,
          updated_at: Date.now(),
        });
      }
    } catch { /* ignore */ }

    res.status(500).json({ error: err.message ?? "Batch rendering failed" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  GET /project/:id — Read a project from Firebase
// ══════════════════════════════════════════════════════════════════════════════

router.get("/project/:id", async (req, res) => {
  try {
    const project = await fbGet<any>(`projects/${req.params.id}`);
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json(project);
  } catch (err: any) {
    console.error("Pipeline get-project error:", err);
    res.status(500).json({ error: err.message ?? "Failed to read project" });
  }
});

export default router;
