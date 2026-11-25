import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import { config } from "../config.js";
import { query } from "../db.js";

const seed = JSON.parse(fs.readFileSync(path.join(config.dbDir, "seed-data.json"), "utf8"));
const router = Router();

/** Everything the front end needs to render forms, filters and static content in one request. */
router.get("/meta", async (_req, res, next) => {
    try {
        const [services, slots, districts, counts] = await Promise.all([
            query(`SELECT s.id, s.name, s.icon, s.short, s.long_desc AS "long", s.includes, s.jobs,
                          (SELECT count(*)::int FROM technician_services ts JOIN technicians t ON t.id = ts.technician_id
                           WHERE ts.service_id = s.id AND t.deleted_at IS NULL AND (t.suspended_until IS NULL OR t.suspended_until <= now())) AS "technicianCount",
                          (SELECT min(t.price) FROM technician_services ts JOIN technicians t ON t.id = ts.technician_id
                           WHERE ts.service_id = s.id AND t.deleted_at IS NULL AND (t.suspended_until IS NULL OR t.suspended_until <= now())) AS "fromPrice"
                   FROM services s ORDER BY s.sort`),
            query(`SELECT id, label, start_hour AS "start", end_hour AS "end" FROM slots ORDER BY sort`),
            query("SELECT name FROM districts ORDER BY sort"),
            query(`SELECT count(*)::int AS technicians, count(*) FILTER (WHERE status = 'available')::int AS available
                   FROM technicians
                   WHERE deleted_at IS NULL AND (suspended_until IS NULL OR suspended_until <= now())`)
        ]);
        res.json({
            services: services.rows,
            slots: slots.rows,
            districts: districts.rows.map((d) => d.name),
            contact: seed.contact,
            faq: seed.faq,
            stats: counts.rows[0]
        });
    } catch (error) { next(error); }
});

router.get("/health", (_req, res) => res.json({ ok: true, service: "fixnow-api" }));

export default router;
