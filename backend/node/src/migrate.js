import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config } from "./config.js";

/** Creates tables and loads the starter content (services, technicians, slots, districts). */
export async function migrate() {
    const pool = new pg.Pool({ connectionString: config.databaseUrlUnpooled || config.databaseUrl });
    try {
        const schema = fs.readFileSync(path.join(config.dbDir, "schema.sql"), "utf8");
        await pool.query(schema);

        const seed = JSON.parse(fs.readFileSync(path.join(config.dbDir, "seed-data.json"), "utf8"));
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            for (const [i, s] of seed.services.entries()) {
                await client.query(
                    `INSERT INTO services (id, name, icon, short, long_desc, includes, jobs, sort)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                 ON CONFLICT (id) DO UPDATE SET name=$2, icon=$3, short=$4, long_desc=$5, includes=$6, jobs=$7, sort=$8`,
                    [s.id, s.name, s.icon, s.short, s.long, s.includes, s.jobs, i]
                );
            }
            for (const [i, s] of seed.slots.entries()) {
                await client.query(
                    `INSERT INTO slots (id, label, start_hour, end_hour, sort) VALUES ($1,$2,$3,$4,$5)
                 ON CONFLICT (id) DO UPDATE SET label=$2, start_hour=$3, end_hour=$4, sort=$5`,
                    [s.id, s.label, s.start, s.end, i]
                );
            }
            for (const [i, name] of seed.districts.entries()) {
                await client.query(
                    "INSERT INTO districts (name, sort) VALUES ($1,$2) ON CONFLICT (name) DO UPDATE SET sort=$2",
                    [name, i]
                );
            }
            // Technicians are only seeded into an empty table so later edits in the database are never overwritten.
            const { rows } = await client.query("SELECT count(*)::int AS n FROM technicians");
            if (rows[0].n === 0) {
                for (const t of seed.technicians) {
                    await client.query(
                        `INSERT INTO technicians (id, name, trade, skills, provides, price, status, rating, jobs, years, areas, languages, bio)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                        [t.id, t.name, t.trade, t.skills, t.provides, t.price, t.status, t.rating, t.jobs, t.years, t.areas, t.languages, t.bio]
                    );
                    for (const serviceId of t.services) {
                        await client.query("INSERT INTO technician_services (technician_id, service_id) VALUES ($1,$2)", [t.id, serviceId]);
                    }
                }
            }
            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    } finally {
        await pool.end();
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    migrate().then(() => { console.log("Database ready."); }).catch((error) => { console.error(error); process.exit(1); });
}
