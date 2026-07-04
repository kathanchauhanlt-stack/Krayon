/**
 * AINIME — Firebase API client
 * Replaces the local Express backend with Cloud Firestore.
 */

import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, runTransaction, writeBatch
} from "firebase/firestore";
import { db } from "../firebase/config";

const uid = () => Math.random().toString(36).slice(2, 10);

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

export const getComics = async (params?: { status?: string; genre?: string; search?: string }) => {
  await seedDemoDataIfEmpty();
  const comicsRef = collection(db, "comics");
  let q = query(comicsRef);

  if (params?.status) {
    q = query(q, where("status", "==", params.status));
  }
  if (params?.genre) {
    q = query(q, where("genre", "==", params.genre));
  }
  // Firestore doesn't support full-text search easily with LIKE "%search%"
  // We'll apply the search filter in memory if provided.
  const snapshot = await getDocs(q);
  let results = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ApiComic));

  // Client-side search and order
  if (params?.search) {
    const s = params.search.toLowerCase();
    results = results.filter(c => c.title.toLowerCase().includes(s) || (c.author_name && c.author_name.toLowerCase().includes(s)));
  }

  // Order by mana_count DESC
  results.sort((a, b) => (b.mana_count || 0) - (a.mana_count || 0));

  return results;
};

export const getComic = async (id: string) => {
  const d = await getDoc(doc(db, "comics", id));
  if (!d.exists()) throw new Error("Not found");
  return { id: d.id, ...d.data() } as ApiComic;
};

export const createComic = async (data: {
  title: string; genre?: string; style?: string;
  concept?: string; cover_url?: string; status?: string; author_id?: string;
}) => {
  const id = `c_${uid()}`;
  const status = data.status || "draft";
  const badge = status === "final" ? "EPIC FINALE" : "WORK IN PROGRESS";
  
  let author_name = "ZeroX"; // fallback
  if (data.author_id) {
    try {
      const u = await getDoc(doc(db, "users", data.author_id));
      if (u.exists()) author_name = u.data().username || "ZeroX";
    } catch { /* ignore */ }
  }

  const comic: ApiComic = {
    id,
    title: data.title,
    author_id: data.author_id || "u1",
    author_name,
    cover_url: data.cover_url || null,
    genre: data.genre || "Fantasy",
    style: data.style || "American Comic",
    concept: data.concept || null,
    status: status as any,
    badge,
    mana_count: 0,
    remix_count: 0,
    created_at: new Date().toISOString(),
  };

  await setDoc(doc(db, "comics", id), comic);
  return { id };
};

export const updateComic = async (id: string, data: Partial<ApiComic>) => {
  const payload = { ...data };
  if (payload.status) {
    payload.badge = payload.status === "final" ? "EPIC FINALE" : "WORK IN PROGRESS";
  }
  await updateDoc(doc(db, "comics", id), payload);
  return { ok: true };
};

// ── Mana (likes) ────────────────────────────────────────────────────────────

export const getMana = async (comicId: string, userId = "u1") => {
  const manaDoc = await getDoc(doc(db, "comics", comicId, "mana", userId));
  const comicDoc = await getDoc(doc(db, "comics", comicId));
  return {
    liked: manaDoc.exists(),
    count: comicDoc.exists() ? (comicDoc.data().mana_count || 0) : 0
  };
};

export const toggleMana = async (comicId: string, userId = "u1") => {
  const comicRef = doc(db, "comics", comicId);
  const manaRef = doc(db, "comics", comicId, "mana", userId);

  let isLiked = false;

  await runTransaction(db, async (t) => {
    const comicDoc = await t.get(comicRef);
    if (!comicDoc.exists()) throw new Error("Comic not found");
    const manaDoc = await t.get(manaRef);

    const currentCount = comicDoc.data().mana_count || 0;

    if (manaDoc.exists()) {
      t.delete(manaRef);
      t.update(comicRef, { mana_count: Math.max(0, currentCount - 1) });
      isLiked = false;
    } else {
      t.set(manaRef, { created_at: new Date().toISOString() });
      t.update(comicRef, { mana_count: currentCount + 1 });
      isLiked = true;
    }
  });

  return { liked: isLiked };
};

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

export const getDrafts = async (userId = "u1") => {
  const q = query(collection(db, "drafts"), where("user_id", "==", userId));
  const snapshot = await getDocs(q);
  const results = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ApiDraft));
  results.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  return results;
};

export const createDraft = async (data: { title: string; genre?: string; style?: string; concept?: string; user_id?: string }) => {
  const id = `d_${uid()}`;
  const draft: ApiDraft = {
    id,
    user_id: data.user_id || "u1",
    title: data.title,
    genre: data.genre || "Fantasy",
    style: data.style || "American Comic",
    concept: data.concept || null,
    progress: 0,
    locked: 0,
    pages_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await setDoc(doc(db, "drafts", id), draft);
  return { id };
};

export const updateDraft = async (id: string, data: Partial<ApiDraft>) => {
  await updateDoc(doc(db, "drafts", id), { ...data, updated_at: new Date().toISOString() });
  return { ok: true };
};

export const deleteDraft = async (id: string) => {
  await deleteDoc(doc(db, "drafts", id));
  return { ok: true };
};

// ── Users ───────────────────────────────────────────────────────────────────

export interface ApiUser {
  id:         string;
  username:   string;
  rank:       string;
  bio:        string;
  avatar_url: string | null;
  created_at: string;
  artifacts?:  number;
  mana?:       number;
  followers?:  number;
  published?:  ApiComic[];
}

export const getUser = async (id = "u1") => {
  await seedDemoDataIfEmpty();
  const d = await getDoc(doc(db, "users", id));
  if (!d.exists()) throw new Error("Not found");
  const user = { id: d.id, ...d.data() } as ApiUser;

  // Aggregate stats
  const comicsQ = query(collection(db, "comics"), where("author_id", "==", id));
  const cSnap = await getDocs(comicsQ);
  const comics = cSnap.docs.map(x => ({ id: x.id, ...x.data() } as ApiComic));
  
  const publishedComics = comics.filter(c => c.status === "final");
  publishedComics.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  user.artifacts = publishedComics.length;
  user.mana = comics.reduce((sum, c) => sum + (c.mana_count || 0), 0);
  user.followers = 0; // Stub
  user.published = publishedComics;

  return user;
};

export const updateUser = async (id: string, data: { username?: string; bio?: string; rank?: string }) => {
  await updateDoc(doc(db, "users", id), data);
  return { ok: true };
};

// ── Health ───────────────────────────────────────────────────────────────────
export const checkHealth = async () => Promise.resolve({ status: "firebase-ok" });

// ── Seed demo data ───────────────────────────────────────────────────────────
let isSeeding = false;
let hasCheckedSeeding = false;

async function seedDemoDataIfEmpty() {
  if (hasCheckedSeeding || isSeeding) return;
  isSeeding = true;
  
  try {
    const q = query(collection(db, "users"));
    const snap = await getDocs(q);
    if (!snap.empty) {
      hasCheckedSeeding = true;
      isSeeding = false;
      return;
    }

    console.log("Seeding initial Firestore database...");
    const batch = writeBatch(db);

    // Users
    const users = [
      { id: "u1", username: "ZeroX", rank: "Grand Architect", bio: "Weaving realities from the void.", avatar_url: null, created_at: new Date().toISOString() },
      { id: "u2", username: "Luna_Dev", rank: "Adept Weaver", bio: "Dreamscaper and pixel architect.", avatar_url: null, created_at: new Date().toISOString() },
      { id: "u3", username: "Chronos", rank: "Grand Architect", bio: "Time bends for no one but me.", avatar_url: null, created_at: new Date().toISOString() },
      { id: "u4", username: "BrassCog", rank: "Novice Chronicler", bio: "Gears and steam, always.", avatar_url: null, created_at: new Date().toISOString() },
      { id: "u5", username: "RedSeal", rank: "Master Illusionist", bio: "Crimson ink flows eternal.", avatar_url: null, created_at: new Date().toISOString() }
    ];
    for (const u of users) {
      batch.set(doc(db, "users", u.id), u);
    }

    // Comics
    const comics: ApiComic[] = [
      { id: "c1", title: "Neon Ronin: Echoes of Neo-Kyoto", author_id: "u1", author_name: "ZeroX", cover_url: "https://images.unsplash.com/photo-1578632292335-df3abbb0d586?q=80&w=800", genre: "Cyberpunk", style: "Manga", concept: "A ronin navigates a neon-soaked dystopia", status: "final", badge: "EPIC FINALE", mana_count: 1240, remix_count: 88, created_at: new Date().toISOString() },
      { id: "c2", title: "Aetheria: The Floating Spire", author_id: "u2", author_name: "Luna_Dev", cover_url: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=800", genre: "Fantasy", style: "American Comic", concept: "A mage discovers a city adrift in the clouds", status: "draft", badge: "WORK IN PROGRESS", mana_count: 856, remix_count: 42, created_at: new Date().toISOString() },
      { id: "c3", title: "Void Walker: Singularity", author_id: "u3", author_name: "Chronos", cover_url: "https://images.unsplash.com/photo-1614728263952-84ea206f99b6?q=80&w=800", genre: "Sci-Fi", style: "Noir", concept: "An entity crosses the boundary of dimensions", status: "final", badge: "TRENDING", mana_count: 3200, remix_count: 245, created_at: new Date().toISOString() },
      { id: "c4", title: "Steam Heart", author_id: "u4", author_name: "BrassCog", cover_url: "https://images.unsplash.com/photo-1589149098258-3e9102ca63d3?q=80&w=800", genre: "Noir", style: "Webtoon", concept: "Love between a clockmaker and an automaton", status: "draft", badge: "WORK IN PROGRESS", mana_count: 450, remix_count: 15, created_at: new Date().toISOString() },
      { id: "c5", title: "Crimson Mandate", author_id: "u5", author_name: "RedSeal", cover_url: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=800", genre: "Fantasy", style: "Painted", concept: "A blood pact that shattered an empire", status: "final", badge: "NEW DROP", mana_count: 720, remix_count: 34, created_at: new Date().toISOString() },
      { id: "c6", title: "Ghost Protocol Omega", author_id: "u1", author_name: "ZeroX", cover_url: "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?q=80&w=800", genre: "Cyberpunk", style: "American Comic", concept: "Ghosts of the net rise against their creators", status: "final", badge: "EPIC FINALE", mana_count: 1900, remix_count: 112, created_at: new Date().toISOString() }
    ];
    for (const c of comics) {
      batch.set(doc(db, "comics", c.id), c);
    }

    // Drafts for u1
    const drafts: ApiDraft[] = [
      { id: "d1", user_id: "u1", title: "The Ruined Spires", genre: "Fantasy", style: "Painted", concept: null, progress: 65, locked: 1, pages_count: 12, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "d2", user_id: "u1", title: "Cyber-Soul 2099", genre: "Cyberpunk", style: "Manga", concept: null, progress: 12, locked: 0, pages_count: 3, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "d3", user_id: "u1", title: "Witch of the Red Glade", genre: "Horror", style: "Webtoon", concept: null, progress: 98, locked: 1, pages_count: 22, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: "d4", user_id: "u1", title: "Iron Meridian", genre: "Sci-Fi", style: "American Comic", concept: null, progress: 44, locked: 0, pages_count: 8, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    ];
    for (const d of drafts) {
      batch.set(doc(db, "drafts", d.id), d);
    }

    await batch.commit();
    hasCheckedSeeding = true;
    console.log("✅ Firestore database seeded with demo data");
  } catch (err) {
    console.error("Error seeding demo data:", err);
  } finally {
    isSeeding = false;
  }
}
