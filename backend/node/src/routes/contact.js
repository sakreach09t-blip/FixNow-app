import { Router } from "express";
import { query } from "../db.js";
import { contactSchema } from "../validation.js";

const router = Router();

router.post("/", async (req, res, next) => {
    try {
        const data = contactSchema.parse(req.body);
        await query("INSERT INTO messages (name, email, topic, message) VALUES ($1,$2,$3,$4)", [data.name, data.email, data.topic, data.message]);
        res.status(201).json({ ok: true });
    } catch (error) { next(error); }
});

export default router;
