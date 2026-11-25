import { useEffect } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import PageHero from "../components/PageHero.jsx";
import { useMeta } from "../context/MetaContext.jsx";

export default function Services() {
    const { services } = useMeta();
    useEffect(() => { document.title = "Services | FixNow"; }, []);
    return (
        <>
            <PageHero crumb="Services" title="Home services for every job">
                From a dripping tap to a new air conditioner, explore what FixNow technicians can do and what each service typically costs to start.
            </PageHero>
            <section className="page-section section-shell" aria-label="All services">
                <nav className="service-nav" aria-label="Jump to a service">
                    {services.map((s) => (
                        <a key={s.id} href={`#${s.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" }); history.replaceState(null, "", `#${s.id}`); }}>
                            <Icon name={s.icon} />{s.name}
                        </a>
                    ))}
                </nav>
                <div className="service-list">
                    {services.map((s) => (
                        <article className="service-detail" id={s.id} key={s.id} aria-labelledby={`${s.id}-title`}>
                            <div>
                                <Icon name={s.icon} className="category-icon" />
                                <h2 id={`${s.id}-title`}>{s.name}</h2>
                                <p>{s.long}</p>
                                <div className="service-meta">
                                    <span>From <strong>${s.fromPrice}</strong></span>
                                    <span><strong>{s.technicianCount}</strong> {s.technicianCount === 1 ? "technician" : "technicians"} listed</span>
                                </div>
                                <Link className="button button-primary" to={`/technicians?service=${s.id}`}>Find {s.name} technicians <Icon name="arrow_forward" /></Link>
                            </div>
                            <div>
                                <h3>What's included</h3>
                                <ul className="check-list">{s.includes.map((x) => <li key={x}><Icon name="check_circle" />{x}</li>)}</ul>
                                <h3>Common jobs</h3>
                                <ul className="pill-list">{s.jobs.map((x) => <li key={x}>{x}</li>)}</ul>
                            </div>
                        </article>
                    ))}
                </div>

                <div className="join-section section-gap" style={{ padding: "44px 28px", textAlign: "center" }}>
                    <div className="join-heading" style={{ marginBottom: 22 }}>
                        <h2 style={{ fontSize: "1.7rem" }}>Not sure which service you need?</h2>
                        <p>Describe the problem and we will point you to the right technician, or call a handyman for the small stuff.</p>
                    </div>
                    <div className="center-actions" style={{ marginTop: 0 }}>
                        <Link className="button button-primary" to="/contact?topic=Help%20choosing%20a%20service">Ask our team</Link>
                        <Link className="button button-secondary" to="/technicians?service=handyman">Browse handymen</Link>
                    </div>
                </div>
                <p className="form-note" style={{ marginTop: 22, textAlign: "center" }}>Prices shown are starting prices for a standard visit. Your technician confirms the final quote before any work begins.</p>
            </section>
        </>
    );
}
