import { config } from "./config.js";

/** Small client for the Python service. Every call has a timeout; callers decide on a fallback. */
async function call(path, body, { timeout = 2500, expect = "json" } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(`${config.pythonUrl}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal
        });
        if (!response.ok) throw new Error(`Python service answered ${response.status}`);
        return expect === "text" ? await response.text() : await response.json();
    } finally {
        clearTimeout(timer);
    }
}

export const python = {
    rank: (query, technicians) => call("/rank", { query, technicians }),
    validateBooking: (date, slot) => call("/validate-booking", { date, slot }),
    ics: (booking) => call("/ics", booking, { expect: "text" })
};
