import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ApiError, api } from "../api.js";
import { authClient } from "../auth.js";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let active = true;
        const restoreSession = async () => {
            try {
                const { data, error } = await authClient.getSession();
                if (error) throw new Error(error.message);
                if (data?.session) {
                    const profile = await api.me();
                    if (active) setUser(profile.user);
                }
            } catch (error) {
                if (error instanceof ApiError && error.status === 401) {
                    if (active) setUser(null);
                } else {
                    console.error("Could not restore the Neon Auth session:", error);
                }
            } finally {
                if (active) setReady(true);
            }
        };
        restoreSession();
        return () => { active = false; };
    }, []);

    const value = useMemo(() => ({
        user, ready,
        login: async (email, password) => {
            const result = await authClient.signIn.email({ email, password });
            if (result.error) throw new Error(result.error.message);
            const profile = await api.me();
            setUser(profile.user);
            return profile.user;
        },
        register: async (payload) => {
            const current = await authClient.getSession();
            const currentEmail = current.data?.user?.email?.toLowerCase();
            if (currentEmail !== payload.email.toLowerCase()) {
                const result = await authClient.signUp.email({
                    name: payload.name,
                    email: payload.email,
                    password: payload.password
                });
                if (result.error) throw new Error(result.error.message);
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
            const result = await authClient.signOut();
            if (result.error) throw new Error(result.error.message);
            setUser(null);
        }
    }), [user, ready]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
