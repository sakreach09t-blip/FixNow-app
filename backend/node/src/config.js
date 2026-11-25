import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "../../..");

dotenv.config({ path: path.join(projectRoot, ".env.local") });
dotenv.config({ path: path.join(here, "../.env") });

export const config = {
    port: Number(process.env.PORT || 4000),
    databaseUrl: process.env.DATABASE_URL || "postgres://fixnow:fixnow@localhost:5432/fixnow",
    databaseUrlUnpooled: process.env.DATABASE_URL_UNPOOLED,
    neonAuthBaseUrl: process.env.NEON_AUTH_BASE_URL,
    neonAuthJwksUrl: process.env.NEON_AUTH_JWKS_URL,
    neonRealtimeSecret: process.env.NEON_REALTIME_SECRET,
    neonBranchId: process.env.NEON_BRANCH_ID,
    neonFunctionHostSuffix: process.env.NEON_FUNCTION_HOST_SUFFIX,
    aiGatewayBaseUrl: process.env.NEON_AI_GATEWAY_BASE_URL,
    aiGatewayToken: process.env.NEON_AI_GATEWAY_TOKEN,
    pythonUrl: process.env.PYTHON_URL || "http://localhost:8000",
    corsOrigin: (process.env.CORS_ORIGIN || "http://localhost:5173").split(","),
    dbDir: process.env.DB_DIR || path.resolve(here, "../../../db"),
    timezone: "Asia/Phnom_Penh",
    isProduction: process.env.NODE_ENV === "production"
};

