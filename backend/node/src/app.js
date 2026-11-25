import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { ZodError } from "zod";
import { config } from "./config.js";
import aiRoutes from "./routes/ai.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import bookingRoutes from "./routes/bookings.js";
import contactRoutes from "./routes/contact.js";
import metaRoutes from "./routes/meta.js";
import neonRoutes from "./routes/neon.js";
import technicianRoutes from "./routes/technicians.js";
import { HttpError } from "./util.js";
import { query } from "./db.js";

export function createApp() {
    const app = express();
    app.set("trust proxy", 1);
    app.use(helmet());
    app.use((req, res, next) => {
        if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
        const origin = req.get("origin");
        if (origin && !config.corsOrigin.includes(origin)) {
            return res.status(403).json({ error: "Cross-origin request blocked." });
        }
        next();
    });
    app.use(cors({ origin: config.corsOrigin }));
    app.use(express.json({ limit: "50kb" }));

    app.get("/api/health", async (_req, res, next) => {
        try {
            await query("SELECT 1");
            res.json({ status: "ok" });
        } catch (error) { next(error); }
    });

    const limit = (max) => rateLimit({ windowMs: 15 * 60 * 1000, max, standardHeaders: true, legacyHeaders: false, message: { error: "Too many requests. Please try again in a few minutes." } });
    app.use("/api", limit(Number(process.env.RATE_LIMIT || 600)));

    app.use("/api", metaRoutes);
    app.use("/api/ai", aiRoutes);
    app.use("/api/neon", neonRoutes);
    app.use("/api/admin", limit(120), adminRoutes);
    app.use("/api/technicians", limit(Number(process.env.TECHNICIAN_RATE_LIMIT || 300)), technicianRoutes);
    app.use("/api/auth", limit(Number(process.env.AUTH_RATE_LIMIT || 60)), authRoutes);
    app.use("/api/bookings", bookingRoutes);
    app.use("/api/contact", limit(20), contactRoutes);

    app.use("/api", (_req, _res, next) => next(new HttpError(404, "Not found.")));

    // eslint-disable-next-line no-unused-vars
    app.use((error, _req, res, _next) => {
        if (error instanceof ZodError) {
            const fields = {};
            for (const issue of error.issues) fields[issue.path.join(".") || "form"] ??= issue.message;
            return res.status(400).json({ error: Object.values(fields)[0] || "Please check the form.", fields });
        }
        if (error instanceof HttpError) return res.status(error.status).json({ error: error.message, fields: error.fields });
        console.error(error);
        res.status(500).json({ error: "Something went wrong on our side. Please try again." });
    });
    return app;
}
