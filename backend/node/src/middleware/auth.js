import { query } from "../db.js";
import { getFirebaseAuth } from "../firebase.js";
import { HttpError } from "../util.js";

const invalidTokenCodes = new Set([
    "auth/argument-error",
    "auth/id-token-expired",
    "auth/id-token-revoked",
    "auth/invalid-id-token",
    "auth/user-disabled",
    "auth/user-not-found"
]);

export const publicUser = (u) => ({
    id: u.id, role: u.role, name: u.name, email: u.email, phone: u.phone,
    district: u.district, profile: u.profile, createdAt: u.created_at
});

async function loadIdentity(req) {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) return null;
    const token = header.slice(7).trim();
    if (!token) return null;

    try {
        const payload = await getFirebaseAuth().verifyIdToken(token, true);
        if (typeof payload.uid !== "string" || !payload.uid) return null;
        return {
            subject: payload.uid,
            email: typeof payload.email === "string" ? payload.email : null,
            emailVerified: payload.email_verified === true
        };
    } catch (error) {
        if (invalidTokenCodes.has(error.code)) return null;
        throw error;
    }
}

async function loadUser(identity) {
    if (!identity) return null;
    let { rows } = await query(
        "SELECT * FROM users WHERE auth_provider = 'firebase' AND auth_subject = $1 AND deleted_at IS NULL",
        [identity.subject]
    );
    let user = rows[0];

    if (!user && identity.emailVerified && identity.email) {
        ({ rows } = await query(
            `UPDATE users
             SET auth_subject = $1, auth_provider = 'firebase', password_hash = NULL
             WHERE lower(email) = $2 AND auth_provider = 'neon' AND deleted_at IS NULL
             RETURNING *`,
            [identity.subject, identity.email.trim().toLowerCase()]
        ));
        user = rows[0];
    }

    if (!user) return null;
    if (user.suspended_until && new Date(user.suspended_until) > new Date()) {
        throw new HttpError(403, `Your account is suspended until ${new Date(user.suspended_until).toLocaleString()}.`);
    }
    return user;
}

/** Attaches req.user when a valid token is present; never rejects. */
export async function optionalAuth(req, _res, next) {
    try {
        req.auth = await loadIdentity(req);
        req.user = await loadUser(req.auth);
        next();
    } catch (error) { next(error); }
}

export async function requireAuth(req, _res, next) {
    try {
        req.auth = await loadIdentity(req);
        req.user = await loadUser(req.auth);
        if (!req.user) {
            if (!req.auth) throw new HttpError(401, "Please sign in to continue.");
            if (req.auth.email && !req.auth.emailVerified) {
                const { rows } = await query(
                    "SELECT 1 FROM users WHERE lower(email) = $1 AND auth_provider = 'neon' AND deleted_at IS NULL",
                    [req.auth.email.trim().toLowerCase()]
                );
                if (rows[0]) {
                    throw new HttpError(403, "Verify your Firebase email, then sign in again to link your existing FixNow profile.");
                }
            }
            throw new HttpError(403, "Please finish creating your FixNow profile.");
        }
        next();
    } catch (error) { next(error); }
}

export async function requireIdentity(req, _res, next) {
    try {
        req.auth = await loadIdentity(req);
        if (!req.auth) throw new HttpError(401, "Please sign in to continue.");
        next();
    } catch (error) { next(error); }
}

export async function requireAdmin(req, _res, next) {
    try {
        req.auth = await loadIdentity(req);
        req.user = await loadUser(req.auth);
        if (!req.user) throw new HttpError(401, "Please sign in to continue.");
        if (req.user.role !== "admin") throw new HttpError(403, "Administrator access is required.");
        next();
    } catch (error) { next(error); }
}
