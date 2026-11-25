export const PHONE_RE = /^\+?[0-9]{8,12}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const normalizePhone = (value) => String(value || "").replace(/[\s\-().]/g, "");

const pad = (n) => String(n).padStart(2, "0");
export const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function parseDate(value) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
}
export const formatDate = (value, options) =>
    parseDate(value).toLocaleDateString("en-GB", options || { weekday: "short", day: "numeric", month: "short", year: "numeric" });

// Same wording as the original page validators.
export const rules = {
    name: (v) => (v.trim().length >= 2 ? "" : "Please enter your full name."),
    phone: (v) => (PHONE_RE.test(normalizePhone(v)) ? "" : "Enter a valid phone number, e.g. 012 345 678."),
    email: (v) => (EMAIL_RE.test(v.trim()) ? "" : "Enter a valid email address."),
    emailOptional: (v) => (!v.trim() || EMAIL_RE.test(v.trim()) ? "" : "Enter a valid email address."),
    password: (v) => (v.length >= 8 ? "" : "Use at least 8 characters."),
    required: (label) => (v) => ((Array.isArray(v) ? v.length : String(v ?? "").trim()) ? "" : `${label} is required.`)
};

export const downloadBlob = (blob, filename) => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
};
