import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";
import { config } from "../src/config.js";
import { registerSchema } from "../src/validation.js";

test("admin dashboard API rejects unauthenticated requests", async () => {
    const server = createApp().listen(0);
    await new Promise((resolve, reject) => {
        server.once("listening", resolve);
        server.once("error", reject);
    });

    try {
        const { port } = server.address();
        const response = await fetch(`http://127.0.0.1:${port}/api/admin/summary`);
        assert.equal(response.status, 401);
    } finally {
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
});

test("authenticated API requests report missing Firebase server configuration", async () => {
    const previousProjectId = config.firebaseProjectId;
    config.firebaseProjectId = "";
    const server = createApp().listen(0);
    await new Promise((resolve, reject) => {
        server.once("listening", resolve);
        server.once("error", reject);
    });

    try {
        const { port } = server.address();
        const response = await fetch(`http://127.0.0.1:${port}/api/auth/me`, {
            headers: { Authorization: "Bearer test-token" }
        });
        assert.equal(response.status, 503);
        assert.match((await response.json()).error, /FIREBASE_PROJECT_ID/);
    } finally {
        config.firebaseProjectId = previousProjectId;
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
});

test("public registration cannot create administrator accounts", () => {
    const result = registerSchema.safeParse({ role: "admin" });
    assert.equal(result.success, false);
});
