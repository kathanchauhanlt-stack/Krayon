/**
 * AINIME — Centralised API client
 * All components import from here. Base URL auto-detects port.
 */

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

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

// ── Comics ──────────────────────────────────────────────────────────────────

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

export const getComic = (id: string) => apiFetch<ApiComic>(`/api/comics/${id}`);

export const createComic = (data: {
  title: string; genre?: string; style?: string;
  concept?: string; cover_url?: string; status?: string; author_id?: string;
}) => apiFetch<{ id: string }>("/api/comics", { method: "POST", body: JSON.stringify(data) });

export const updateComic = (id: string, data: Partial<ApiComic>) =>
  apiFetch<{ ok: boolean }>(`/api/comics/${id}`, { method: "PATCH", body: JSON.stringify(data) });

// ── Mana (likes) ────────────────────────────────────────────────────────────

export const getMana = (comicId: string, userId = "u1") =>
  apiFetch<{ liked: boolean; count: number }>(`/api/comics/${comicId}/mana?user_id=${userId}`);

export const toggleMana = (comicId: string, userId = "u1") =>
  apiFetch<{ liked: boolean }>(`/api/comics/${comicId}/mana`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });

// ── Drafts ──────────────────────────────────────────────────────────────────

export interface ApiDraft {
  id:          string;
  user_id:     string;
  title:       string;
  genre:       string;
  style:       string;
  concept:     string | null;
  progress:    number;
  locked:      number;   // 0 | 1
  pages_count: number;
  created_at:  string;
  updated_at:  string;
}

export const getDrafts = (userId = "u1") =>
  apiFetch<ApiDraft[]>(`/api/drafts?user_id=${userId}`);

export const createDraft = (data: { title: string; genre?: string; style?: string; concept?: string }) =>
  apiFetch<{ id: string }>("/api/drafts", { method: "POST", body: JSON.stringify(data) });

export const updateDraft = (id: string, data: Partial<ApiDraft>) =>
  apiFetch<{ ok: boolean }>(`/api/drafts/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteDraft = (id: string) =>
  apiFetch<{ ok: boolean }>(`/api/drafts/${id}`, { method: "DELETE" });

// ── Users ───────────────────────────────────────────────────────────────────

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

export const getUser = (id = "u1") => apiFetch<ApiUser>(`/api/users/${id}`);

export const updateUser = (id: string, data: { username?: string; bio?: string; rank?: string }) =>
  apiFetch<{ ok: boolean }>(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(data) });

// ── Health ───────────────────────────────────────────────────────────────────
export const checkHealth = () => apiFetch<{ status: string }>("/api/health");
