import { getApp, getApps, initializeApp } from "@firebase/app";
import { getAuth } from "@firebase/auth";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const missingConfig = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => `VITE_FIREBASE_${key.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`);

export const auth = missingConfig.length
    ? null
    : getAuth(getApps().length ? getApp() : initializeApp(firebaseConfig));

export function requireFirebaseAuth() {
    if (!auth) {
        throw new Error(`Firebase Auth is not configured. Set ${missingConfig.join(", ")} in the root .env.local.`);
    }
    return auth;
}
