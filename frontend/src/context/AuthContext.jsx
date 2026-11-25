import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification, signInWithEmailAndPassword, signOut, updateProfile } from "@firebase/auth";
import { ApiError, api } from "../api.js";
import { auth, requireFirebaseAuth } from "../auth.js";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let active = true;
        if (!auth) {
            setReady(true);
            return () => { active = false; };
        }

        const restoreSession = async (firebaseUser) => {
            try {
                if (firebaseUser) {
                    const profile = await api.me();
                    if (active) setUser(profile.user);
                } else if (active) {
                    setUser(null);
                }
            } catch (error) {
                if (error instanceof ApiError && [401, 403].includes(error.status)) {
                    if (active) setUser(null);
                } else {
                    console.error("Could not restore the Firebase Auth session:", error);
                }
            } finally {
                if (active) setReady(true);
            }
        };

        const unsubscribe = onAuthStateChanged(auth, restoreSession);
        return () => {
            active = false;
            unsubscribe();
        };
    }, []);

    const value = useMemo(() => ({
        user, ready,
        login: async (email, password) => {
            await signInWithEmailAndPassword(requireFirebaseAuth(), email, password);
            const profile = await api.me();
            setUser(profile.user);
            return profile.user;
        },
        register: async (payload) => {
            const firebaseAuth = requireFirebaseAuth();
            const currentEmail = firebaseAuth.currentUser?.email?.toLowerCase();
            if (currentEmail !== payload.email.toLowerCase()) {
                const credential = await createUserWithEmailAndPassword(firebaseAuth, payload.email, payload.password);
                await updateProfile(credential.user, { displayName: payload.name });
                await sendEmailVerification(credential.user);
            }
            const { password, legacyPassword, ...profile } = payload;
            const result = await api.register({
                ...profile,
                legacyPassword: legacyPassword || password
            });
            setUser(result.user);
            return result.user;
        },
        logout: async () => {
            if (auth) await signOut(auth);
            setUser(null);
        }
    }), [user, ready]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
