import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError } from "../api.js";
import Field, { useForm } from "../components/Field.jsx";
import Icon from "../components/Icon.jsx";
import PageHero from "../components/PageHero.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useMeta } from "../context/MetaContext.jsx";
import { rules } from "../utils.js";

const terms = (v) => (v ? "" : "Please accept the terms to continue.");
const matches = (v, all) => (v === all.password ? "" : "Passwords do not match.");

function TermsCheck({ prefix, form }) {
    return (
        <div className="field full">
            <label className="check-row">
                <input type="checkbox" name="terms" checked={!!form.values.terms} onChange={(e) => form.set("terms", e.target.checked)} />
                <span>I agree to the <Link to="/terms" target="_blank">Terms</Link> and <Link to="/privacy" target="_blank">Privacy Policy</Link>.</span>
            </label>
            <p className="field-error" id={`${prefix}-terms-error`} data-error-for="terms">{form.errors.terms}</p>
        </div>
    );
}

export default function Join() {
    const { districts, services } = useMeta();
    const { register } = useAuth();
    const [params, setParams] = useSearchParams();
    const role = params.get("type") === "technician" ? "technician" : "customer";
    const [done, setDone] = useState(null);
    const [formError, setFormError] = useState("");
    const [busy, setBusy] = useState(false);

    const customer = useForm({ name: "", phone: "", email: "", district: "", password: "", legacyPassword: "", confirm: "", terms: false });
    const tech = useForm({ name: "", phone: "", email: "", trade: "", experience: "", price: "", areas: [], skills: "", password: "", legacyPassword: "", confirm: "", terms: false });

    useEffect(() => { document.title = "Join FixNow | Customers and Technicians"; }, []);
    useEffect(() => { if (done) window.scrollTo({ top: 0, behavior: "smooth" }); }, [done]);

    const submit = async (form, validators, payload) => {
        setFormError("");
        if (!form.validate(validators)) return;
        setBusy(true);
        try {
            const user = await register(payload);
            setDone(user);
        } catch (error) {
            if (error instanceof ApiError && error.fields) form.setErrors((e) => ({ ...e, ...Object.fromEntries(Object.entries(error.fields).map(([k, v]) => [k, error.status === 409 ? error.message : v])) }));
            else setFormError(error.message);
        } finally { setBusy(false); }
    };

    const onCustomer = (e) => {
        e.preventDefault();
        const v = customer.values;
        submit(customer, {
            name: rules.name, phone: rules.phone, email: rules.email, district: rules.required("District"),
            password: rules.password, confirm: matches, terms
        }, { role: "customer", name: v.name, phone: v.phone, email: v.email, district: v.district, password: v.password, legacyPassword: v.legacyPassword });
    };

    const onTechnician = (e) => {
        e.preventDefault();
        const v = tech.values;
        submit(tech, {
            name: rules.name, phone: rules.phone, email: rules.email, trade: rules.required("Main trade"),
            experience: (x) => (x !== "" && Number(x) >= 0 && Number(x) <= 50 ? "" : "Enter your years of experience (0 to 50)."),
            price: (x) => (Number(x) >= 1 && Number(x) <= 500 ? "" : "Enter a starting price in US dollars."),
            areas: (x) => (x.length ? "" : "Choose at least one area you can cover."),
            skills: (x) => (x.trim().length >= 10 ? "" : "Tell us a little about your skills (at least 10 characters)."),
            password: rules.password, confirm: matches, terms
        }, { role: "technician", name: v.name, phone: v.phone, email: v.email, trade: v.trade, experience: Number(v.experience), price: Number(v.price), areas: v.areas, skills: v.skills, password: v.password, legacyPassword: v.legacyPassword });
    };

    const toggleArea = (name) => tech.set("areas", tech.values.areas.includes(name) ? tech.values.areas.filter((a) => a !== name) : [...tech.values.areas, name]);

    return (
        <>
            <PageHero crumb="Join Us" title="Join the FixNow community">
                Create a free customer account to book faster, or apply as a technician to reach customers across Phnom Penh.
            </PageHero>
            <section className="page-section section-shell">
                {done ? (
                    <div className="form-card success-panel confirm-card">
                        <Icon name="check" className="success-icon" />
                        <h2 tabIndex={-1}>{done.role === "technician" ? `Thanks ${done.name.split(" ")[0]}, your application is in` : `Welcome to FixNow, ${done.name.split(" ")[0]}`}</h2>
                        <p>{done.role === "technician"
                            ? "We will review your details and contact you on your phone or email before your profile goes live. You are signed in."
                            : "Your account is ready and you are signed in. Find a technician and book your first job."}</p>
                        <div className="confirm-actions">
                            {done.role === "technician" ? (
                                <><Link className="button button-primary" to="/">Back to home</Link><Link className="button button-secondary" to="/about">How FixNow works</Link></>
                            ) : (
                                <><Link className="button button-primary" to="/technicians">Find a technician</Link><Link className="button button-secondary" to="/services">Explore services</Link></>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="tabs" role="tablist" aria-label="Account type">
                            <button className="tab" type="button" role="tab" aria-selected={role === "customer"} onClick={() => setParams({ type: "customer" }, { replace: true })}>I am a Customer</button>
                            <button className="tab" type="button" role="tab" aria-selected={role === "technician"} onClick={() => setParams({ type: "technician" }, { replace: true })}>I am a Technician</button>
                        </div>
                        <div className="auth-layout">
                            <div>
                                {formError && <div className="notice error" role="alert" style={{ marginBottom: 18 }}><Icon name="error" /><span>{formError}</span></div>}
                                {role === "customer" ? (
                                    <form className="form-card" onSubmit={onCustomer} noValidate>
                                        <h2 className="form-title">Create your customer account</h2>
                                        <p className="form-sub">Book technicians in a few taps and keep track of every job.</p>
                                        <div className="form-grid">
                                            <Field id="c-name" name="name" label="Full name" error={customer.errors.name}><input {...customer.input("name", "c")} autoComplete="name" placeholder="e.g. Chantha Sok" /></Field>
                                            <Field id="c-phone" name="phone" label="Phone number" error={customer.errors.phone}><input {...customer.input("phone", "c")} type="tel" autoComplete="tel" inputMode="tel" placeholder="012 345 678" /></Field>
                                            <Field id="c-email" name="email" label="Email" error={customer.errors.email}><input {...customer.input("email", "c")} type="email" autoComplete="email" placeholder="you@example.com" /></Field>
                                            <Field id="c-district" name="district" label="Your district" error={customer.errors.district}>
                                                <select {...customer.input("district", "c")}><option value="">Select your district</option>{districts.map((d) => <option key={d} value={d}>{d}</option>)}</select></Field>
                                            <Field id="c-password" name="password" label="Password" hint="At least 8 characters." error={customer.errors.password}><input {...customer.input("password", "c")} type="password" autoComplete="new-password" /></Field>
                                            <Field id="c-legacy-password" name="legacyPassword" label="Previous FixNow password (optional)" hint="Enter this only to link an existing FixNow account." error={customer.errors.legacyPassword}><input {...customer.input("legacyPassword", "c")} type="password" autoComplete="current-password" /></Field>
                                            <Field id="c-confirm" name="confirm" label="Confirm password" error={customer.errors.confirm}><input {...customer.input("confirm", "c")} type="password" autoComplete="new-password" /></Field>
                                            <TermsCheck prefix="c" form={customer} />
                                        </div>
                                        <div className="form-actions">
                                            <button className="button button-primary button-large" type="submit" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
                                            <p className="form-note">Already have an account? <Link to="/login" style={{ color: "var(--color-primary)" }}>Sign in</Link></p>
                                        </div>
                                    </form>
                                ) : (
                                    <form className="form-card" onSubmit={onTechnician} noValidate>
                                        <h2 className="form-title">Apply as a technician</h2>
                                        <p className="form-sub">Tell us about your skills. We review every application before a profile goes live.</p>
                                        <div className="form-grid">
                                            <Field id="t-name" name="name" label="Full name" error={tech.errors.name}><input {...tech.input("name", "t")} autoComplete="name" /></Field>
                                            <Field id="t-phone" name="phone" label="Phone number" error={tech.errors.phone}><input {...tech.input("phone", "t")} type="tel" autoComplete="tel" inputMode="tel" placeholder="012 345 678" /></Field>
                                            <Field id="t-email" name="email" label="Email" error={tech.errors.email}><input {...tech.input("email", "t")} type="email" autoComplete="email" /></Field>
                                            <Field id="t-trade" name="trade" label="Main trade" error={tech.errors.trade}>
                                                <select {...tech.input("trade", "t")}><option value="">Choose your main trade</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
                                            <Field id="t-experience" name="experience" label="Years of experience" error={tech.errors.experience}><input {...tech.input("experience", "t")} type="number" min="0" max="50" inputMode="numeric" /></Field>
                                            <Field id="t-price" name="price" label="Starting price (USD)" hint="The lowest price for a standard visit." error={tech.errors.price}><input {...tech.input("price", "t")} type="number" min="1" max="500" inputMode="numeric" placeholder="10" /></Field>
                                            <div className="field full">
                                                <span className="label" id="t-areas-label">Areas you can cover <span className="req" aria-hidden="true">*</span></span>
                                                <div className="chip-group" role="group" aria-labelledby="t-areas-label">
                                                    {districts.map((d) => (
                                                        <label className="chip" key={d}><input type="checkbox" name="areas" value={d} checked={tech.values.areas.includes(d)} onChange={() => toggleArea(d)} /><span>{d}</span></label>
                                                    ))}
                                                </div>
                                                <p className="field-error" id="t-areas-error" data-error-for="areas">{tech.errors.areas}</p>
                                            </div>
                                            <Field id="t-skills" name="skills" label="Skills and services" full error={tech.errors.skills}>
                                                <textarea {...tech.input("skills", "t")} rows={3} placeholder="e.g. Wiring, lighting installation, breaker faults" /></Field>
                                            <Field id="t-password" name="password" label="Password" hint="At least 8 characters." error={tech.errors.password}><input {...tech.input("password", "t")} type="password" autoComplete="new-password" /></Field>
                                            <Field id="t-legacy-password" name="legacyPassword" label="Previous FixNow password (optional)" hint="Enter this only to link an existing FixNow account." error={tech.errors.legacyPassword}><input {...tech.input("legacyPassword", "t")} type="password" autoComplete="current-password" /></Field>
                                            <Field id="t-confirm" name="confirm" label="Confirm password" error={tech.errors.confirm}><input {...tech.input("confirm", "t")} type="password" autoComplete="new-password" /></Field>
                                            <TermsCheck prefix="t" form={tech} />
                                        </div>
                                        <div className="form-actions">
                                            <button className="button button-primary button-large" type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit application"}</button>
                                            <p className="form-note">Already registered? <Link to="/login" style={{ color: "var(--color-primary)" }}>Sign in</Link></p>
                                        </div>
                                    </form>
                                )}
                            </div>
                            <aside className="side-card" aria-label="Why join">
                                <h3>Why join FixNow?</h3>
                                <ul>
                                    <li><Icon name="search" />Find trusted technicians by skill, area and price</li>
                                    <li><Icon name="calendar_month" />Book a two-hour slot in a minute</li>
                                    <li><Icon name="work" />Technicians receive job requests from nearby customers</li>
                                    <li><Icon name="price_check" />Clear starting prices, confirmed before work begins</li>
                                    <li><Icon name="lock" />Your details are only used to arrange your jobs</li>
                                </ul>
                            </aside>
                        </div>
                    </>
                )}
            </section>
        </>
    );
}
