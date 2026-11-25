import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { config } from "./config.js";
import { HttpError } from "./util.js";

let firebaseAuth;

export function getFirebaseAuth() {
    if (!config.firebaseProjectId) {
        throw new HttpError(503, "Firebase Auth is not configured on this server. Set FIREBASE_PROJECT_ID.");
    }

    if (!firebaseAuth) {
        const app = initializeApp({
            credential: applicationDefault(),
            projectId: config.firebaseProjectId
        }, "fixnow-auth");
        firebaseAuth = getAuth(app);
    }

    return firebaseAuth;
}
