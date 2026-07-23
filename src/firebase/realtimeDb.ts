/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  KRAYON — Firebase Realtime Database Initialization
 * ───────────────────────────────────────────────────────────────────────────────
 *  This module initializes the Firebase Realtime Database for the
 *  Light Novel to Comic pipeline. It reuses the existing Firebase app
 *  instance from config.ts and exports the database reference.
 *
 *  NOTE: This is SEPARATE from Cloud Firestore (used by existing features).
 *  Firebase Realtime Database provides real-time websocket syncing which
 *  is required for the Lab Reader's live panel updates.
 *
 *  SETUP:
 *  1. Enable Realtime Database in Firebase Console:
 *     Build → Realtime Database → Create Database
 *  2. Add VITE_FIREBASE_DATABASE_URL to .env.local:
 *     VITE_FIREBASE_DATABASE_URL="https://<project-id>-default-rtdb.firebaseio.com"
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/// <reference types="vite/client" />

import { getDatabase } from "firebase/database";
import app from "./config";

// ── Initialize Realtime Database ────────────────────────────────────────────

const databaseURL = import.meta.env.VITE_FIREBASE_DATABASE_URL;

if (!databaseURL) {
  console.warn(
    "⚠️  VITE_FIREBASE_DATABASE_URL is not set.\n" +
    "    The Light Novel pipeline requires Firebase Realtime Database.\n" +
    "    Add VITE_FIREBASE_DATABASE_URL to your .env.local file.\n" +
    "    Format: https://<project-id>-default-rtdb.firebaseio.com"
  );
}

/**
 * Firebase Realtime Database instance.
 * Used exclusively by the Light Novel → Comic pipeline services.
 */
export const realtimeDb = getDatabase(app, databaseURL || undefined);

export default realtimeDb;
