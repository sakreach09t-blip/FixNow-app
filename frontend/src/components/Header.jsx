import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useInstall } from "../context/InstallContext.jsx";
import { useMeta } from "../context/MetaContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { prefersReducedMotion, useScrolled } from "../hooks/motion.jsx";
import Icon from "./Icon.jsx";

const NAV = [
    { to: "/", label: "Home", end: true },
    { to: "/technicians", label: "Find Technicians" },
    { to: "/services", label: "Services", dropdown: true },
    { to: "/about", label: "About" },
    { to: "/contact", label: "Contact" },
    { to: "/my-bookings", label: "My Bookings" }
];

export default function Header() {
    const { services } = useMeta();
    const { user, ready, logout } = useAuth();
    const install = useInstall();
    const toast = useToast();
    const location = useLocation();
    const scrolled = useScrolled();

    const [menuOpen, setMenuOpen] = useState(false);
    const [closing, setClosing] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const toggleRef = useRef(null);

    const openRef = useRef(false);
    useEffect(() => { openRef.current = menuOpen; }, [menuOpen]);

    // Play the leave animation, then hide the panel (same behaviour as the original menu).
    const closeMenu = useCallback(() => {
        if (!openRef.current) return;
        if (prefersReducedMotion()) { setMenuOpen(false); return; }
        setClosing(true);
        setTimeout(() => { setClosing(false); setMenuOpen(false); }, 210);
    }, []);

    // close menus on navigation
    useEffect(() => { closeMenu(); setDropdownOpen(false); }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const onKey = (event) => {
            if (event.key !== "Escape") return;
            if (dropdownOpen) { setDropdownOpen(false); dropdownRef.current?.querySelector(".dropdown-toggle")?.focus(); }
            if (menuOpen) { closeMenu(); toggleRef.current?.focus(); }
        };
        const onClick = (event) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setDropdownOpen(false); };
        document.addEventListener("keydown", onKey);
        document.addEventListener("click", onClick);
        return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("click", onClick); };
    }, [dropdownOpen, menuOpen, closeMenu]);

    const onAuthClick = (event) => {
        if (!user) return;
        event.preventDefault();
        logout();
        toast("You have been signed out.");
    };

    const authLink = (
        <Link className="nav-link nav-auth" to="/login" onClick={onAuthClick}>{user ? "Sign out" : "Sign in"}</Link>
    );
    const installButton = (visible, id) => visible && (
        <button id={id} className="install-button" type="button" onClick={install.install}>
            <Icon name="install_mobile" /> Install FixNow
        </button>
    );

    return (
        <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
            <div className="header-inner">
                <Link className="brand" to="/" aria-label="FixNow home">
                    <img src="/assets/fixnow.png" alt="" className="brand-logo" />
                    <span>Fix<span className="brand-accent">Now</span></span>
                </Link>

                <nav className="desktop-nav" aria-label="Main navigation">
                    {NAV.map((item) => item.dropdown ? (
                        <div className={`nav-dropdown${dropdownOpen ? " is-open" : ""}`} ref={dropdownRef} key={item.to}>
                            <NavLink className="nav-link" to={item.to}>{item.label}</NavLink>
                            <button className="dropdown-toggle" type="button" aria-expanded={dropdownOpen} aria-haspopup="true"
                                aria-label="Show service categories" onClick={(e) => { e.stopPropagation(); setDropdownOpen((o) => !o); }}>
                                <Icon name="expand_more" />
                            </button>
                            <div className="dropdown-menu">
                                <div className="dropdown-panel">
                                    {services.map((s) => (
                                        <Link key={s.id} to={`/services#${s.id}`}><Icon name={s.icon} />{s.name}</Link>
                                    ))}
                                    <Link className="dropdown-all" to="/services">View all services <Icon name="arrow_forward" /></Link>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <NavLink key={item.to} className="nav-link" to={item.to} end={item.end}>{item.label}</NavLink>
                    ))}
                    {user?.role === "admin" && <NavLink className="nav-link" to="/admin">Admin</NavLink>}
                    {authLink}
                    {ready && !user && <Link className="button button-primary nav-join" to="/join">Join Us</Link>}
                    {installButton(install.canPrompt && !install.installed, "installApp")}
                </nav>

                <button ref={toggleRef} className={`nav-toggle${menuOpen && !closing ? " is-open" : ""}`} type="button"
                    aria-controls="mobile-navigation" aria-expanded={menuOpen && !closing}
                    aria-label={menuOpen && !closing ? "Close navigation" : "Open navigation"}
                    onClick={() => (menuOpen && !closing ? closeMenu() : setMenuOpen(true))}>
                    <Icon name={menuOpen && !closing ? "close" : "menu"} />
                </button>
            </div>

            <nav className={`mobile-nav-panel${closing ? " is-closing" : ""}`} id="mobile-navigation" aria-label="Mobile navigation" hidden={!menuOpen}>
                <div className="mobile-nav-top">
                    <span className="mobile-nav-title">Menu</span>
                    <button className="nav-close" type="button" aria-label="Close navigation" onClick={() => { closeMenu(); toggleRef.current?.focus(); }}>
                        <Icon name="close" />
                    </button>
                </div>
                {NAV.map((item) => <NavLink key={item.to} className="nav-link" to={item.to} end={item.end}>{item.label}</NavLink>)}
                {user?.role === "admin" && <NavLink className="nav-link" to="/admin">Admin</NavLink>}
                {authLink}
                {ready && !user && <Link className="button button-primary" to="/join">Join Us</Link>}
                {installButton(!install.installed, "installAppMobile")}
                {install.help && <p className="install-guidance" role="status" aria-live="polite">{install.help}</p>}
            </nav>
        </header>
    );
}
