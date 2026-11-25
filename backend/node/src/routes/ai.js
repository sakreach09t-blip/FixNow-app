import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../util.js";

const router = Router();

async function getModels() {
    if (!config.aiGatewayBaseUrl || !config.aiGatewayToken) {
        throw new HttpError(503, "Neon AI Gateway is not configured on this server.");
    }
    const response = await fetch(`${config.aiGatewayBaseUrl}/v1/models`, {
        headers: { Authorization: `Bearer ${config.aiGatewayToken}` },
        signal: AbortSignal.timeout(10_000)
    });
    if (!response.ok) throw new HttpError(502, `Neon AI Gateway model lookup failed (${response.status}).`);
    const result = await response.json();
    return Array.isArray(result.data) ? result.data : [];
}

router.get("/models", async (_req, res, next) => {
    try {
        const models = await getModels();
        res.json({
            models: models.map(({ id, enabled, unavailable_reason, recovery_url }) => ({
                id, enabled, unavailableReason: unavailable_reason, recoveryUrl: recovery_url
            }))
        });
    } catch (error) { next(error); }
});

router.post("/assist", requireAuth, async (req, res, next) => {
    try {
        const { prompt, model: requestedModel } = z.object({
            prompt: z.string().trim().min(1).max(2000),
            model: z.string().trim().min(1).optional()
        }).parse(req.body);
        const models = await getModels();
        const available = models.filter((entry) => entry.enabled === true);
        if (!available.length) {
            throw new HttpError(503, "No Neon AI models are enabled. Add AI Gateway credits in Neon Billing to use this feature.");
        }
        const model = requestedModel
            ? available.find((entry) => entry.id === requestedModel)
            : available[0];
        if (!model) throw new HttpError(400, "That model is not enabled for this Neon branch.");

        const response = await fetch(`${config.aiGatewayBaseUrl}/v1/chat/completions`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.aiGatewayToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: model.id,
                messages: [
                    { role: "system", content: "You are FixNow's home-service assistant. Give concise, practical guidance and recommend booking a qualified technician for work that may be unsafe." },
                    { role: "user", content: prompt }
                ]
            }),
            signal: AbortSignal.timeout(30_000)
        });
        if (!response.ok) throw new HttpError(502, `Neon AI Gateway request failed (${response.status}).`);
        const result = await response.json();
        const answer = result.choices?.[0]?.message?.content;
        if (typeof answer !== "string" || !answer) throw new HttpError(502, "Neon AI Gateway returned no answer.");
        res.json({ answer, model: model.id });
    } catch (error) { next(error); }
});

export default router;
