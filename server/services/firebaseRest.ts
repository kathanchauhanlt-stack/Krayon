/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  KRAYON — Firebase Realtime Database REST Client (Server-Side)
 * ───────────────────────────────────────────────────────────────────────────────
 *  Lightweight REST wrapper for Firebase RTDB used by the pipeline services.
 *  This avoids initializing the Firebase client SDK on the server and uses
 *  the RTDB REST API directly (https://firebase.google.com/docs/database/rest/start).
 *
 *  NOTE: Env vars are read lazily (inside functions) to ensure dotenv has
 *  loaded before access — ESM import hoisting runs module-scope code before
 *  the importing module's dotenv.config() call.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

let _dbUrl: string | undefined;

function getDbUrl(): string {
  if (!_dbUrl) {
    _dbUrl = process.env.VITE_FIREBASE_DATABASE_URL;
    if (!_dbUrl) {
      throw new Error(
        "VITE_FIREBASE_DATABASE_URL is not set in .env.local. " +
        "The pipeline requires Firebase Realtime Database."
      );
    }
  }
  return _dbUrl;
}

/**
 * GET data from a Firebase RTDB path.
 * Returns null if the path does not exist.
 */
export async function fbGet<T = any>(path: string): Promise<T | null> {
  const url = `${getDbUrl()}/${path}.json`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Firebase GET ${path} failed: ${resp.status} ${resp.statusText}`);
  }
  const data = await resp.json();
  return data as T | null;
}

/**
 * PUT (overwrite) data at a Firebase RTDB path.
 */
export async function fbSet(path: string, data: any): Promise<void> {
  const url = `${getDbUrl()}/${path}.json`;
  const resp = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => resp.statusText);
    throw new Error(`Firebase PUT ${path} failed: ${resp.status} — ${body.slice(0, 200)}`);
  }
}

/**
 * PATCH (partial update) data at a Firebase RTDB path.
 */
export async function fbUpdate(path: string, data: Record<string, any>): Promise<void> {
  const url = `${getDbUrl()}/${path}.json`;
  const resp = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => resp.statusText);
    throw new Error(`Firebase PATCH ${path} failed: ${resp.status} — ${body.slice(0, 200)}`);
  }
}

/**
 * DELETE data at a Firebase RTDB path.
 */
export async function fbDelete(path: string): Promise<void> {
  const url = `${getDbUrl()}/${path}.json`;
  const resp = await fetch(url, { method: "DELETE" });
  if (!resp.ok) {
    throw new Error(`Firebase DELETE ${path} failed: ${resp.status} ${resp.statusText}`);
  }
}

/**
 * Generate a Firebase-style push ID (roughly chronological, unique).
 */
export function generatePushId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "-";
  const now = Date.now();
  for (let i = 7; i >= 0; i--) {
    id += chars.charAt(((now >> (i * 6)) & 0x3f) % chars.length);
  }
  for (let i = 0; i < 12; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}
