// All talking to the back end happens here. In dev, Vite proxies /api to the Node server.
import { auth } from "./auth.js";

const BASE = import.meta.env.VITE_API_URL || "/api";

export class ApiError extends Error {
    constructor(status, message, fields) {
        super(message);
        this.status = status;
        this.fields = fields || {};
    }
}

async function request(path, { method = "GET", body, signal, blob = false } = {}) {
    const headers = {};
    if (body) headers["Content-Type"] = "application/json";
    const token = await auth?.currentUser?.getIdToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let response;
    try {
        response = await fetch(`${BASE}${path}`, { method, headers, signal, body: body ? JSON.stringify(body) : undefined });
    } catch (error) {
        if (error.name === "AbortError") throw error;
        throw new ApiError(0, "We can't reach FixNow right now. Check your connection and try again.");
    }
    if (blob) {
        if (!response.ok) throw new ApiError(response.status, "Could not download the file.");
        return response.blob();
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("json")) {
        const status = response.ok ? 502 : response.status;
        throw new ApiError(
            status,
            "The API returned a web page instead of JSON. Set VITE_API_URL to your deployed backend URL ending in /api."
        );
    }

    let data;
    try {
        data = await response.json();
    } catch {
        const status = response.ok ? 502 : response.status;
        throw new ApiError(status, "The API returned invalid JSON. Check the backend response.");
    }
    if (!response.ok) throw new ApiError(response.status, data.error || "Something went wrong.", data.fields);
    return data;
}

const qs = (params) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "" && v !== false) search.set(k, v === true ? "1" : v); });
    const text = search.toString();
    return text ? `?${text}` : "";
};

export const api = {
    meta: () => request("/meta"),
    neonFunctionHello: () => request("/neon/hello"),
    aiModels: () => request("/ai/models"),
    aiAssist: (prompt, model) => request("/ai/assist", { method: "POST", body: { prompt, model } }),
    technicians: (params, signal) => request(`/technicians${qs(params)}`, { signal }),
    slots: (id, date, signal) => request(`/technicians/${encodeURIComponent(id)}/slots${qs({ date })}`, { signal }),
    register: (data) => request("/auth/register", { method: "POST", body: data }),
    me: () => request("/auth/me"),
    createBooking: (data) => request("/bookings", { method: "POST", body: data }),
    myBookings: () => request("/bookings"),
    myBookingsLive: () => request("/bookings/live"),
    lookupBooking: (ref, phone) => request(`/bookings/lookup${qs({ ref, phone })}`),
    cancelBooking: (id, phone) => request(`/bookings/${encodeURIComponent(id)}/cancel`, { method: "POST", body: { phone } }),
    bookingIcs: (id, phone) => request(`/bookings/${encodeURIComponent(id)}/ics${qs({ phone })}`, { blob: true }),
    contact: (data) => request("/contact", { method: "POST", body: data }),
    adminSummary: () => request("/admin/summary"),
    adminUsers: () => request("/admin/users"),
    setAdminUserSuspension: (id, suspendedUntil) => request(`/admin/users/${encodeURIComponent(id)}/suspension`, { method: "PATCH", body: { suspendedUntil } }),
    deleteAdminUser: (id) => request(`/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
    adminTechnicians: () => request("/admin/technicians"),
    setAdminTechnicianSuspension: (id, suspendedUntil) => request(`/admin/technicians/${encodeURIComponent(id)}/suspension`, { method: "PATCH", body: { suspendedUntil } }),
    deleteAdminTechnician: (id) => request(`/admin/technicians/${encodeURIComponent(id)}`, { method: "DELETE" })
};
