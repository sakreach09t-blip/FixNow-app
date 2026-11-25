import { Router } from "express";
import { z } from "zod";
import { pool, query } from "../db.js";
import { requireAdmin } from "../middleware/auth.js";
import { HttpError } from "../util.js";

const router = Router();
const idSchema = z.string().uuid();
const technicianIdSchema = z.string().trim().min(1).max(100);
const suspensionSchema = z.object({ suspendedUntil: z.string().datetime({ offset: true }).nullable() });

function parseSuspension(body) {
    const { suspendedUntil } = suspensionSchema.parse(body);
    if (suspendedUntil === null) return null;
    const date = new Date(suspendedUntil);
    if (date <= new Date()) throw new HttpError(400, "Choose a suspension end time in the future.");
    return date.toISOString();
}

router.use(requireAdmin);

router.get("/summary", async (_req, res, next) => {
    try {
        const [accounts, bookings, technicians] = await Promise.all([
            query(`SELECT
                       count(*) FILTER (WHERE role = 'customer' AND deleted_at IS NULL)::int AS customers,
                       count(*) FILTER (WHERE role = 'technician' AND deleted_at IS NULL)::int AS "technicianAccounts",
                       count(*) FILTER (WHERE role IN ('customer', 'technician') AND deleted_at IS NULL)::int AS "appUsers"
                   FROM users`),
            query(`SELECT count(*)::int AS bookings,
                          count(*) FILTER (WHERE status = 'confirmed')::int AS "confirmedBookings",
                          COALESCE(sum(price) FILTER (WHERE status = 'confirmed'), 0)::int AS "estimatedBookingValue"
                   FROM bookings`),
            query(`SELECT count(*)::int AS "technicianProfiles",
                          count(*) FILTER (
                              WHERE suspended_until IS NULL OR suspended_until <= now()
                          )::int AS "availableTechnicianProfiles"
                   FROM technicians
                   WHERE deleted_at IS NULL`)
        ]);
        res.json({
            ...accounts.rows[0],
            ...bookings.rows[0],
            ...technicians.rows[0]
        });
    } catch (error) { next(error); }
});

router.get("/users", async (req, res, next) => {
    try {
        const role = req.query.role ? z.enum(["customer", "technician"]).parse(req.query.role) : null;
        const search = String(req.query.q || "").trim().slice(0, 100);
        const conditions = ["deleted_at IS NULL", "role IN ('customer', 'technician')"];
        const params = [];
        if (role) {
            params.push(role);
            conditions.push(`role = $${params.length}`);
        }
        if (search) {
            params.push(`%${search}%`);
            conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length} OR phone ILIKE $${params.length})`);
        }
        const { rows } = await query(
            `SELECT id, role, name, email, phone, created_at AS "createdAt",
                    CASE WHEN suspended_until > now() THEN suspended_until ELSE NULL END AS "suspendedUntil"
             FROM users
             WHERE ${conditions.join(" AND ")}
             ORDER BY created_at DESC`,
            params
        );
        res.json({ users: rows });
    } catch (error) { next(error); }
});

router.patch("/users/:id/suspension", async (req, res, next) => {
    try {
        const id = idSchema.parse(req.params.id);
        const suspendedUntil = parseSuspension(req.body);
        const { rows } = await query(
            `UPDATE users SET suspended_until = $2
             WHERE id = $1 AND role IN ('customer', 'technician') AND deleted_at IS NULL
             RETURNING id, role, name, CASE WHEN suspended_until > now() THEN suspended_until ELSE NULL END AS "suspendedUntil"`,
            [id, suspendedUntil]
        );
        if (!rows[0]) throw new HttpError(404, "Account not found.");
        res.json({ user: rows[0] });
    } catch (error) { next(error); }
});

router.delete("/users/:id", async (req, res, next) => {
    let client;
    let transactionStarted = false;
    try {
        const id = idSchema.parse(req.params.id);
        client = await pool.connect();
        await client.query("BEGIN");
        transactionStarted = true;
        const { rows } = await client.query(
            `UPDATE users
             SET name = 'Deleted account',
                 email = 'deleted+' || id::text || '@deleted.invalid',
                 phone = 'deleted:' || id::text,
                 district = NULL,
                 profile = NULL,
                 suspended_until = NULL,
                 deleted_at = now()
             WHERE id = $1 AND role IN ('customer', 'technician') AND deleted_at IS NULL
             RETURNING id`,
            [id]
        );
        if (!rows[0]) throw new HttpError(404, "Account not found.");
        await client.query(
            `UPDATE bookings
             SET user_id = NULL, name = 'Deleted user', phone = 'Removed',
                 email = NULL, address = 'Removed', notes = NULL
             WHERE user_id = $1`,
            [id]
        );
        await client.query("COMMIT");
        transactionStarted = false;
        res.json({ deleted: true });
    } catch (error) {
        if (transactionStarted) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("Could not roll back account anonymization:", rollbackError);
            }
        }
        next(error);
    } finally {
        client?.release();
    }
});

router.get("/technicians", async (_req, res, next) => {
    try {
        const { rows } = await query(
            `SELECT id, name, trade, status, price,
                    CASE WHEN suspended_until > now() THEN suspended_until ELSE NULL END AS "suspendedUntil"
             FROM technicians
             WHERE deleted_at IS NULL
             ORDER BY name`
        );
        res.json({ technicians: rows });
    } catch (error) { next(error); }
});

router.patch("/technicians/:id/suspension", async (req, res, next) => {
    try {
        const id = technicianIdSchema.parse(req.params.id);
        const suspendedUntil = parseSuspension(req.body);
        const { rows } = await query(
            `UPDATE technicians SET suspended_until = $2
             WHERE id = $1 AND deleted_at IS NULL
             RETURNING id, name, CASE WHEN suspended_until > now() THEN suspended_until ELSE NULL END AS "suspendedUntil"`,
            [id, suspendedUntil]
        );
        if (!rows[0]) throw new HttpError(404, "Technician listing not found.");
        res.json({ technician: rows[0] });
    } catch (error) { next(error); }
});

router.delete("/technicians/:id", async (req, res, next) => {
    try {
        const id = technicianIdSchema.parse(req.params.id);
        const { rowCount } = await query(
            `UPDATE technicians
             SET deleted_at = now(), suspended_until = NULL, status = 'pending-review'
             WHERE id = $1 AND deleted_at IS NULL`,
            [id]
        );
        if (!rowCount) throw new HttpError(404, "Technician listing not found.");
        res.json({ deleted: true });
    } catch (error) { next(error); }
});

export default router;
