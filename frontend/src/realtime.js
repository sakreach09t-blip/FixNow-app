import { createRealtimeClient } from "@neon/realtime/client";

const url = import.meta.env.VITE_NEON_REALTIME_URL;
export const realtimeClient = url ? createRealtimeClient({ url }) : null;

const RENEW_EARLY_MS = 10_000;
const RETRY_MS = 1_000;

export function renewBeforeExpiry(subscription, sealedQuery, fetchSealedQuery, onError) {
    let timer;
    let stopped = false;

    function schedule(delay) {
        clearTimeout(timer);
        if (!stopped) timer = setTimeout(renew, delay);
    }

    function scheduleBeforeExpiry(expiresAt) {
        schedule(Math.max(0, expiresAt - Date.now() - RENEW_EARLY_MS));
    }

    async function renew() {
        let next;
        try {
            next = await fetchSealedQuery();
        } catch (error) {
            console.warn("Could not refresh the Neon Realtime query; retrying:", error);
            schedule(RETRY_MS);
            return;
        }

        scheduleBeforeExpiry(next.expiresAt);
        subscription.renew(next).catch((error) => {
            stop();
            onError(error);
        });
    }

    function stop() {
        stopped = true;
        clearTimeout(timer);
    }

    scheduleBeforeExpiry(sealedQuery.expiresAt);
    return stop;
}
