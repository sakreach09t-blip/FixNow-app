import { createRealtime } from "@neon/realtime/server";
import { config } from "./config.js";

export const realtime = config.neonRealtimeSecret
    ? createRealtime({ secret: config.neonRealtimeSecret, db: "neondb" })
    : null;
