import { useEffect } from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
    useEffect(() => { document.title = "Page not found | FixNow"; }, []);
    return (
        <section className="not-found section-shell">
            <div>
                <img src="/assets/fixnow-maskot.png" alt="" />
                <div className="code">404</div>
                <h1 style={{ margin: "6px 0 0", fontSize: "1.7rem" }}>We couldn't find that page</h1>
                <p>The link may be broken or the page may have moved. Let's get you back to something useful.</p>
                <div className="center-actions" style={{ marginTop: 0 }}>
                    <Link className="button button-primary" to="/">Back to home</Link>
                    <Link className="button button-secondary" to="/technicians">Find a technician</Link>
                </div>
            </div>
        </section>
    );
}
