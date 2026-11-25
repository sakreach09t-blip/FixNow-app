import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Field, { useForm } from "../components/Field.jsx";
import Icon from "../components/Icon.jsx";
import PageHero from "../components/PageHero.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { rules } from "../utils.js";

export default function Login() {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const form = useForm({ email: "", password: "" });
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => { document.title = "Sign in | FixNow"; }, []);

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (!form.validate({ email: rules.email, password: rules.required("Password") })) return;
        setBusy(true);
        try {
            const signedInUser = await login(form.values.email, form.values.password);
            const next = params.get("next") || "";
            navigate(/^\/[a-z0-9\-/]*$/i.test(next) && !next.startsWith("//") ? next : signedInUser.role === "admin" ? "/admin" : "/my-bookings");
        } catch (err) {
            setError(err.message);
            setBusy(false);
        }
    };

    return (
        <>
            <PageHero crumb="Sign in" title="Welcome back">Sign in to book faster and manage your jobs.</PageHero>
            <section className="page-section section-shell">
                <div className="auth-narrow">
                    {user ? (
                        <div className="form-card success-panel">
                            <Icon name="check" className="success-icon" />
                            <h2>You're signed in</h2>
                            <p>Signed in as <strong>{user.name}</strong>.</p>
                            <div className="confirm-actions"><Link className="button button-primary" to="/my-bookings">My bookings</Link><Link className="button button-secondary" to="/technicians">Find a technician</Link></div>
                        </div>
                    ) : (
                        <form className="form-card" onSubmit={onSubmit} noValidate>
                            <h2 className="form-title">Sign in to FixNow</h2>
                            <p className="form-sub">Use the email address linked to your FixNow account.</p>
                            {error && <div className="notice error" role="alert" style={{ marginBottom: 18 }}><Icon name="error" /><span>{error}</span></div>}
                            <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
                                <Field id="l-email" name="email" label="Email address" error={form.errors.email}><input {...form.input("email", "l")} type="email" autoComplete="email" /></Field>
                                <Field id="l-password" name="password" label="Password" error={form.errors.password}><input {...form.input("password", "l")} type="password" autoComplete="current-password" /></Field>
                            </div>
                            <div className="form-actions"><button className="button button-primary button-large" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button></div>
                            <p className="form-note" style={{ marginTop: 18 }}>New to FixNow? <Link to="/join" style={{ color: "var(--color-primary)" }}>Create an account</Link></p>
                        </form>
                    )}
                </div>
            </section>
        </>
    );
}
