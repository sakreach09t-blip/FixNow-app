import { functionBaseUrl } from "@neon/env";
import { Router } from "express";
import { config } from "../config.js";
import { HttpError } from "../util.js";

const router = Router();

router.get("/hello", async (_req, res, next) => {
    try {
        if (!config.neonBranchId || !config.neonFunctionHostSuffix) {
            throw new HttpError(503, "Neon Functions are not configured on this server.");
        }
        const response = await fetch(functionBaseUrl("hello"), { signal: AbortSignal.timeout(10_000) });
        if (!response.ok) throw new HttpError(502, `Neon Function request failed (${response.status}).`);
        res.json({ message: await response.text() });
    } catch (error) { next(error); }
});

export default router;
