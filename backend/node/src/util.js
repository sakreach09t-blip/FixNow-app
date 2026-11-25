import crypto from "node:crypto";
import { config } from "./config.js";

export class HttpError extends Error {
    constructor(status, message, fields) {
        super(message);
        this.status = status;
        this.fields = fields;
    }
}

export const normalizePhone = (value) => String(value || "").replace(/[\s\-().]/g, "");

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
export function bookingRef() {
    const bytes = crypto.randomBytes(6);
    return "FN-" + Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Current date/time parts in Phnom Penh, independent of where the server runs. */
export function phnomPenhNow() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: config.timezone, year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date());
    const get = (type) => parts.find((p) => p.type === type).value;
    return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export function addDays(isoDate, days) {
    const [y, m, d] = isoDate.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d + days));
    return date.toISOString().slice(0, 10);
}

/** Same rules as the Python /validate-booking endpoint; used if that service is unreachable. */
export function validateBookingLocally(date, slot) {
    const now = phnomPenhNow();
    if (date < now.date) return { ok: false, reason: "That date has already passed." };
    if (date > addDays(now.date, 60)) return { ok: false, reason: "Please choose a date within the next 60 days." };
    if (date === now.date && slot.start_hour * 60 < now.minutes + 60) {
        return { ok: false, reason: "That time is too soon. Please choose a slot at least an hour from now." };
    }
    return { ok: true };
}

export function bookingState(booking) {
    if (booking.status === "cancelled") return "cancelled";
    const now = phnomPenhNow();
    const endMinutes = booking.end_hour * 60;
    const past = booking.date < now.date || (booking.date === now.date && endMinutes <= now.minutes);
    return past ? "past" : "upcoming";
}
