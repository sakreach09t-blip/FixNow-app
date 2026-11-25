import { Router } from "express";
import { rawSql } from "@neon/realtime/server";
import { pool, query } from "../db.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { python } from "../python.js";
import { realtime } from "../realtime.js";
import { HttpError, bookingRef, bookingState, normalizePhone, validateBookingLocally } from "../util.js";
import { bookingSchema } from "../validation.js";

const router = Router();

const SELECT = `
    SELECT b.id, b.technician_id AS "techId", t.name AS "techName", b.service, b.date, b.slot,
           s.label AS "slotLabel", s.start_hour, s.end_hour, b.district, b.address, b.name, b.phone,
           b.email, b.notes, b.price, b.status, b.created_at AS "createdAt", b.user_id
    FROM bookings b
    JOIN technicians t ON t.id = b.technician_id
    JOIN slots s ON s.id = b.slot`;

function present(row) {
    const { start_hour, end_hour, user_id, ...rest } = row;
    return { ...rest, state: bookingState(row) };
}

/** Owner (signed in) or someone who knows the reference AND the phone number used to book. */
async function loadAuthorized(req, id) {
    const { rows } = await query(`${SELECT} WHERE b.id = $1`, [String(id).toUpperCase()]);
    const booking = rows[0];
    if (!booking) throw new HttpError(404, "Booking not found.");
    const phone = normalizePhone(req.body?.phone ?? req.query.phone);
    const isOwner = req.user && booking.user_id === req.user.id;
    if (!isOwner && !(phone && phone === booking.phone)) throw new HttpError(404, "Booking not found.");
    return booking;
}

router.post("/", optionalAuth, async (req, res, next) => {
    try {
        const data = bookingSchema.parse(req.body);

        const slotResult = await query("SELECT id, label, start_hour, end_hour FROM slots WHERE id = $1", [data.slot]);
        const slot = slotResult.rows[0];
        if (!slot) throw new HttpError(400, "Unknown time slot.", { slot: "Choose a time slot." });
        const districtResult = await query("SELECT 1 FROM districts WHERE name = $1", [data.district]);
        if (!districtResult.rowCount && data.district !== "Other (Phnom Penh)") throw new HttpError(400, "Unknown district.", { district: "Choose a district." });

        let verdict;
        try {
            verdict = await python.validateBooking(data.date, { id: slot.id, start_hour: slot.start_hour, end_hour: slot.end_hour });
        } catch (error) {
            console.warn("Python validate unavailable, using local rules:", error.message);
            verdict = validateBookingLocally(data.date, slot);
        }
        if (!verdict.ok) throw new HttpError(400, verdict.reason, { date: verdict.reason });

        let id;
        for (let attempt = 0; attempt < 5; attempt++) {
            const client = await pool.connect();
            let transactionStarted = false;
            try {
                await client.query("BEGIN");
                transactionStarted = true;
                const techResult = await client.query(
                    "SELECT id, name, price, status, provides, suspended_until, deleted_at FROM technicians WHERE id = $1 FOR UPDATE",
                    [data.techId]
                );
                const tech = techResult.rows[0];
                if (!tech) throw new HttpError(404, "Technician not found.", { tech: "Technician not found." });
                if (tech.deleted_at || (tech.suspended_until && new Date(tech.suspended_until) > new Date())) {
                    throw new HttpError(409, "This technician is currently unavailable.", { tech: "Choose another technician." });
                }
                if (tech.status !== "available") throw new HttpError(409, `${tech.name} is currently busy. Please choose another technician.`, { tech: "This technician is busy." });
                if (data.service !== "Other / not sure" && !tech.provides.includes(data.service)) {
                    throw new HttpError(400, "That service is not offered by this technician.", { service: "Choose a service from the list." });
                }

                id = bookingRef();
                await client.query(
                    `INSERT INTO bookings (id, user_id, technician_id, service, date, slot, district, address, name, phone, email, notes, price)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                    [id, req.user?.id ?? null, tech.id, data.service, data.date, slot.id, data.district, data.address,
                     data.name, data.phone, data.email || null, data.notes || null, tech.price]
                );
                await client.query("COMMIT");
                transactionStarted = false;
                break;
            } catch (error) {
                if (transactionStarted) {
                    try {
                        await client.query("ROLLBACK");
                    } catch (rollbackError) {
                        console.error("Could not roll back booking transaction:", rollbackError);
                    }
                }
                if (error.code === "23505" && error.constraint === "bookings_slot_key") {
                    throw new HttpError(409, "That time was just taken. Please choose another.", { slot: "That time was just taken. Please choose another." });
                }
                if (error.code === "23505" && error.constraint === "bookings_pkey" && attempt < 4) continue;
                throw error;
            } finally {
                client.release();
            }
        }
        const { rows } = await query(`${SELECT} WHERE b.id = $1`, [id]);
        res.status(201).json({ booking: present(rows[0]) });
    } catch (error) { next(error); }
});

router.get("/", requireAuth, async (req, res, next) => {
    try {
        const { rows } = await query(`${SELECT} WHERE b.user_id = $1 ORDER BY b.date, s.start_hour`, [req.user.id]);
        res.json({ bookings: rows.map(present) });
    } catch (error) { next(error); }
});

router.get("/live", requireAuth, async (req, res, next) => {
    try {
        if (!realtime) throw new HttpError(503, "Neon Realtime is not configured on this server.");
        const query = rawSql(
            `SELECT b.id, b.status, b.date::text AS date
             FROM bookings b
             JOIN users u ON u.id = b.user_id
             WHERE u.auth_subject = $1
             ORDER BY b.date, b.id`,
            [req.auth.subject]
        );
        res.json(await realtime.seal({ query }));
    } catch (error) { next(error); }
});

router.get("/lookup", async (req, res, next) => {
    try {
        const phone = normalizePhone(req.query.phone);
        const ref = String(req.query.ref || "").trim().toUpperCase();
        const { rows } = await query(`${SELECT} WHERE b.id = $1 AND b.phone = $2`, [ref, phone]);
        if (!rows[0]) throw new HttpError(404, "We couldn't find a booking with that reference and phone number.");
        res.json({ booking: present(rows[0]) });
    } catch (error) { next(error); }
});

router.post("/:id/cancel", optionalAuth, async (req, res, next) => {
    try {
        const booking = await loadAuthorized(req, req.params.id);
        const state = bookingState(booking);
        if (state === "cancelled") throw new HttpError(409, "This booking is already cancelled.");
        if (state === "past") throw new HttpError(409, "This booking has already taken place.");
        await query("UPDATE bookings SET status = 'cancelled', cancelled_at = now() WHERE id = $1", [booking.id]);
        const { rows } = await query(`${SELECT} WHERE b.id = $1`, [booking.id]);
        res.json({ booking: present(rows[0]) });
    } catch (error) { next(error); }
});

router.get("/:id/ics", optionalAuth, async (req, res, next) => {
    try {
        const b = await loadAuthorized(req, req.params.id);
        const payload = {
            id: b.id, technician: b.techName, service: b.service, date: b.date,
            start_hour: b.start_hour, end_hour: b.end_hour, address: b.address, district: b.district, price: b.price
        };
        let text;
        try {
            text = await python.ics(payload);
        } catch (error) {
            console.warn("Python ics unavailable, using local builder:", error.message);
            const esc = (value) => String(value).replace(/\r\n?/g, "\n").replace(/\\/g, "\\\\").replace(/[;,]/g, "\\$&").replace(/\n/g, "\\n");
            const [year, month, day] = b.date.split("-").map(Number);
            const utcTime = (hour) => new Date(Date.UTC(year, month - 1, day, hour - 7))
                .toISOString().replace(/[-:]/g, "").replace(".000Z", "Z");
            const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
            text = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//FixNow//Booking//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
                `UID:${esc(b.id)}@fixnow`, `DTSTAMP:${stamp}`, `DTSTART:${utcTime(b.start_hour)}`, `DTEND:${utcTime(b.end_hour)}`,
                `SUMMARY:${esc(`FixNow: ${b.service} with ${b.techName}`)}`, `LOCATION:${esc(`${b.address}, ${b.district}`)}`,
                `DESCRIPTION:${esc(`Booking reference ${b.id}. Starting price $${b.price}, confirmed on site.`)}`,
                "END:VEVENT", "END:VCALENDAR"].join("\r\n") + "\r\n";
        }
        res.type("text/calendar").set("Content-Disposition", `attachment; filename="fixnow-${b.id}.ics"`).send(text);
    } catch (error) { next(error); }
});

export default router;
