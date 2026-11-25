import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api.js";
import Field, { useForm } from "../components/Field.jsx";
import Icon from "../components/Icon.jsx";
import PageHero from "../components/PageHero.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useMeta } from "../context/MetaContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { downloadBlob, formatDate, isoDate, rules } from "../utils.js";

export default function Booking() {
    const { districts, slots } = useMeta();
    const { user } = useAuth();
    const toast = useToast();
    const [params] = useSearchParams();
    const [techs, setTechs] = useState([]);
    const [taken, setTaken] = useState({ taken: [], unavailable: [] });
    const [busyNotice, setBusyNotice] = useState("");
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [confirmed, setConfirmed] = useState(null);

    const form = useForm({
        tech: "", service: params.get("service") || "", notes: "", date: "", slot: "", district: user?.district || "",
        address: "", name: user?.name || "", phone: user?.phone || "", email: user?.email || ""
    });
    const { values } = form;

    const today = useMemo(() => new Date(), []);
    const latest = useMemo(() => { const d = new Date(today); d.setDate(d.getDate() + 60); return d; }, [today]);

    useEffect(() => { document.title = "Book a Technician | FixNow"; }, []);

    // The signed-in user can arrive after first render (page reload), so fill in contact details then.
    useEffect(() => {
        if (!user) return;
        form.setValues((v) => ({
            ...v, name: v.name || user.name || "", phone: v.phone || user.phone || "",
            email: v.email || user.email || "", district: v.district || user.district || ""
        }));
    }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    // Technicians who can be booked. A busy technician in the link shows a notice instead.
    useEffect(() => {
        const wanted = params.get("tech");
        api.technicians({ available: true }).then((d) => {
            setTechs(d.technicians);
            if (wanted) {
                if (d.technicians.some((t) => t.id === wanted)) form.set("tech", wanted);
                else api.technicians({}).then((all) => {
                    const t = all.technicians.find((x) => x.id === wanted);
                    if (t) setBusyNotice(`${t.name} is currently busy and cannot be booked right now. Please choose another available technician.`);
                });
            }
        }).catch((e) => setFormError(e.message));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const tech = techs.find((t) => t.id === values.tech);

    // Which slots are already booked for this technician and date?
    const refreshSlots = useCallback(() => {
        if (!values.tech || !values.date) { setTaken({ taken: [], unavailable: [] }); return; }
        api.slots(values.tech, values.date).then(setTaken).catch(() => {});
    }, [values.tech, values.date]);
    useEffect(refreshSlots, [refreshSlots]);

    // drop a chosen slot if it just became unavailable, or a service the new technician doesn't offer
    useEffect(() => {
        if (values.slot && (taken.taken.includes(values.slot) || taken.unavailable.includes(values.slot))) form.set("slot", "");
    }, [taken]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (tech && values.service && values.service !== "Other / not sure" && !tech.provides.includes(values.service)) form.set("service", "");
    }, [values.tech]); // eslint-disable-line react-hooks/exhaustive-deps

    const slot = slots.find((s) => s.id === values.slot);

    const onSubmit = async (e) => {
        e.preventDefault();
        setFormError("");
        const ok = form.validate({
            tech: rules.required("Technician"), service: rules.required("Service"),
            date: (v) => (!v ? "Pick a date." : v < isoDate(today) || v > isoDate(latest) ? "Choose a date within the next 60 days." : ""),
            slot: rules.required("A time slot"), district: rules.required("District"),
            address: (v) => (v.trim().length >= 5 ? "" : "Enter the street, house number or landmark."),
            name: rules.name, phone: rules.phone, email: rules.emailOptional
        });
        if (!ok) return;
        setSubmitting(true);
        try {
            const { booking } = await api.createBooking({
                techId: values.tech, service: values.service, date: values.date, slot: values.slot, district: values.district,
                address: values.address, name: values.name, phone: values.phone, email: values.email, notes: values.notes
            });
            setConfirmed(booking);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (error) {
            if (error instanceof ApiError && Object.keys(error.fields).length) {
                form.setErrors(Object.fromEntries(Object.entries(error.fields).map(([k, v]) => [k, v])));
                if (error.fields.slot) refreshSlots();
            } else setFormError(error.message);
        } finally { setSubmitting(false); }
    };

    const downloadIcs = async () => {
        try { downloadBlob(await api.bookingIcs(confirmed.id, confirmed.phone), `fixnow-${confirmed.id}.ics`); }
        catch (e) { toast(e.message); }
    };

    if (confirmed) {
        return (
            <>
                <PageHero crumb="Book" title="Book a technician">Choose a technician, a day and a time slot. It takes about a minute.</PageHero>
                <section className="page-section section-shell">
                    <div className="form-card success-panel confirm-card">
                        <Icon name="check" className="success-icon" />
                        <h2 tabIndex={-1}>Booking confirmed</h2>
                        <p>Your technician will contact you before the visit. Keep this reference handy.</p>
                        <div className="confirm-ref">{confirmed.id}</div>
                        <dl className="summary-list">
                            <div><dt>Technician</dt><dd>{confirmed.techName}</dd></div>
                            <div><dt>Service</dt><dd>{confirmed.service}</dd></div>
                            <div><dt>Date</dt><dd>{formatDate(confirmed.date)}</dd></div>
                            <div><dt>Time</dt><dd>{confirmed.slotLabel}</dd></div>
                            <div><dt>Address</dt><dd>{confirmed.address}, {confirmed.district}</dd></div>
                            <div><dt>Starting price</dt><dd>${confirmed.price}</dd></div>
                        </dl>
                        <div className="confirm-actions">
                            <button className="button button-secondary" type="button" onClick={downloadIcs}><Icon name="event" /> Add to calendar</button>
                            <Link className="button button-primary" to="/my-bookings">View my bookings</Link>
                            <Link className="button button-secondary" to="/technicians">Book another</Link>
                        </div>
                        {!user && <p className="form-note" style={{ marginTop: 22 }}>Booked as a guest? You can look this booking up later with the reference and your phone number.</p>}
                    </div>
                </section>
            </>
        );
    }

    return (
        <>
            <PageHero crumb="Book" title="Book a technician">Choose a technician, a day and a time slot. It takes about a minute.</PageHero>
            <section className="page-section section-shell">
                <div className="booking-layout">
                    <form className="form-card" onSubmit={onSubmit} noValidate>
                        {busyNotice && <div className="notice error" style={{ marginBottom: 22 }}><Icon name="info" /><span>{busyNotice}</span></div>}
                        {formError && <div className="notice error" role="alert" style={{ marginBottom: 22 }}><Icon name="error" /><span>{formError}</span></div>}

                        <div className="form-section">
                            <h2 className="form-section-title"><span>1</span> The job</h2>
                            <div className="form-grid">
                                <Field id="b-tech" name="tech" label="Technician" error={form.errors.tech}>
                                    <select {...form.input("tech", "b")} onChange={(e) => { setBusyNotice(""); form.set("tech", e.target.value); }}>
                                        <option value="">Choose a technician</option>
                                        {techs.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.trade} (from ${t.price})</option>)}
                                    </select></Field>
                                <Field id="b-service" name="service" label="Service" error={form.errors.service}>
                                    <select {...form.input("service", "b")} disabled={!tech}>
                                        <option value="">{tech ? "Select a service" : "Choose a technician first"}</option>
                                        {tech && [...tech.provides, "Other / not sure"].map((p) => <option key={p} value={p}>{p}</option>)}
                                    </select></Field>
                                <Field id="b-notes" name="notes" label="Describe the problem" required={false} full hint="Optional, but it helps your technician prepare." error={form.errors.notes}>
                                    <textarea {...form.input("notes", "b")} rows={3} placeholder="What is happening, what have you tried, anything the technician should bring?" /></Field>
                            </div>
                        </div>

                        <div className="form-section">
                            <h2 className="form-section-title"><span>2</span> Date and time</h2>
                            <div className="form-grid">
                                <Field id="b-date" name="date" label="Date" error={form.errors.date}>
                                    <input {...form.input("date", "b")} type="date" min={isoDate(today)} max={isoDate(latest)} /></Field>
                                <div className="field full">
                                    <span className="label" id="slot-label">Time slot <span className="req" aria-hidden="true">*</span></span>
                                    <div className="chip-group" role="radiogroup" aria-labelledby="slot-label">
                                        {slots.map((s) => {
                                            const isTaken = taken.taken.includes(s.id);
                                            const off = isTaken || taken.unavailable.includes(s.id);
                                            return (
                                                <label className="chip" key={s.id}>
                                                    <input type="radio" name="slot" value={s.id} disabled={off} checked={values.slot === s.id} onChange={() => form.set("slot", s.id)} />
                                                    <span>{s.label}{isTaken ? " (booked)" : ""}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                    <span className="hint">Greyed-out times are already booked or too soon.</span>
                                    <p className="field-error" id="b-slot-error" data-error-for="slot">{form.errors.slot}</p>
                                </div>
                            </div>
                        </div>

                        <div className="form-section">
                            <h2 className="form-section-title"><span>3</span> Where and who</h2>
                            <div className="form-grid">
                                <Field id="b-district" name="district" label="District" error={form.errors.district}>
                                    <select {...form.input("district", "b")}><option value="">Select your district</option>
                                        {districts.map((d) => <option key={d} value={d}>{d}</option>)}<option value="Other (Phnom Penh)">Other (Phnom Penh)</option></select></Field>
                                <Field id="b-address" name="address" label="Street / house number / landmark" error={form.errors.address}>
                                    <input {...form.input("address", "b")} autoComplete="street-address" placeholder="e.g. #12, Street 51, near Wat Langka" /></Field>
                                <Field id="b-name" name="name" label="Your name" error={form.errors.name}><input {...form.input("name", "b")} autoComplete="name" /></Field>
                                <Field id="b-phone" name="phone" label="Phone number" hint="Your technician will call this number." error={form.errors.phone}>
                                    <input {...form.input("phone", "b")} type="tel" autoComplete="tel" inputMode="tel" placeholder="012 345 678" /></Field>
                                <Field id="b-email" name="email" label="Email" required={false} full hint="Optional." error={form.errors.email}>
                                    <input {...form.input("email", "b")} type="email" autoComplete="email" /></Field>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button className="button button-primary button-large" type="submit" disabled={submitting}>{submitting ? "Booking…" : "Confirm booking"}</button>
                            <p className="form-note">No payment now. You pay your technician after the job.</p>
                        </div>
                    </form>

                    <aside className="summary-card" aria-label="Booking summary">
                        <h2>Booking summary</h2>
                        <div className="summary-tech">
                            {tech ? (<><img src={`/assets/${tech.photo}`} alt="" /><div><strong>{tech.name}</strong><span>{tech.trade} · ★ {tech.rating.toFixed(1)}</span></div></>)
                                : (<div><strong>No technician yet</strong><span>Choose one to see the details</span></div>)}
                        </div>
                        <dl className="summary-list">
                            <div><dt>Service</dt><dd>{values.service || "Not selected"}</dd></div>
                            <div><dt>Date</dt><dd>{values.date ? formatDate(values.date) : "Not selected"}</dd></div>
                            <div><dt>Time</dt><dd>{slot ? slot.label : "Not selected"}</dd></div>
                            <div><dt>District</dt><dd>{values.district || "Not selected"}</dd></div>
                        </dl>
                        <div className="summary-total">
                            <span className="form-note">Starting price</span><br />
                            <strong>{tech ? `$${tech.price}` : "—"}</strong>
                            <p className="form-note" style={{ marginTop: 6 }}>The final price is confirmed by your technician before work starts.</p>
                        </div>
                    </aside>
                </div>
            </section>
        </>
    );
}
