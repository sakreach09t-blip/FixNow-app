import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

// In development the React app runs on :5173 and forwards /api calls to the Node API on :4000.
const projectRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, projectRoot, "");
    return {
        envDir: projectRoot,
        define: {
            "import.meta.env.VITE_NEON_REALTIME_URL": JSON.stringify(env.VITE_NEON_REALTIME_URL || env.NEON_REALTIME_URL || "")
        },
        plugins: [react()],
        server: {
            port: 5173,
            proxy: { "/api": process.env.VITE_API_PROXY || "http://localhost:4000" }
        },
        preview: {
            port: 4173,
            proxy: { "/api": process.env.VITE_API_PROXY || "http://localhost:4000" }
        }
    };
});
