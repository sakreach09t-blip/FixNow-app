import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function JoinSection() {
    const { user, ready } = useAuth();
    if (!ready || user) return null;

    return (
        <section className="join-section section-shell" id="join-us" aria-labelledby="join-title">
            <div className="join-heading">
                <span className="eyebrow">Join the FixNow community</span>
                <h2 id="join-title">Better home care starts here.</h2>
                <p>Whether you need a hand at home or have skills to share, there’s a place for you on FixNow.</p>
            </div>
            <div className="join-grid">
                <article className="join-card join-customer">
                    <span className="material-symbols-outlined join-icon" aria-hidden="true">home</span>
                    <h3>For customers</h3>
                    <p>Find reliable technicians and solve your household problems.</p>
                    <Link className="button button-primary" to="/join?type=customer">Join as Customer</Link>
                </article>
                <article className="join-card join-technician">
                    <span className="material-symbols-outlined join-icon" aria-hidden="true">engineering</span>
                    <h3>For technicians</h3>
                    <p>Connect with customers, find job opportunities, and grow your business.</p>
                    <Link className="button button-outline" to="/join?type=technician">Join as Technician</Link>
                </article>
            </div>
        </section>
    );
}
