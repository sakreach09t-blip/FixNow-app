import { useEffect } from "react";
import PageHero from "../components/PageHero.jsx";
import { useMeta } from "../context/MetaContext.jsx";

// Template text: have it reviewed by a lawyer before launch.
function LegalPage({ title, crumb, sections }) {
    useEffect(() => { document.title = `${title} | FixNow`; }, [title]);
    return (
        <>
            <PageHero crumb={crumb} title={title}>Last updated 2026-11-23</PageHero>
            <section className="page-section section-shell">
                <div className="prose">
                    {sections.map(([heading, body]) => (
                        <div key={heading}><h2>{heading}</h2>{body}</div>
                    ))}
                </div>
            </section>
        </>
    );
}

export function Privacy() {
    const { contact } = useMeta();
    return (
        <LegalPage title="Privacy Policy" crumb="Privacy Policy" sections={[
            ["What we collect", <p>When you create an account, make a booking or contact us, we collect the details you give us: your name, phone number, email address, district, service address and any notes about the job. Technicians also provide their skills, experience, areas covered and starting price.</p>],
            ["How we use it", <ul><li>To arrange, confirm and manage your bookings</li><li>To let technicians contact you about a job you booked</li><li>To review technician applications</li><li>To answer your questions and improve FixNow</li></ul>],
            ["Who sees it", <p>Your booking details are shared with the technician you book so they can visit you. We do not sell your personal information.</p>],
            ["How it is stored", <p>Your details are stored in our database. Passwords are never stored in plain text; only a secure one-way hash is kept.</p>],
            ["Your choices", <p>You can ask us to correct or delete your information at any time by contacting <a href={`mailto:${contact.email}`}>{contact.email}</a>.</p>],
            ["Changes", <p>We may update this policy as FixNow grows. The date at the top shows when it last changed.</p>]
        ]} />
    );
}

export function Terms() {
    const { contact } = useMeta();
    return (
        <LegalPage title="Terms of Service" crumb="Terms of Service" sections={[
            ["About FixNow", <p>FixNow is a platform that helps customers find and book independent home-service technicians. Technicians are responsible for the services they provide.</p>],
            ["Using the site", <ul><li>Give accurate information when you register and book.</li><li>Keep your password private.</li><li>Do not misuse the site or interfere with other users.</li></ul>],
            ["Bookings", <p>A booking is a request for a technician to visit at the chosen time. Please cancel as early as you can if your plans change so that the slot can be offered to others.</p>],
            ["Prices and payment", <p>Prices shown are starting prices for a standard visit. The technician confirms the final price with you before work begins, and you pay the technician directly after the job is completed.</p>],
            ["Technician accounts", <p>Technician applications are reviewed before a profile is published. We may remove profiles that give false information or fall short of our standards.</p>],
            ["Liability", <p>We work to connect you with reliable technicians but cannot guarantee the quality of every job. Please raise any problem with the technician first, and contact us if it is not resolved.</p>],
            ["Contact", <p>Questions about these terms? Email <a href={`mailto:${contact.email}`}>{contact.email}</a>.</p>]
        ]} />
    );
}
