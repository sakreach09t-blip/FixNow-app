import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";

test("blocks untrusted origins and allows configured origins and non-browser requests", async () => {
    const server = createApp().listen(0);
    await new Promise((resolve, reject) => {
        server.once("listening", resolve);
        server.once("error", reject);
    });

    try {
        const address = server.address();
        const baseUrl = `http://127.0.0.1:${address.port}/api/not-found`;
        const sendWrite = (headers = {}) => fetch(baseUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...headers },
            body: "{}"
        });

        const blocked = await sendWrite({ Origin: "https://attacker.example" });
        assert.equal(blocked.status, 403);
        assert.deepEqual(await blocked.json(), { error: "Cross-origin request blocked." });

        const sameOrigin = await sendWrite({ Origin: "http://localhost:5173" });
        assert.equal(sameOrigin.status, 404);

        const nonBrowser = await sendWrite();
        assert.equal(nonBrowser.status, 404);
    } finally {
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
});
