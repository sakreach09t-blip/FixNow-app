import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import JoinSection from "../components/JoinSection.jsx";
import TechCard from "../components/TechCard.jsx";
import { useMeta } from "../context/MetaContext.jsx";
import { CountUp } from "../hooks/motion.jsx";
import { api } from "../api.js";

const STEPS = [
    ["Search", "Tell us what needs fixing, or browse the service categories, to see the technicians who can help."],
    ["Compare", "Check each technician's skills, services, rating and starting price side by side."],
    ["Book", "Pick a day and a two-hour time slot that suits you and tell us where to come."],
    ["Get it fixed", "Your technician arrives on time and fixes the problem. You pay once the job is done."]
];

const BENEFITS = [
    ["person_search", "Easy technician discovery", "Browse technician profiles and find skills that fit your home repair needs."],
    ["price_check", "Transparent starting prices", "Review the listed starting price before you reach out about a service."],
    ["calendar_month", "Convenient booking", "Find available technicians and make it easier to plan your next repair."],
    ["work", "Job opportunities", "Technicians can connect with customers looking for home-service skills."],
    ["app_registration", "For customers and technicians", "FixNow is designed to bring both sides of the home-service marketplace together."],
    ["home_repair_service", "Home repair services", "Explore practical services for the jobs that keep your home running smoothly."]
];

export default function Home() {
    const { services, districts, stats } = useMeta();
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [featured, setFeatured] = useState([]);

    useEffect(() => {
        document.title = "FixNow | Trusted Home Services";
        const controller = new AbortController();
        api.technicians({ available: true, sort: "rating", limit: 3 }, controller.signal)
            .then((d) => setFeatured(d.technicians)).catch(() => {});
        return () => controller.abort();
    }, []);

    const onSearch = (event) => {
        event.preventDefault();
        const q = query.trim();
        navigate(q ? `/technicians?q=${encodeURIComponent(q)}` : "/technicians");
    };

    return (
        <>
            <section className="hero section-shell" id="home" aria-labelledby="hero-title">
                <div className="hero-copy">
                    <div className="eyebrow hero-eyebrow"><Icon name="verified_user" /> Trusted Home Repair Platform</div>
                    <h1 id="hero-title">Your Home Problems, Solved by <span>Trusted Professionals.</span></h1>
                    <p className="hero-description">Find skilled technicians, compare services, and get your home fixed without the hassle.</p>
                    <div className="hero-actions">
                        <Link className="button button-primary button-large" to="/technicians">Find a Technician <Icon name="arrow_forward" /></Link>
                        <Link className="button button-secondary button-large" to="/services"><Icon name="grid_view" /> Explore Services</Link>
                    </div>
                    <div className="hero-note"><Icon name="check_circle" /> A simpler way to find the help your home needs</div>
                </div>
                <div className="hero-art">
                    <div className="hero-art-wash" aria-hidden="true" />
                    <img src="/assets/technicains-illustrations.png" alt="Home-service technicians ready to help" />
                    <div className="hero-caption">
                        <Icon name="home_repair_service" />
                        <span><strong>Home care, made simple</strong><small>Find the right help for the job</small></span>
                    </div>
                </div>
            </section>

            <section className="stats-section section-shell" aria-label="FixNow at a glance">
                <div className="stats-strip">
                    <div className="stat-card"><CountUp value={stats.technicians} /><span>Technicians listed</span></div>
                    <div className="stat-card"><CountUp value={stats.available} /><span>Available to book now</span></div>
                    <div className="stat-card"><CountUp value={services.length} /><span>Home services</span></div>
                    <div className="stat-card"><CountUp value={districts.length} /><span>Phnom Penh districts covered</span></div>
                </div>
            </section>

            <section className="services-section section-shell" id="services" aria-labelledby="services-title">
                <div className="search-panel">
                    <form className="search-bar" role="search" onSubmit={onSearch}>
                        <Icon name="search" className="search-icon" />
                        <label className="sr-only" htmlFor="service-search">Search services or technicians</label>
                        <input id="service-search" name="service" type="search" placeholder="What can we help you fix?" autoComplete="off"
                            value={query} onChange={(e) => setQuery(e.target.value)} />
                        <button className="button button-primary search-submit" type="submit">Search</button>
                    </form>
                </div>

                <div className="section-heading">
                    <span className="eyebrow">Services for every home</span>
                    <h2 id="services-title">Find the right help for the job</h2>
                    <p>Explore our most requested home services and connect with a technician.</p>
                </div>
                <div className="category-grid">
                    {services.slice(0, 4).map((s) => (
                        <article className="category-card" key={s.id}>
                            <Icon name={s.icon} className="category-icon" />
                            <h3>{s.name}</h3>
                            <p>{s.short}</p>
                            <Link className="text-link" to={`/technicians?service=${s.id}`}>Find Technicians <Icon name="arrow_forward" /></Link>
                        </article>
                    ))}
                </div>
                <div className="center-actions">
                    <Link className="button button-secondary" to="/services">View all {services.length} services <Icon name="arrow_forward" /></Link>
                </div>
            </section>

            <section className="featured-section" id="technicians" aria-labelledby="technicians-title">
                <div className="section-shell">
                    <div className="section-heading">
                        <span className="eyebrow">Meet the professionals</span>
                        <h2 id="technicians-title">Top-rated technicians available</h2>
                        <p>Explore technician profiles, skills, services, and starting prices.</p>
                    </div>
                    <div className="technician-grid">{featured.map((t) => <TechCard key={t.id} tech={t} />)}</div>
                    <div className="center-actions">
                        <Link className="button button-primary" to="/technicians">See all technicians <Icon name="arrow_forward" /></Link>
                    </div>
                </div>
            </section>

            <section className="steps-section section-shell" id="how-it-works" aria-labelledby="steps-title">
                <div className="section-heading">
                    <span className="eyebrow">How it works</span>
                    <h2 id="steps-title">From problem to fixed in four steps</h2>
                    <p>No phone tag and no guesswork. Here is how a FixNow booking goes.</p>
                </div>
                <div className="steps-grid">
                    {STEPS.map(([title, text], i) => (
                        <article className="step-card" key={title}>
                            <span className="step-num" aria-hidden="true">{i + 1}</span>
                            <h3>{title}</h3>
                            <p>{text}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="benefits-section section-shell" id="about" aria-labelledby="benefits-title">
                <div className="section-heading">
                    <span className="eyebrow">Why FixNow</span>
                    <h2 id="benefits-title">Home repairs, without the hassle</h2>
                    <p>A straightforward way for customers and technicians to connect.</p>
                </div>
                <div className="benefits-grid">
                    {BENEFITS.map(([icon, title, text]) => (
                        <article className="benefit-card" key={title}>
                            <Icon name={icon} className="benefit-icon" />
                            <h3>{title}</h3>
                            <p>{text}</p>
                        </article>
                    ))}
                </div>
                <div className="center-actions"><Link className="button button-secondary" to="/about">Learn more about FixNow</Link></div>
            </section>

            <div className="join-wrap"><JoinSection /></div>
        </>
    );
}
