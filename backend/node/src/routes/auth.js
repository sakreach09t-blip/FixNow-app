import bcrypt from "bcryptjs";
import { Router } from "express";
import { query } from "../db.js";
import { publicUser, requireAuth, requireIdentity } from "../middleware/auth.js";
import { HttpError, normalizePhone } from "../util.js";
import { registerSchema } from "../validation.js";

const router = Router();

router.post("/register", requireIdentity, async (req, res, next) => {
    try {
        const data = registerSchema.parse(req.body);
        const email = req.auth.email?.trim().toLowerCase();
        if (!email || email !== data.email.trim().toLowerCase()) {
            throw new HttpError(400, "The email on your Firebase account must match your FixNow profile.", { email: "Use the same email as your signed-in account." });
        }

        const profile = data.role === "technician" ? {
            status: "pending-review", trade: data.trade, years: data.experience,
            startingPrice: data.price, areas: data.areas, skills: data.skills
        } : null;

        const existing = await query("SELECT * FROM users WHERE lower(email) = $1 AND deleted_at IS NULL", [email]);
        let user = existing.rows[0];
        if (user) {
            if (user.auth_provider === "firebase" && user.auth_subject && user.auth_subject !== req.auth.subject) {
                throw new HttpError(409, "A FixNow profile with this email is already linked to another account.", { email: "Already registered." });
            }
            if (user.auth_provider !== "firebase" || !user.auth_subject) {
                const legacyPassword = data.legacyPassword || "";
                const canLinkWithPassword = user.password_hash && legacyPassword && await bcrypt.compare(legacyPassword, user.password_hash);
                if (!canLinkWithPassword && !req.auth.emailVerified) {
                    throw new HttpError(409, "Verify your Firebase email or enter your previous FixNow password to link this existing profile.", { email: "Existing profile needs verification." });
                }
                const linked = await query(
                    `UPDATE users
                     SET auth_subject = $1, auth_provider = 'firebase', password_hash = NULL
                     WHERE id = $2 AND deleted_at IS NULL
                       AND (auth_subject IS NULL OR auth_provider = 'neon')
                     RETURNING *`,
                    [req.auth.subject, user.id]
                );
                user = linked.rows[0];
                if (!user) {
                    const current = await query(
                        "SELECT * FROM users WHERE id = $1 AND auth_provider = 'firebase' AND auth_subject = $2 AND deleted_at IS NULL",
                        [existing.rows[0].id, req.auth.subject]
                    );
                    user = current.rows[0];
                    if (!user) throw new HttpError(409, "This FixNow profile was linked by another request. Sign in again.");
                }
            }
            res.status(200).json({ user: publicUser(user) });
            return;
        }

        try {
            const { rows } = await query(
                `INSERT INTO users (auth_subject, auth_provider, role, name, email, phone, district, profile, password_hash)
                 VALUES ($1,'firebase',$2,$3,$4,$5,$6,$7,NULL) RETURNING *`,
                [req.auth.subject, data.role, data.name, email, normalizePhone(data.phone), data.district || null, profile]
            );
            res.status(201).json({ user: publicUser(rows[0]) });
        } catch (error) {
            if (error.code === "23505") {
                const field = String(error.constraint).includes("phone") ? "phone" : "email";
                throw new HttpError(409, field === "phone"
                    ? "An account with this phone number already exists."
                    : "A FixNow profile with this email is already registered.", { [field]: "Already registered." });
            }
            throw error;
        }
    } catch (error) { next(error); }
});

router.get("/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

export default router;
