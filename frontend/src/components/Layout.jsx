import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { ProfileProvider } from "./ProfileDialog.jsx";
import { useRevealOnScroll, useRipple } from "../hooks/motion.jsx";
import Footer from "./Footer.jsx";
import Header from "./Header.jsx";

/** Scroll to top on navigation, or to the #anchor when the link has one. */
function useScrollManager() {
    const { pathname, hash } = useLocation();
    useEffect(() => {
        if (hash) {
            const id = decodeURIComponent(hash.slice(1));
            const timer = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
            return () => clearTimeout(timer);
        }
        window.scrollTo(0, 0);
        return undefined;
    }, [pathname, hash]);
}

export default function Layout() {
    const { pathname } = useLocation();
    useScrollManager();
    useRipple();
    useRevealOnScroll(pathname);
    const showFooter = !pathname.startsWith("/admin");
    return (
        <ProfileProvider>
            <a className="sr-only" href="#main">Skip to content</a>
            <Header />
            <main id="main"><Outlet /></main>
            {showFooter && <Footer />}
        </ProfileProvider>
    );
}
