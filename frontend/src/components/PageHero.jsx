import { Link } from "react-router-dom";

export default function PageHero({ crumb, title, children }) {
    return (
        <section className="page-hero" aria-labelledby="page-title">
            <div className="section-shell">
                <ol className="breadcrumb"><li><Link to="/">Home</Link></li><li aria-current="page">{crumb}</li></ol>
                <h1 id="page-title">{title}</h1>
                <p>{children}</p>
            </div>
        </section>
    );
}
