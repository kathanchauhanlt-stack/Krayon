/**
 * Krayon — Firestore Client Service
 * All database operations go through this file using the Firebase client SDK.
 * No Express backend is involved for data — only Gemini AI calls hit the server.
 */

import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, runTransaction,
  serverTimestamp, Timestamp, type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase/config";

// ─────────────────────────────────────────────────────────────────────────────
//  TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface SpeechBubble {
  character: string;
  text:      string;
  style:     string;
  position:  { x_pct: number; y_pct: number };
}

export interface KrayonPanel {
  panel_order:       number;
  scene_description: string;
  image_prompt:      string;
  image_url:         string;
  caption:           string | null;
  speech_bubbles:    SpeechBubble[];
}

export interface KrayonPage {
  page_number:     number;
  layout_template: string;
  panels:          KrayonPanel[];
}

export interface KrayonCharacter {
  name:            string;
  appearance_seed: string;
}

export interface KrayonComic {
  id?:          string;
  title:        string;
  author_id:    string;
  author_name?: string;
  cover_url?:   string | null;
  genre:        string;
  style_preset: string;
  concept:      string;
  characters:   KrayonCharacter[];
  pages:        KrayonPage[];
  status:       "draft" | "published";
  mana_count:   number;
  badge:        string;
  created_at:   any;
}

export interface KrayonDraft {
  id?:         string;
  user_id:     string;
  title:       string;
  genre:       string;
  style:       string;
  concept:     string;
  progress:    number;
  locked:      boolean;
  pages_count: number;
  cover_url?:  string | null;
  created_at:  any;
  updated_at:  any;
}

export interface KrayonUser {
  id?:        string;
  username:   string;
  rank:       string;
  bio:        string;
  avatar_url: string | null;
  created_at: any;
}

// ─────────────────────────────────────────────────────────────────────────────
//  HELPER
// ─────────────────────────────────────────────────────────────────────────────

function pollinationsUrl(prompt: string, seed: number): string {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=512&nologo=true&model=flux&seed=${seed}`;
}

function withId<T>(snap: any): T {
  return { id: snap.id, ...snap.data() } as T;
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMICS
// ─────────────────────────────────────────────────────────────────────────────

export async function getComics(params?: { genre?: string; search?: string }): Promise<KrayonComic[]> {
  let q = query(collection(db, "comics"), orderBy("mana_count", "desc"), limit(50));
  const snap = await getDocs(q);
  let results = snap.docs.map((d) => withId<KrayonComic>(d));

  if (params?.genre) results = results.filter((c) => c.genre === params.genre);
  if (params?.search) {
    const s = params.search.toLowerCase();
    results = results.filter((c) => c.title.toLowerCase().includes(s) || c.author_name?.toLowerCase().includes(s));
  }
  return results;
}

export async function getComic(id: string): Promise<KrayonComic | null> {
  const snap = await getDoc(doc(db, "comics", id));
  return snap.exists() ? withId<KrayonComic>(snap) : null;
}

export function listenToComic(id: string, cb: (comic: KrayonComic | null) => void): Unsubscribe {
  return onSnapshot(doc(db, "comics", id), (snap) => {
    cb(snap.exists() ? withId<KrayonComic>(snap) : null);
  });
}

/** Save a fully-built comic (with images) to Firestore. Returns the doc ID. */
export async function saveComic(data: Omit<KrayonComic, "id" | "created_at" | "mana_count" | "badge">, customId?: string): Promise<string> {
  const payload: KrayonComic = {
    ...data,
    mana_count: 0,
    badge:      "NEW DROP",
    created_at: serverTimestamp(),
  };
  if (customId) {
    await setDoc(doc(db, "comics", customId), payload);
    return customId;
  }
  const ref = await addDoc(collection(db, "comics"), payload);
  return ref.id;
}

export async function updateComic(id: string, data: Partial<KrayonComic>): Promise<void> {
  await updateDoc(doc(db, "comics", id), data as any);
}

/** Update a specific panel inside a comic document */
export async function updatePanel(
  comicId: string,
  pageNumber: number,
  panelOrder: number,
  updates: Partial<KrayonPanel>
): Promise<void> {
  const ref  = doc(db, "comics", comicId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Comic not found");

  const comic = snap.data() as KrayonComic;
  const pages = comic.pages.map((p) => {
    if (p.page_number !== pageNumber) return p;
    return {
      ...p,
      panels: p.panels.map((pn) =>
        (pn.panel_order === panelOrder) ? { ...pn, ...updates } : pn
      ),
    };
  });
  await updateDoc(ref, { pages });
}

/** Regenerate a panel's image: new seed → new URL, save to Firestore */
export async function regeneratePanelImage(
  comicId: string,
  pageNumber: number,
  panelOrder: number,
  customPrompt?: string
): Promise<string> {
  const ref  = doc(db, "comics", comicId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Comic not found");

  const comic = snap.data() as KrayonComic;
  let   newUrl = "";

  const pages = comic.pages.map((p) => {
    if (p.page_number !== pageNumber) return p;
    return {
      ...p,
      panels: p.panels.map((pn) => {
        if (pn.panel_order !== panelOrder) return pn;
        const seed   = Math.floor(Math.random() * 99999);
        const prompt = customPrompt || pn.image_prompt;
        newUrl       = pollinationsUrl(prompt, seed);
        return { ...pn, image_url: newUrl, image_prompt: prompt };
      }),
    };
  });

  await updateDoc(ref, { pages });
  return newUrl;
}

// ─────────────────────────────────────────────────────────────────────────────
//  MANA (LIKES)
// ─────────────────────────────────────────────────────────────────────────────

export async function getMana(comicId: string, userId: string): Promise<{ liked: boolean; count: number }> {
  const comicSnap = await getDoc(doc(db, "comics", comicId));
  if (!comicSnap.exists()) return { liked: false, count: 0 };

  const count = (comicSnap.data() as any).mana_count ?? 0;
  const manaSnap = await getDoc(doc(db, "mana", `${userId}_${comicId}`));
  return { liked: manaSnap.exists(), count };
}

export async function toggleMana(comicId: string, userId: string): Promise<{ liked: boolean }> {
  const manaRef  = doc(db, "mana",   `${userId}_${comicId}`);
  const comicRef = doc(db, "comics", comicId);

  return runTransaction(db, async (tx) => {
    const manaSnap  = await tx.get(manaRef);
    const comicSnap = await tx.get(comicRef);
    const count     = (comicSnap.data() as any)?.mana_count ?? 0;

    if (manaSnap.exists()) {
      tx.delete(manaRef);
      tx.update(comicRef, { mana_count: Math.max(0, count - 1) });
      return { liked: false };
    } else {
      tx.set(manaRef, { user_id: userId, comic_id: comicId, created_at: serverTimestamp() });
      tx.update(comicRef, { mana_count: count + 1 });
      return { liked: true };
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  DRAFTS
// ─────────────────────────────────────────────────────────────────────────────

export async function getDrafts(userId: string): Promise<KrayonDraft[]> {
  const q    = query(collection(db, "drafts"), where("user_id", "==", userId), orderBy("updated_at", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => withId<KrayonDraft>(d));
}

export async function createDraft(data: Omit<KrayonDraft, "id" | "created_at" | "updated_at">): Promise<string> {
  const ref = await addDoc(collection(db, "drafts"), {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDraft(id: string, data: Partial<KrayonDraft>): Promise<void> {
  await updateDoc(doc(db, "drafts", id), { ...data, updated_at: serverTimestamp() } as any);
}

export async function deleteDraft(id: string): Promise<void> {
  await deleteDoc(doc(db, "drafts", id));
}

// ─────────────────────────────────────────────────────────────────────────────
//  USERS
// ─────────────────────────────────────────────────────────────────────────────

export async function getOrCreateUser(uid: string, displayName?: string | null): Promise<KrayonUser> {
  const ref  = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (snap.exists()) return withId<KrayonUser>(snap);

  const newUser: KrayonUser = {
    username:   displayName ?? `Creator_${uid.slice(0, 6)}`,
    rank:       "Novice Chronicler",
    bio:        "Weaving realities from the void.",
    avatar_url: null,
    created_at: serverTimestamp(),
  };
  await setDoc(ref, newUser);
  return { id: uid, ...newUser };
}

export async function getUser(uid: string): Promise<KrayonUser & { artifacts: number; mana: number; published: KrayonComic[] }> {
  const userSnap = await getDoc(doc(db, "users", uid));
  const userBase = userSnap.exists() ? withId<KrayonUser>(userSnap) : { id: uid, username: uid, rank: "Novice Chronicler", bio: "", avatar_url: null, created_at: null };

  const publishedSnap = await getDocs(query(collection(db, "comics"), where("author_id", "==", uid), where("status", "==", "published")));
  const published     = publishedSnap.docs.map((d) => withId<KrayonComic>(d));
  const mana          = published.reduce((acc, c) => acc + (c.mana_count ?? 0), 0);

  return { ...userBase, artifacts: published.length, mana, published };
}

export async function updateUser(uid: string, data: Partial<KrayonUser>): Promise<void> {
  await setDoc(doc(db, "users", uid), data, { merge: true });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SEED — called once when Stream is empty to pre-populate demo data
// ─────────────────────────────────────────────────────────────────────────────

export async function seedDemoComicsIfEmpty(): Promise<void> {
  const snap = await getDocs(query(collection(db, "comics"), limit(1)));
  if (!snap.empty) return; // already seeded

  const demos = [
    { title: "Neon Ronin: Echoes of Neo-Kyoto",   genre: "Cyberpunk",    style_preset: "Manga",           concept: "A ronin navigates a neon-soaked dystopia",           cover_url: "https://images.unsplash.com/photo-1578632292335-df3abbb0d586?q=80&w=800", badge: "EPIC FINALE",     mana_count: 1240 },
    { title: "Aetheria: The Floating Spire",        genre: "Fantasy",     style_preset: "American Comic",  concept: "A mage discovers a city adrift in the clouds",       cover_url: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=800", badge: "WORK IN PROGRESS", mana_count: 856 },
    { title: "Void Walker: Singularity",            genre: "Sci-Fi",      style_preset: "Noir",            concept: "An entity crosses the boundary of dimensions",       cover_url: "https://images.unsplash.com/photo-1614728263952-84ea206f99b6?q=80&w=800", badge: "TRENDING",        mana_count: 3200 },
    { title: "Steam Heart",                          genre: "Noir",        style_preset: "Webtoon Noir",    concept: "Love between a clockmaker and an automaton",         cover_url: "https://images.unsplash.com/photo-1589149098258-3e9102ca63d3?q=80&w=800", badge: "WORK IN PROGRESS", mana_count: 450 },
    { title: "Crimson Mandate",                      genre: "Fantasy",     style_preset: "Painted",         concept: "A blood pact that shattered an empire",              cover_url: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=800", badge: "NEW DROP",         mana_count: 720 },
    { title: "Ghost Protocol Omega",                 genre: "Cyberpunk",   style_preset: "American Comic",  concept: "Ghosts of the net rise against their creators",      cover_url: "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?q=80&w=800", badge: "EPIC FINALE",     mana_count: 1900 },
  ];

  for (const d of demos) {
    await addDoc(collection(db, "comics"), {
      ...d,
      author_id:   "demo",
      author_name: "KrayonStudios",
      characters:  [],
      pages:       [],
      status:      "published",
      created_at:  serverTimestamp(),
    });
  }
  console.log("✅ Firestore seeded with demo comics");
}
