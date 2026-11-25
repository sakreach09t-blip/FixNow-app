import pg from "pg";
import { config } from "./config.js";

// Return DATE columns as plain "YYYY-MM-DD" strings instead of JS Dates (avoids timezone shifts).
pg.types.setTypeParser(1082, (value) => value);
// NUMERIC(2,1) ratings come back as numbers.
pg.types.setTypeParser(1700, (value) => Number(value));

export const pool = new pg.Pool({ connectionString: config.databaseUrl });
export const query = (text, params) => pool.query(text, params);
