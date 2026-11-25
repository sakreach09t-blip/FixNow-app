import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import Field, { useForm } from "../components/Field.jsx";
import Icon from "../components/Icon.jsx";
import PageHero from "../components/PageHero.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { realtimeClient, renewBeforeExpiry } from "../realtime.js";
import { formatDate, parseDate, rules } from "../utils.js";

const LABEL = { upcoming: "Upcoming", past: "Completed", cancelled: "Cancelled" };
const EMPTY = {
    upcoming: ["No upcoming bookings", "When you book a technician, it will show up here."],
    past: ["No completed bookings yet", "Finished jobs will be listed here."],
    cancelled: ["No cancelled bookings", "Anything you cancel will be kept here for reference."]
};

function BookingCard({ booking, onCancel }) {
    const d = parseDate(booking.date);
    return (
        <article className={`booking-card${booking.state === "cancelled" ? " is-cancelled" : ""}`}>
            <div className="booking-date"><strong>{d.getDate()}</strong><span>{d.toLocaleDateString("en-GB", { month: "short" })}</span></div>
            <div>
                <h3>{booking.service} <span className={`badge badge-${booking.state}`}>{LABEL[booking.state]}</span></h3>
                <p>{booking.techName} · {formatDate(booking.date, { weekday: "long" })}, {booking.slotLabel}</p>
                <p>{booking.address}, {booking.district} · Ref {booking.id}</p>
            </div>
            <div className="booking-card-actions">
                {booking.state === "upcoming" && <button className="button button-secondary" type="button" onClick={() => onCancel(booking)}>Cancel</button>}
                <Link className="button button-primary" to={`/booking?tech=${booking.techId}`}>Book again</Link>
            </div>
        </article>
    );
}

export default function MyBookings() {
    const { user, ready } = useAuth();
    const toast = useToast();
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState("upcoming");
    const [target, setTarget] = useState(null);
    const [cancelling, setCancelling] = useState(false);
    const [found, setFound] = useState(null); // guest lookup result
    const [lookupError, setLookupError] = useState("");
    const lookup = useForm({ ref: "", phone: "" });

    useEffect(() => { document.title = "My Bookings | FixNow"; }, []);

    const load = useCallback(() => {
        if (!user) return;
        setLoading(true);
        api.myBookings().then((d) => setList(d.bookings)).catch((e) => toast(e.message)).finally(() => setLoading(false));
    }, [user, toast]);
    useEffect(load, [load]);

    useEffect(() => {
        if (!user) return;
        if (!realtimeClient) {
            console.error("Neon Realtime URL is missing; booking updates will not be live.");
            toast("Live booking updates are not configured.");
            return;
        }

        let stopped = false;
        let subscription;
        let stopRenewing;
        const connect = async () => {
            try {
                const sealedQuery = await api.myBookingsLive();
                if (stopped) return;
                subscription = realtimeClient.subscribe(sealedQuery);
                stopRenewing = renewBeforeExpiry(subscription, sealedQuery, api.myBookingsLive, (error) => {
                    console.error("Could not renew the Neon Realtime booking query:", error);
                    toast("Live booking updates stopped. Refresh to try again.");
                });
                subscription.onChange((snapshot) => {
                    if (snapshot.status === "error") {
                        console.error("Neon Realtime booking subscription failed:", snapshot.error);
                        toast("Live booking updates stopped. Refresh to try again.");
                    } else if (snapshot.status === "live" && snapshot.data) {
                        load();
                    }
                });
            } catch (error) {
                if (!stopped) {
                    console.error("Could not start Neon Realtime booking updates:", error);
                    toast("Live booking updates are unavailable right now.");
                }
            }
        };
        connect();
        return () => {
            stopped = true;
            stopRenewing?.();
            subscription?.unsubscribe();
        };
    }, [load, toast, user]);

    const confirmCancel = async () => {
        setCancelling(true);
        try {
            const { booking } = await api.cancelBooking(target.id, target.phone);
            if (found) setFound(booking); else load();
            toast("Booking cancelled.");
        } catch (e) { toast(e.message); }
        setCancelling(false);
        setTarget(null);
    };

    const onLookup = async (e) => {
        e.preventDefault();
        setLookupError("");
        if (!lookup.validate({ ref: rules.required("Reference"), phone: rules.phone })) return;
        try { setFound((await api.lookupBooking(lookup.values.ref.trim(), lookup.values.phone)).booking); }
        catch (err) { setFound(null); setLookupError(err.message); }
    };

    const counts = Object.fromEntries(["upcoming", "past", "cancelled"].map((k) => [k, list.filter((b) => b.state === k).length]));
    const shown = list.filter((b) => b.state === filter).sort((a, b) => (filter === "upcoming" ? 1 : -1) * ((a.date + a.slot).localeCompare(b.date + b.slot)));

    return (
        <>
            <PageHero crumb="My Bookings" title="My bookings">Track upcoming visits, review past jobs and cancel if your plans change.</PageHero>
            <section className="page-section section-shell">
                {!ready ? null : user ? (
                    <>
                        <div className="tabs" role="tablist" aria-label="Booking status">
                            {["upcoming", "past", "cancelled"].map((k) => (
                                <button key={k} className="tab" type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}>
                                    {k === "past" ? "Completed" : LABEL[k]} <span>{counts[k]}</span>
                                </button>
                            ))}
                        </div>
                        {shown.length ? (
                            <div className="booking-list">{shown.map((b) => <BookingCard key={b.id} booking={b} onCancel={setTarget} />)}</div>
                        ) : (
                            <div className="empty-state">
                                <Icon name="event_busy" />
                                <h3>{loading ? "Loading your bookings…" : EMPTY[filter][0]}</h3>
                                <p>{loading ? "One moment." : EMPTY[filter][1]}</p>
                                <Link className="button button-primary" to="/technicians">Find a technician</Link>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="auth-layout">
                        <div className="empty-state" style={{ textAlign: "left" }}>
                            <Icon name="lock" />
                            <h3>Sign in to see your bookings</h3>
                            <p style={{ marginInline: 0 }}>Your bookings are saved to your account, so you can see them on any device.</p>
                            <div className="confirm-actions" style={{ justifyContent: "flex-start" }}>
                                <Link className="button button-primary" to="/login?next=/my-bookings">Sign in</Link>
                                <Link className="button button-secondary" to="/join">Create an account</Link>
                            </div>
                        </div>
                        <form className="form-card" onSubmit={onLookup} noValidate>
                            <h2 className="form-title" style={{ fontSize: "1.1rem" }}>Booked as a guest?</h2>
                            <p className="form-sub">Find your booking with its reference and the phone number you used.</p>
                            {lookupError && <div className="notice error" role="alert" style={{ marginBottom: 16 }}><Icon name="error" /><span>{lookupError}</span></div>}
                            <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
                                <Field id="g-ref" name="ref" label="Booking reference" error={lookup.errors.ref}><input {...lookup.input("ref", "g")} placeholder="FN-ABC234" autoCapitalize="characters" /></Field>
                                <Field id="g-phone" name="phone" label="Phone number" error={lookup.errors.phone}><input {...lookup.input("phone", "g")} type="tel" inputMode="tel" placeholder="012 345 678" /></Field>
                            </div>
                            <div className="form-actions"><button className="button button-primary" type="submit">Find booking</button></div>
                        </form>
                        {found && (
                            <div style={{ gridColumn: "1 / -1" }}>
                                <BookingCard booking={found} onCancel={(b) => setTarget({ ...b, phone: lookup.values.phone })} />
                            </div>
                        )}
                    </div>
                )}
            </section>
            <ConfirmDialog open={!!target} title="Cancel this booking?" confirmLabel="Yes, cancel it" busy={cancelling} onConfirm={confirmCancel} onClose={() => setTarget(null)}>
                {target && `${target.service} with ${target.techName} on ${formatDate(target.date)}. The time slot will be released for other customers.`}
            </ConfirmDialog>
        </>
    );
}
