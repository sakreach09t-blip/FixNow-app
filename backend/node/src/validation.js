import { z } from "zod";
import { normalizePhone } from "./util.js";

const phone = z.string().trim().transform(normalizePhone)
    .refine((v) => /^\+?[0-9]{8,12}$/.test(v), "Enter a valid phone number, e.g. 012 345 678.");
const email = z.string().trim().email("Enter a valid email address.");
const name = z.string().trim().min(2, "Please enter your full name.").max(80);
const legacyPassword = z.string().max(100).optional();

export const customerSchema = z.object({
    role: z.literal("customer"),
    name, phone, email,
    district: z.string().trim().min(1, "District is required."),
    legacyPassword
});

export const technicianSchema = z.object({
    role: z.literal("technician"),
    name, phone, email, legacyPassword,
    trade: z.string().trim().min(1, "Main trade is required."),
    experience: z.coerce.number().int().min(0).max(50, "Enter your years of experience (0 to 50)."),
    price: z.coerce.number().int().min(1).max(500, "Enter a starting price in US dollars."),
    areas: z.array(z.string()).min(1, "Choose at least one area you can cover."),
    skills: z.string().trim().min(10, "Tell us a little about your skills (at least 10 characters).").max(500)
});

export const registerSchema = z.discriminatedUnion("role", [customerSchema, technicianSchema]);

export const bookingSchema = z.object({
    techId: z.string().trim().min(1, "Technician is required."),
    service: z.string().trim().min(1, "Service is required."),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
    slot: z.string().trim().min(1, "A time slot is required."),
    district: z.string().trim().min(1, "District is required."),
    address: z.string().trim().min(5, "Enter the street, house number or landmark.").max(200),
    name, phone,
    email: z.string().trim().optional().refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), "Enter a valid email address."),
    notes: z.string().trim().max(1000).optional()
});

export const contactSchema = z.object({
    name, email,
    topic: z.string().trim().min(1, "Topic is required.").max(80),
    message: z.string().trim().min(10, "Please write at least a short sentence.").max(3000)
});
