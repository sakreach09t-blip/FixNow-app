import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useInstall } from "../context/InstallContext.jsx";
import { useMeta } from "../context/MetaContext.jsx";
import Icon from "./Icon.jsx";

export default function Footer() {
    const { services, contact } = useMeta();
    const { user, ready } = useAuth();
    const install = useInstall();
    const showJoin = ready && !user;
    return (
        <footer className="site-footer" id="footer">
            <div className="footer-main section-shell">
                <div className="footer-brand">
                    <Link className="brand footer-logo" to="/" aria-label="FixNow home">
                        <img src="/assets/fixnow.png" alt="" className="brand-logo" />
                        <span>Fix<span className="brand-accent">Now</span></span>
                    </Link>
                    <p>Find skilled home-service professionals and make home repairs simpler.</p>
                    <div className="footer-social" aria-label="Contact FixNow">
                        <Link to="/contact" aria-label="Send us a message"><Icon name="forum" /></Link>
                        <a href={`mailto:${contact.email}`} aria-label={`Email ${contact.email}`}><Icon name="mail" /></a>
                        {showJoin && <Link to="/join" aria-label="Join the community"><Icon name="groups" /></Link>}
                    </div>
                </div>
                <nav className="footer-links" aria-label="Explore">
                    <h2>Explore</h2>
                    <Link to="/">Home</Link>
                    <Link to="/technicians">Find Technicians</Link>
                    <Link to="/services">Services</Link>
                    <Link to="/about">About FixNow</Link>
                    <Link to="/contact">Contact</Link>
                    <Link to="/my-bookings">My Bookings</Link>
                </nav>
                <nav className="footer-links" aria-label="Services">
                    <h2>Services</h2>
                    {services.map((s) => <Link key={s.id} to={`/services#${s.id}`}>{s.name}</Link>)}
                </nav>
                <div className="footer-join">
                    {showJoin && <>
                        <h2>Join FixNow</h2>
                        <p>Find a technician or bring your skills to the community.</p>
                        <Link className="footer-join-link" to="/join">Explore ways to join <Icon name="arrow_forward" /></Link>
                    </>}
                    {!install.installed && (
                        <button id="installAppFooter" className="install-button footer-download-button" type="button" onClick={install.install}>
                            <Icon name="install_mobile" /> Install FixNow
                        </button>
                    )}
                    {install.help && <p className="footer-download-feedback" role="status" aria-live="polite">{install.help}</p>}
                </div>
            </div>
            <div className="footer-bottom section-shell">
                <span>&copy; 2026 FixNow. All rights reserved.</span>
                <span className="footer-bottom-links">
                    <Link to="/privacy">Privacy</Link>
                    <Link to="/terms">Terms</Link>
                    <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Back to top <Icon name="arrow_upward" /></a>
                </span>
            </div>
        </footer>
    );
}
