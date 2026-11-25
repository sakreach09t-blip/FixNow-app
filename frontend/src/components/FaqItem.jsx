import { useRef } from "react";
import { prefersReducedMotion } from "../hooks/motion.jsx";

/** <details> accordion that animates its height open and closed. */
export default function FaqItem({ question, answer }) {
    const ref = useRef(null);

    const onClick = (event) => {
        const details = ref.current;
        if (prefersReducedMotion() || !details.animate) return;
        event.preventDefault();
        const summary = details.querySelector("summary");
        const closedHeight = summary.offsetHeight + 2;
        if (!details.open) {
            details.open = true;
            details.animate({ height: [`${closedHeight}px`, `${details.scrollHeight}px`] }, { duration: 280, easing: "cubic-bezier(.2,.8,.2,1)" });
        } else {
            const animation = details.animate({ height: [`${details.offsetHeight}px`, `${closedHeight}px`] }, { duration: 220, easing: "ease-in-out" });
            animation.onfinish = () => { details.open = false; };
        }
    };

    return (
        <details className="faq-item" ref={ref}>
            <summary onClick={onClick}>{question}</summary>
            <p>{answer}</p>
        </details>
    );
}
