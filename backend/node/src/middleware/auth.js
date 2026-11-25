import { createRemoteJWKSet, errors, jwtVerify } from "jose";
import { config } from "../config.js";
import { query } from "../db.js";
import { HttpError } from "../util.js";

const jwks = config.neonAuthJwksUrl ? createRemoteJWKSet(new URL(config.neonAuthJwksUrl)) : null;

export const publicUser = (u) => ({
    id: u.id, role: u.role, name: u.name, email: u.email, phone: u.phone,
    district: u.district, profile: u.profile, createdAt: u.created_at
});

async function loadIdentity(req) {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) return null;
    if (!jwks || !config.neonAuthBaseUrl) {
        throw new HttpError(503, "Neon Auth is not configured on this server.");
    }

    let payload;
    try {
        ({ payload } = await jwtVerify(header.slice(7), jwks, {
            issuer: new URL(config.neonAuthBaseUrl).origin
        }));
    } catch (error) {
        if (error instanceof errors.JOSEError) return null;
        throw error;
    }

    if (typeof payload.sub !== "string" || !payload.sub) return null;
    const { rows } = await query(
        'SELECT email, "emailVerified" FROM neon_auth."user" WHERE id = $1',
        [payload.sub]
    );
    if (!rows[0]) return null;
    return {
        subject: payload.sub,
        email: rows[0].email,
        emailVerified: rows[0].emailVerified === true
    };
}

async function loadUser(identity) {
    if (!identity) return null;
    const { rows } = await query("SELECT * FROM users WHERE auth_subject = $1 AND deleted_at IS NULL", [identity.subject]);
    const user = rows[0];
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
        if (!req.user && !req.auth) throw new HttpError(401, "Please sign in to continue.");
        if (!req.user) throw new HttpError(403, "Please finish creating your FixNow profile.");
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
