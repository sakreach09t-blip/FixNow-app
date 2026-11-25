import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../api.js";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import PageHero from "../components/PageHero.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function displayDate(value) {
    return value ? new Date(value).toLocaleString() : "";
}

function localDateTime(value) {
    const date = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
    return date.toISOString().slice(0, 16);
}

function AccountTable({ rows, expiries, setExpiry, onSuspend, onDelete, busyKey }) {
    if (!rows.length) return <p className="empty-state">No matching accounts.</p>;
    return (
        <div className="admin-table-wrap">
            <table className="admin-table">
                <thead>
                    <tr><th>Name</th><th>Contact</th><th>Account</th><th>Suspension</th><th>Actions</th></tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        const key = `user:${row.id}`;
                        return (
                            <tr key={row.id}>
                                <td><strong>{row.name}</strong></td>
                                <td>{row.email}<br /><span>{row.phone}</span></td>
                                <td><span className="admin-role">{row.role}</span><br /><span>{displayDate(row.createdAt)}</span></td>
                                <td>{row.suspendedUntil ? `Until ${displayDate(row.suspendedUntil)}` : "Active"}</td>
                                <td>
                                    <div className="admin-row-actions">
                                        <input
                                            aria-label={`Suspension end for ${row.name}`}
                                            className="input"
                                            type="datetime-local"
                                            min={localDateTime(new Date())}
                                            value={expiries[key] || ""}
                                            onChange={(event) => setExpiry(key, event.target.value)}
                                        />
                                        <button className="button button-secondary" type="button" disabled={busyKey === key}
                                            onClick={() => onSuspend("user", row.id, expiries[key])}>
                                            {row.suspendedUntil ? "Change expiry" : "Suspend"}
                                        </button>
                                        {row.suspendedUntil && <button className="admin-text-button" type="button" disabled={busyKey === key}
                                            onClick={() => onSuspend("user", row.id, null)}>Unsuspend</button>}
                                        <button className="admin-danger-button" type="button" disabled={busyKey === key}
                                            onClick={() => onDelete("user", row.id, row.name)}>Anonymize</button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function TechnicianTable({ rows, expiries, setExpiry, onSuspend, onDelete, busyKey }) {
    if (!rows.length) return <p className="empty-state">No technician listings found.</p>;
    return (
        <div className="admin-table-wrap">
            <table className="admin-table">
                <thead>
                    <tr><th>Technician</th><th>Listing</th><th>Suspension</th><th>Actions</th></tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        const key = `technician:${row.id}`;
                        return (
                            <tr key={row.id}>
                                <td><strong>{row.name}</strong><br /><span>{row.trade}</span></td>
                                <td><span className="admin-role">{row.status}</span><br /><span>{money.format(row.price)} starting price</span></td>
                                <td>{row.suspendedUntil ? `Until ${displayDate(row.suspendedUntil)}` : "Active"}</td>
                                <td>
                                    <div className="admin-row-actions">
                                        <input
                                            aria-label={`Suspension end for ${row.name}`}
                                            className="input"
                                            type="datetime-local"
                                            min={localDateTime(new Date())}
                                            value={expiries[key] || ""}
                                            onChange={(event) => setExpiry(key, event.target.value)}
                                        />
                                        <button className="button button-secondary" type="button" disabled={busyKey === key}
                                            onClick={() => onSuspend("technician", row.id, expiries[key])}>
                                            {row.suspendedUntil ? "Change expiry" : "Suspend"}
                                        </button>
                                        {row.suspendedUntil && <button className="admin-text-button" type="button" disabled={busyKey === key}
                                            onClick={() => onSuspend("technician", row.id, null)}>Unsuspend</button>}
                                        <button className="admin-danger-button" type="button" disabled={busyKey === key}
                                            onClick={() => onDelete("technician", row.id, row.name)}>Hide listing</button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default function AdminDashboard() {
    const { user, ready } = useAuth();
    const toast = useToast();
    const [summary, setSummary] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [role, setRole] = useState("all");
    const [expiries, setExpiries] = useState({});
    const [busyKey, setBusyKey] = useState("");
    const [confirmation, setConfirmation] = useState(null);

    useEffect(() => { document.title = "Admin dashboard | FixNow"; }, []);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const [summaryData, accountData, technicianData] = await Promise.all([
                api.adminSummary(), api.adminUsers(), api.adminTechnicians()
            ]);
            setSummary(summaryData);
            setAccounts(accountData.users);
            setTechnicians(technicianData.technicians);
        } catch (loadError) {
            setError(loadError.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (ready && user?.role === "admin") refresh();
    }, [ready, user?.role, refresh]);

    const setExpiry = (key, value) => setExpiries((current) => ({ ...current, [key]: value }));

    const handleSuspension = async (kind, id, value) => {
        const key = `${kind}:${id}`;
        if (value && (!Number.isFinite(new Date(value).getTime()) || new Date(value) <= new Date())) {
            setError("Choose a suspension end time in the future.");
            return;
        }
        setBusyKey(key);
        setError("");
        try {
            const until = value ? new Date(value).toISOString() : null;
            if (kind === "user") await api.setAdminUserSuspension(id, until);
            else await api.setAdminTechnicianSuspension(id, until);
            setExpiry(key, "");
            toast(until ? "Suspension updated." : "Suspension removed.");
            await refresh();
        } catch (actionError) {
            setError(actionError.message);
        } finally {
            setBusyKey("");
        }
    };

    const handleDelete = async () => {
        if (!confirmation) return;
        const action = confirmation;
        const key = `${action.kind}:${action.id}`;
        setBusyKey(key);
        setError("");
        try {
            if (action.kind === "user") await api.deleteAdminUser(action.id);
            else await api.deleteAdminTechnician(action.id);
            toast(action.kind === "user" ? "Account anonymized." : "Technician listing hidden.");
            setConfirmation(null);
            await refresh();
        } catch (actionError) {
            setError(actionError.message);
        } finally {
            setBusyKey("");
        }
    };

    if (!ready) return <section className="page-section section-shell"><p>Checking administrator access…</p></section>;
    if (!user) return <Navigate to="/login?next=%2Fadmin" replace />;
    if (user.role !== "admin") return <Navigate to="/" replace />;

    const visibleAccounts = accounts.filter((account) => {
        const matchesRole = role === "all" || account.role === role;
        const text = `${account.name} ${account.email} ${account.phone}`.toLowerCase();
        return matchesRole && text.includes(search.trim().toLowerCase());
    });
    const graph = summary ? [
        { label: "Bookings", value: summary.bookings },
        { label: "Customers", value: summary.customers },
        { label: "Technician accounts", value: summary.technicianAccounts },
        { label: "Technician listings", value: summary.technicianProfiles },
        { label: "App users", value: summary.appUsers }
    ] : [];
    const largestValue = Math.max(1, ...graph.map((item) => item.value));

    return (
        <>
            <PageHero crumb="Admin" title="Admin dashboard">Manage customer and technician accounts and public listings.</PageHero>
            <section className="page-section section-shell admin-dashboard">
                {error && <div className="notice error admin-notice" role="alert">{error}</div>}
                {loading && !summary ? <p>Loading dashboard data…</p> : summary && (
                    <>
                        <div className="admin-metrics">
                            <article className="admin-metric"><span>Bookings</span><strong>{summary.bookings}</strong></article>
                            <article className="admin-metric"><span>Customers</span><strong>{summary.customers}</strong></article>
                            <article className="admin-metric"><span>Technician accounts</span><strong>{summary.technicianAccounts}</strong></article>
                            <article className="admin-metric"><span>Technician listings</span><strong>{summary.technicianProfiles}</strong></article>
                            <article className="admin-metric"><span>Total app users</span><strong>{summary.appUsers}</strong></article>
                            <article className="admin-metric admin-money"><span>Estimated listed booking value</span><strong>{money.format(summary.estimatedBookingValue)}</strong><small>Confirmed bookings at listed starting prices; not cash received.</small></article>
                        </div>

                        <section className="admin-panel" aria-labelledby="admin-chart-title">
                            <h2 id="admin-chart-title">Platform overview</h2>
                            <div className="admin-chart" role="img" aria-label="Bar chart comparing bookings, customer accounts, technician accounts, technician listings, and app users">
                                {graph.map((item) => (
                                    <div className="admin-chart-row" key={item.label}>
                                        <span>{item.label}</span>
                                        <div className="admin-chart-track"><div style={{ width: `${item.value / largestValue * 100}%` }} /></div>
                                        <strong>{item.value}</strong>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="admin-panel" aria-labelledby="admin-users-title">
                            <div className="admin-section-heading">
                                <div><h2 id="admin-users-title">Registered accounts</h2><p>Suspensions expire at the selected date and time. Account deletion anonymizes booking contact details.</p></div>
                                <div className="admin-filters">
                                    <input className="input" type="search" aria-label="Search accounts" placeholder="Search name or contact" value={search} onChange={(event) => setSearch(event.target.value)} />
                                    <select className="input" aria-label="Filter account type" value={role} onChange={(event) => setRole(event.target.value)}>
                                        <option value="all">All accounts</option><option value="customer">Customers</option><option value="technician">Technician accounts</option>
                                    </select>
                                </div>
                            </div>
                            <AccountTable rows={visibleAccounts} expiries={expiries} setExpiry={setExpiry} onSuspend={handleSuspension} onDelete={(kind, id, name) => setConfirmation({ kind, id, name })} busyKey={busyKey} />
                        </section>

                        <section className="admin-panel" aria-labelledby="admin-technicians-title">
                            <div className="admin-section-heading">
                                <div><h2 id="admin-technicians-title">Public technician listings</h2><p>Suspended or hidden listings are removed from customer search and booking.</p></div>
                            </div>
                            <TechnicianTable rows={technicians} expiries={expiries} setExpiry={setExpiry} onSuspend={handleSuspension} onDelete={(kind, id, name) => setConfirmation({ kind, id, name })} busyKey={busyKey} />
                        </section>
                    </>
                )}
                {!loading && !summary && <button className="button button-primary" type="button" onClick={refresh}>Retry</button>}
            </section>
            <ConfirmDialog
                open={Boolean(confirmation)}
                title={confirmation?.kind === "user" ? "Anonymize this account?" : "Hide this technician listing?"}
                confirmLabel={confirmation?.kind === "user" ? "Anonymize account" : "Hide listing"}
                cancelLabel="Cancel"
                busy={Boolean(busyKey)}
                onConfirm={handleDelete}
                onClose={() => setConfirmation(null)}
            >
                {confirmation?.kind === "user"
                    ? `${confirmation.name}'s account will be deactivated and identifying information on linked bookings removed. This cannot be undone.`
                    : `${confirmation?.name}'s listing will be hidden from customers. Existing booking history will be retained.`}
            </ConfirmDialog>
        </>
    );
}
