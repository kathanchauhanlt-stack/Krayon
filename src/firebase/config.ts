/// <reference types="vite/client" />
/**
 * AINIME — Firebase Configuration
 *
 * Services used:
 *  - Firebase Auth        (Google sign-in + anonymous)
 *  - Cloud Firestore      (comics, drafts, users, mana/likes)
 *  - Firebase Storage     (comic cover images, character uploads)
 *
 * HOW TO SET UP:
 * 1. Go to https://console.firebase.google.com
 * 2. Create project "ainime"
 * 3. Add a Web App → copy the firebaseConfig object
 * 4. Enable: Authentication → Google provider + Anonymous
 * 5. Enable: Firestore Database (start in test mode)
 * 6. Enable: Storage (start in test mode)
 * 7. Paste your config values into .env.local (see .env.example)
 */

import { initializeApp }            from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore }             from "firebase/firestore";
import { getStorage }               from "firebase/storage";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate that at least the projectId is set
if (!firebaseConfig.projectId) {
  console.warn(
    "⚠️  Firebase is not configured.\n" +
    "    Copy .env.example → .env.local and fill in your Firebase project values.\n" +
    "    The app will run with mock data until Firebase is connected."
  );
}

const app       = initializeApp(firebaseConfig);
export const auth        = getAuth(app);
export const db          = getFirestore(app);
export const storage     = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
