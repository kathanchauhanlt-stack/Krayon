/**
 * Krayon — Centralised API client
 */

const BASE = import.meta.env.VITE_API_URL ?? "";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as any).error ?? "API error");
  }
  return res.json() as Promise<T>;
}

// ── Comics ───────────────────────────────────────────────────────────────────

export interface ApiComic {
  id:          string;
  title:       string;
  author_id:   string;
  author_name: string;
  cover_url:   string | null;
  genre:       string;
  style:       string;
  concept:     string | null;
  status:      "draft" | "final";
  badge:       string;
  mana_count:  number;
  remix_count: number;
  created_at:  string;
}

export const getComics = (params?: { status?: string; genre?: string; search?: string }) => {
  const qs = new URLSearchParams(params as any).toString();
  return apiFetch<ApiComic[]>(`/api/comics${qs ? `?${qs}` : ""}`);
};
export const getComic  = (id: string) => apiFetch<ApiComic>(`/api/comics/${id}`);
export const createComic = (data: { title: string; genre?: string; style?: string; concept?: string; cover_url?: string; status?: string; author_id?: string }) =>
  apiFetch<{ id: string }>("/api/comics", { method: "POST", body: JSON.stringify(data) });
export const updateComic = (id: string, data: Partial<ApiComic>) =>
  apiFetch<{ ok: boolean }>(`/api/comics/${id}`, { method: "PATCH", body: JSON.stringify(data) });

// ── Mana ────────────────────────────────────────────────────────────────────

export const getMana    = (comicId: string, userId = "u1") =>
  apiFetch<{ liked: boolean; count: number }>(`/api/comics/${comicId}/mana?user_id=${userId}`);
export const toggleMana = (comicId: string, userId = "u1") =>
  apiFetch<{ liked: boolean }>(`/api/comics/${comicId}/mana`, { method: "POST", body: JSON.stringify({ user_id: userId }) });

// ── Drafts ───────────────────────────────────────────────────────────────────

export interface ApiDraft {
  id:          string;
  user_id:     string;
  title:       string;
  genre:       string;
  style:       string;
  concept:     string | null;
  cover_url:   string | null;
  progress:    number;
  locked:      number;
  pages_count: number;
  created_at:  string;
  updated_at:  string;
}

export const getDrafts    = (userId = "u1") => apiFetch<ApiDraft[]>(`/api/drafts?user_id=${userId}`);
export const createDraft  = (data: { title: string; genre?: string; style?: string; concept?: string }) =>
  apiFetch<{ id: string }>("/api/drafts", { method: "POST", body: JSON.stringify(data) });
export const updateDraft  = (id: string, data: Partial<ApiDraft>) =>
  apiFetch<{ ok: boolean }>(`/api/drafts/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteDraft  = (id: string) =>
  apiFetch<{ ok: boolean }>(`/api/drafts/${id}`, { method: "DELETE" });

// ── Users ────────────────────────────────────────────────────────────────────

export interface ApiUser {
  id:         string;
  username:   string;
  rank:       string;
  bio:        string;
  avatar_url: string | null;
  created_at: string;
  artifacts:  number;
  mana:       number;
  followers:  number;
  published:  ApiComic[];
}

export const getUser    = (id = "u1") => apiFetch<ApiUser>(`/api/users/${id}`);
export const updateUser = (id: string, data: { username?: string; bio?: string; rank?: string }) =>
  apiFetch<{ ok: boolean }>(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(data) });

// ── Health ───────────────────────────────────────────────────────────────────
export const checkHealth = () => apiFetch<{ status: string }>("/api/health");

// ══════════════════════════════════════════════════════════════════════════════
//  COMIC GENERATION — NEW SPEC-BASED SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

/** A speech/thought/shout bubble attributed to a character */
export interface Bubble {
  character: string;
  type: "speech" | "thought" | "shout" | "caption";
  text: string;
}

/** The spec panel as returned from the server */
export interface SpecPanel {
  order:             number;
  scene_description: string;
  caption:           string | null;
  dialogue:          string | null;
  bubbles:           Bubble[];
  sfx:               string | null;
  image_url:         string;
}

/** A page of panels */
export interface SpecPage {
  page_number: number;
  layout:      string;
  panels:      SpecPanel[];
}

/** Full generation response — includes comic ID and page structure */
export interface GeneratedComic {
  comicId: string;
  specId:  string;
  title:   string;
  genre:   string;
  style:   string;
  pages:   SpecPage[];
}

/** Studio input spec */
export interface ComicInput {
  title:      string;
  genre:      string;
  style:      string;
  prompt:     string;
  panelCount: number;
  author_id?: string;
}

/** Generate and immediately save a comic — returns comic ID + structure */
export const generateAndSaveComic = (input: ComicInput) =>
  apiFetch<GeneratedComic>("/api/ai/generate-and-save", {
    method: "POST",
    body: JSON.stringify(input),
  });

/** Enhance a scene description with AI */
export const enhanceScene = (prompt: string) =>
  apiFetch<{ enhancedText: string }>("/api/ai/enhance-scene", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });

// ── Reader types ─────────────────────────────────────────────────────────────

export interface ReaderPanel {
  id:                string;
  page_id:           string;
  panel_order:       number;
  image_url:         string | null;
  caption:           string | null;
  dialogue:          string | null;
  panel_type:        string;
  scene_description: string | null; // shown when image fails
  bubbles:           Bubble[];      // rich character bubbles
  sfx:               string | null; // sound effects
  bubbles_json:      string | null; // raw JSON from DB (parsed into bubbles)
}

export interface ReaderPage {
  id:          string;
  comic_id:    string;
  page_number: number;
  layout:      string;
  panels:      ReaderPanel[];
}

export interface ReaderComic {
  comic: ApiComic;
  pages: ReaderPage[];
  spec:  any | null;
}

export const readComic = (id: string) => apiFetch<ReaderComic>(`/api/comics/${id}/read`);

// ══════════════════════════════════════════════════════════════════════════════
//  PIPELINE — Light Novel → Comic (Firebase Realtime DB)
// ══════════════════════════════════════════════════════════════════════════════

export interface PipelineCreateInput {
  title: string;
  genre: string;
  style: string;
  prompt: string;
  characters?: Array<{
    name: string;
    lora_id: string;
    trigger_word: string;
    visual_description: string;
  }>;
  owner_id?: string;
}

export const pipelineCreateProject = (input: PipelineCreateInput) =>
  apiFetch<{ projectId: string; title: string }>("/api/pipeline/create-project", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const pipelineGenerateNovel = (projectId: string) =>
  apiFetch<{ ok: boolean; sceneCount: number }>("/api/pipeline/generate-novel", {
    method: "POST",
    body: JSON.stringify({ projectId }),
  });

export const pipelineGeneratePanels = (projectId: string) =>
  apiFetch<{ ok: boolean; panelCount: number }>("/api/pipeline/generate-panels", {
    method: "POST",
    body: JSON.stringify({ projectId }),
  });

export const pipelineRenderPanel = (projectId: string, panelId: string) =>
  apiFetch<{ ok: boolean; panelId: string; imageUrl: string }>("/api/pipeline/render-panel", {
    method: "POST",
    body: JSON.stringify({ projectId, panelId }),
  });

export const pipelineRenderAll = (projectId: string) =>
  apiFetch<{ ok: boolean; renderedCount: number; totalPending: number; errors: string[] }>("/api/pipeline/render-all", {
    method: "POST",
    body: JSON.stringify({ projectId }),
  });

export const pipelineGetProject = (projectId: string) =>
  apiFetch<any>(`/api/pipeline/project/${projectId}`);
