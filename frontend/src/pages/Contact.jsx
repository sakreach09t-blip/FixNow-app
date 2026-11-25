import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import Field, { useForm } from "../components/Field.jsx";
import Icon from "../components/Icon.jsx";
import PageHero from "../components/PageHero.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useMeta } from "../context/MetaContext.jsx";
import { Link } from "react-router-dom";
import { rules } from "../utils.js";

const TOPICS = ["General question", "Help with a booking", "Help choosing a service", "Technician application", "Feedback", "Report a problem"];

export default function Contact() {
    const { contact } = useMeta();
    const { user } = useAuth();
    const [params] = useSearchParams();
    const topic = params.get("topic");
    const form = useForm({ name: user?.name || "", email: user?.email || "", topic: TOPICS.includes(topic) ? topic : "", message: "" });
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => { document.title = "Contact FixNow | We're here to help"; }, []);
    useEffect(() => {
        if (user) form.setValues((v) => ({ ...v, name: v.name || user.name || "", email: v.email || user.email || "" }));
    }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (!form.validate({ name: rules.name, email: rules.email, topic: rules.required("Topic"), message: (v) => (v.trim().length >= 10 ? "" : "Please write at least a short sentence.") })) return;
        setBusy(true);
        try {
            await api.contact(form.values);
            setSent(true);
            form.setValues((v) => ({ ...v, topic: "", message: "" }));
        } catch (err) { setError(err.message); }
        setBusy(false);
    };

    return (
        <>
            <PageHero crumb="Contact" title="Get in touch">
                Questions about a booking, a service or joining as a technician? Send us a message and we'll get back to you.
            </PageHero>
            <section className="page-section section-shell">
                <div className="contact-layout">
                    <div className="contact-cards">
                        <div className="contact-card"><Icon name="mail" /><div><h3>Email</h3><a href={`mailto:${contact.email}`}>{contact.email}</a></div></div>
                        <div className="contact-card"><Icon name="call" /><div><h3>Phone</h3><a href={`tel:${contact.phone.replace(/\s/g, "")}`}>{contact.phone}</a></div></div>
                        <div className="contact-card"><Icon name="location_on" /><div><h3>Service area</h3><p>{contact.city}</p></div></div>
                        <div className="contact-card"><Icon name="schedule" /><div><h3>Support hours</h3><p>{contact.hours}</p></div></div>
                        <div className="contact-card"><Icon name="help" /><div><h3>Quick answers</h3><Link to="/about#faq">Read the FAQ</Link></div></div>
                    </div>
                    <form className="form-card" onSubmit={onSubmit} noValidate>
                        <h2 className="form-title">Send us a message</h2>
                        <p className="form-sub">We usually reply within one working day.</p>
                        {sent && <div className="notice success" role="status" style={{ marginBottom: 20 }}><Icon name="check_circle" /><span>Thanks, your message has been sent. We'll reply by email.</span></div>}
                        {error && <div className="notice error" role="alert" style={{ marginBottom: 20 }}><Icon name="error" /><span>{error}</span></div>}
                        <div className="form-grid">
                            <Field id="m-name" name="name" label="Your name" error={form.errors.name}><input {...form.input("name", "m")} autoComplete="name" /></Field>
                            <Field id="m-email" name="email" label="Email" error={form.errors.email}><input {...form.input("email", "m")} type="email" autoComplete="email" /></Field>
                            <Field id="m-topic" name="topic" label="Topic" full error={form.errors.topic}>
                                <select {...form.input("topic", "m")}><option value="">Select a topic</option>{TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
                            <Field id="m-message" name="message" label="Message" full error={form.errors.message}>
                                <textarea {...form.input("message", "m")} rows={5} placeholder="How can we help?" /></Field>
                        </div>
                        <div className="form-actions"><button className="button button-primary button-large" type="submit" disabled={busy}>{busy ? "Sending…" : "Send message"}</button></div>
                    </form>
                </div>
            </section>
        </>
    );
}
