import { Router } from "express";
import { query } from "../db.js";
import { python } from "../python.js";
import { HttpError, phnomPenhNow } from "../util.js";

const router = Router();

const SELECT = `
    SELECT t.id, t.name, t.trade, t.skills, t.provides, t.price, t.status, t.rating, t.jobs, t.years,
           t.areas, t.languages, t.bio, t.photo,
           COALESCE(array_agg(ts.service_id ORDER BY ts.service_id) FILTER (WHERE ts.service_id IS NOT NULL), '{}') AS services,
           COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), '{}') AS "serviceNames"
    FROM technicians t
    LEFT JOIN technician_services ts ON ts.technician_id = t.id
    LEFT JOIN services s ON s.id = ts.service_id`;

const SORTERS = {
    recommended: (a, b) => (a.status === "busy") - (b.status === "busy") || b.rating - a.rating || b.jobs - a.jobs,
    rating: (a, b) => b.rating - a.rating || b.jobs - a.jobs,
    "price-asc": (a, b) => a.price - b.price || b.rating - a.rating,
    "price-desc": (a, b) => b.price - a.price || b.rating - a.rating,
    experience: (a, b) => b.years - a.years || b.jobs - a.jobs
};

/** Fallback matching runs on fetched records; user search text is never interpolated into SQL. */
function localSearch(q, list) {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return list.filter((t) => {
        const hay = `${t.name} ${t.trade} ${t.skills} ${t.provides.join(" ")} ${t.serviceNames.join(" ")} ${t.areas.join(" ")}`.toLowerCase();
        return words.every((w) => hay.includes(w));
    });
}

router.get("/", async (req, res, next) => {
    try {
        const { q = "", service, area, available, sort = "recommended", limit } = req.query;
        const where = [
            "t.deleted_at IS NULL",
            "(t.suspended_until IS NULL OR t.suspended_until <= now())"
        ];
        const params = [];
        if (service) { params.push(service); where.push(`EXISTS (SELECT 1 FROM technician_services x WHERE x.technician_id = t.id AND x.service_id = $${params.length})`); }
        if (area) { params.push(area); where.push(`$${params.length} = ANY(t.areas)`); }
        if (available === "1") where.push("t.status = 'available'");
        const { rows } = await query(`${SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""} GROUP BY t.id`, params);

        let list = rows;
        let ranked = false;
        const search = String(q).trim().slice(0, 100);
        if (search) {
            try {
                const result = await python.rank(search, rows.map((t) => ({
                    id: t.id, name: t.name, trade: t.trade, skills: t.skills, provides: t.provides,
                    services: t.serviceNames, areas: t.areas, rating: t.rating, jobs: t.jobs, status: t.status
                })));
                const order = new Map(result.map((r, i) => [r.id, i]));
                list = rows.filter((t) => order.has(t.id)).sort((a, b) => order.get(a.id) - order.get(b.id));
                ranked = true;
            } catch (error) {
                console.warn("Python rank unavailable, using simple search:", error.message);
                list = localSearch(search, rows);
            }
        }
        // A typed search keeps relevance order unless the person explicitly picked another sort.
        if (!(ranked && sort === "recommended")) list = [...list].sort(SORTERS[sort] || SORTERS.recommended);
        const total = list.length;
        const available_now = list.filter((t) => t.status === "available").length;
        if (limit) list = list.slice(0, Math.min(Number(limit) || 12, 50));
        res.json({ technicians: list, total, availableNow: available_now });
    } catch (error) { next(error); }
});

router.get("/:id", async (req, res, next) => {
    try {
        const { rows } = await query(
            `${SELECT} WHERE t.id = $1 AND t.deleted_at IS NULL AND (t.suspended_until IS NULL OR t.suspended_until <= now()) GROUP BY t.id`,
            [req.params.id]
        );
        if (!rows[0]) throw new HttpError(404, "Technician not found.");
        res.json(rows[0]);
    } catch (error) { next(error); }
});

/** Slots already taken (or too soon) for one technician on one date. */
router.get("/:id/slots", async (req, res, next) => {
    try {
        const date = String(req.query.date || "");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, "Provide ?date=YYYY-MM-DD.");
        const [technician, taken, slots] = await Promise.all([
            query("SELECT 1 FROM technicians WHERE id = $1 AND deleted_at IS NULL AND (suspended_until IS NULL OR suspended_until <= now())", [req.params.id]),
            query("SELECT slot FROM bookings WHERE technician_id = $1 AND date = $2 AND status <> 'cancelled'", [req.params.id, date]),
            query("SELECT id, start_hour FROM slots")
        ]);
        if (!technician.rowCount) throw new HttpError(404, "Technician not found.");
        const now = phnomPenhNow();
        const tooSoon = date < now.date ? slots.rows.map((s) => s.id)
            : date === now.date ? slots.rows.filter((s) => s.start_hour * 60 < now.minutes + 60).map((s) => s.id) : [];
        res.json({ taken: taken.rows.map((r) => r.slot), unavailable: tooSoon });
    } catch (error) { next(error); }
});

export default router;
