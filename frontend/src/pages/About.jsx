import { useEffect } from "react";
import { Link } from "react-router-dom";
import FaqItem from "../components/FaqItem.jsx";
import Icon from "../components/Icon.jsx";
import JoinSection from "../components/JoinSection.jsx";
import PageHero from "../components/PageHero.jsx";
import { useMeta } from "../context/MetaContext.jsx";

const VALUES = [
    ["verified", "Trust first", "Clear profiles, honest starting prices and real availability so you know what to expect."],
    ["bolt", "Fast and simple", "Booking should take minutes, not a dozen phone calls to strangers."],
    ["diversity_3", "Fair to technicians", "Skilled people deserve steady work, fair pay and customers who respect their time."],
    ["home_repair_service", "Quality at home", "A well-maintained home is a safer, calmer place to live. We back the people who make that happen."]
];
const CUSTOMER_STEPS = ["Search or browse by service", "Compare profiles and starting prices", "Pick a date and time slot", "Meet your technician and pay after the job"];
const TECH_STEPS = ["Create a technician profile", "Share your skills, areas and starting price", "We review your application", "Receive booking requests from customers"];

export default function About() {
    const { faq } = useMeta();
    useEffect(() => { document.title = "About FixNow | Trusted Home Services"; }, []);
    return (
        <>
            <PageHero crumb="About" title="Home repairs, made simple">
                FixNow is a home-repair booking platform that connects households in Phnom Penh with skilled, available technicians.
            </PageHero>

            <section className="about-block section-shell" id="story" aria-labelledby="story-title" style={{ paddingTop: 72 }}>
                <div className="split">
                    <div>
                        <span className="eyebrow">Our story</span>
                        <h2 id="story-title">Fixing a home shouldn't be harder than the problem itself</h2>
                        <p>Finding a reliable electrician, plumber or AC technician usually means asking around, waiting for call-backs and guessing at the price. Good technicians, meanwhile, struggle to reach the customers who need them.</p>
                        <p>FixNow puts both sides in one place. Customers see who is available, what they do and what they charge to start. Technicians get a profile, a steady stream of requests and a calendar that respects their time.</p>
                        <div className="hero-actions">
                            <Link className="button button-primary" to="/technicians">Find a technician</Link>
                            <Link className="button button-secondary" to="/join?type=technician">Become a technician</Link>
                        </div>
                    </div>
                    <div className="split-art">
                        <div className="hero-art-wash" aria-hidden="true" />
                        <img src="/assets/fixnow-maskot.png" alt="The FixNow technician mascot giving a thumbs up" />
                    </div>
                </div>
            </section>

            <section className="about-block section-shell" aria-labelledby="mission-title">
                <div className="section-heading"><span className="eyebrow">Mission and vision</span><h2 id="mission-title">Where we are headed</h2></div>
                <div className="two-col">
                    <article className="benefit-card"><Icon name="flag" className="benefit-icon" /><h3>Our mission</h3><p>To make finding and booking a trusted home-service technician fast, transparent and stress-free for every household.</p></article>
                    <article className="benefit-card"><Icon name="visibility" className="benefit-icon" /><h3>Our vision</h3><p>A city where every home is quickly looked after, and every skilled technician has the customers and tools to build a good living.</p></article>
                </div>
            </section>

            <section className="about-block section-shell" aria-labelledby="values-title">
                <div className="section-heading"><span className="eyebrow">What we care about</span><h2 id="values-title">Our values</h2></div>
                <div className="benefits-grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
                    {VALUES.map(([icon, title, text]) => (
                        <article className="benefit-card" key={title}><Icon name={icon} className="benefit-icon" /><h3>{title}</h3><p>{text}</p></article>
                    ))}
                </div>
            </section>

            <section className="about-block section-shell" aria-labelledby="how-title">
                <div className="section-heading"><span className="eyebrow">How it works</span><h2 id="how-title">For customers and technicians</h2></div>
                <div className="two-col">
                    <article className="benefit-card"><Icon name="home" className="benefit-icon" /><h3>For customers</h3>
                        <ul className="check-list" style={{ margin: "14px 0 0" }}>{CUSTOMER_STEPS.map((x) => <li key={x}><Icon name="check_circle" />{x}</li>)}</ul></article>
                    <article className="benefit-card"><Icon name="engineering" className="benefit-icon" /><h3>For technicians</h3>
                        <ul className="check-list" style={{ margin: "14px 0 0" }}>{TECH_STEPS.map((x) => <li key={x}><Icon name="check_circle" />{x}</li>)}</ul></article>
                </div>
            </section>

            <section className="about-block section-shell" id="faq" aria-labelledby="faq-title">
                <div className="section-heading">
                    <span className="eyebrow">Questions</span>
                    <h2 id="faq-title">Frequently asked questions</h2>
                    <p>Can't find your answer? <Link to="/contact" style={{ color: "var(--color-primary)" }}>Contact us</Link>.</p>
                </div>
                <div className="faq-list">{faq.map((f) => <FaqItem key={f.q} question={f.q} answer={f.a} />)}</div>
            </section>

            <div className="join-wrap" style={{ paddingTop: 80 }}><JoinSection /></div>
        </>
    );
}
