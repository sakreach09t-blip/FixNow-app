import { useEffect, useRef, useState } from "react";

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Header gains a shadow and shrinks after scrolling (class is-scrolled). */
export function useScrolled(threshold = 12) {
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > threshold);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [threshold]);
    return scrolled;
}

/** Click ripple on buttons, tabs and icon buttons. Mounted once for the whole app. */
export function useRipple() {
    useEffect(() => {
        if (prefersReducedMotion()) return undefined;
        const targets = ".button, .install-button, .tab, .modal-close, .nav-toggle, .nav-close";
        const onDown = (event) => {
            const target = event.target.closest?.(targets);
            if (!target || target.disabled) return;
            const rect = target.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height) * 1.6;
            const ripple = document.createElement("span");
            ripple.className = "ripple";
            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
            ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
            target.appendChild(ripple);
            ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
        };
        document.addEventListener("pointerdown", onDown);
        return () => document.removeEventListener("pointerdown", onDown);
    }, []);
}

const REVEAL = [
    ".section-heading", ".category-card", ".benefit-card", ".step-card", ".stat-card",
    ".join-card", ".service-detail", ".contact-card", ".split > *", ".faq-item",
    ".page-section .form-card", ".side-card", ".summary-card", ".service-nav"
].join(",");

/** Fade/slide sections in as they scroll into view. Re-scans whenever the route changes. */
export function useRevealOnScroll(routeKey) {
    useEffect(() => {
        if (prefersReducedMotion() || !("IntersectionObserver" in window)) return undefined;
        const timers = [];
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                observer.unobserve(el);
                el.classList.add("is-visible");
                // Give hover transitions back to the element once the reveal has finished.
                timers.push(setTimeout(() => {
                    el.removeAttribute("data-reveal");
                    el.classList.remove("is-visible");
                    el.style.removeProperty("--reveal-delay");
                }, 900));
            });
        }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

        const frame = requestAnimationFrame(() => {
            [...document.querySelectorAll(REVEAL)].filter((el) => !el.closest("[hidden]") && !el.hasAttribute("data-reveal")).forEach((el) => {
                const siblings = el.parentElement ? [...el.parentElement.children].filter((c) => c.matches(REVEAL)) : [];
                el.style.setProperty("--reveal-delay", `${Math.min(Math.max(0, siblings.indexOf(el)), 6) * 70}ms`);
                el.setAttribute("data-reveal", "");
                observer.observe(el);
            });
        });
        return () => { cancelAnimationFrame(frame); observer.disconnect(); timers.forEach(clearTimeout); };
    }, [routeKey]);
}

/** Number that counts up from 0 the first time it scrolls into view. */
export function CountUp({ value }) {
    const ref = useRef(null);
    const [shown, setShown] = useState(prefersReducedMotion() ? value : 0);
    useEffect(() => {
        if (prefersReducedMotion() || !("IntersectionObserver" in window)) { setShown(value); return undefined; }
        let frame;
        const observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) return;
            observer.disconnect();
            const start = performance.now();
            const tick = (now) => {
                const t = Math.min(1, (now - start) / 900);
                setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
                if (t < 1) frame = requestAnimationFrame(tick);
            };
            frame = requestAnimationFrame(tick);
        }, { threshold: 0.6 });
        observer.observe(ref.current);
        return () => { observer.disconnect(); cancelAnimationFrame(frame); };
    }, [value]);
    return <strong ref={ref}>{shown}</strong>;
}
