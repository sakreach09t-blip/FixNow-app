import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import Icon from "../components/Icon.jsx";
import PageHero from "../components/PageHero.jsx";
import TechCard from "../components/TechCard.jsx";
import { useMeta } from "../context/MetaContext.jsx";

export default function Technicians() {
    const { services, districts } = useMeta();
    const [params, setParams] = useSearchParams();
    const [text, setText] = useState(params.get("q") || "");
    const [result, setResult] = useState({ technicians: [], total: 0, availableNow: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const typed = useRef(false);

    const service = params.get("service") || "";
    const area = params.get("area") || "";
    const sort = params.get("sort") || "recommended";
    const available = params.get("available") === "1";
    const q = params.get("q") || "";

    useEffect(() => { document.title = "Find Technicians | FixNow"; }, []);

    // keep the URL in step with the filters so a search can be shared or bookmarked
    // Always start from the live URL, so a delayed search never overwrites a filter changed in the meantime.
    const update = (changes) => {
        const next = new URLSearchParams(window.location.search);
        Object.entries(changes).forEach(([k, v]) => { if (v) next.set(k, v); else next.delete(k); });
        setParams(next, { replace: true });
    };

    // typing waits a moment before searching, other filters apply at once
    useEffect(() => {
        if (!typed.current) return undefined;
        const timer = setTimeout(() => update({ q: text.trim() }), 250);
        return () => clearTimeout(timer);
    }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        api.technicians({ q, service, area, available, sort }, controller.signal)
            .then((d) => { setResult(d); setError(""); setLoading(false); })
            .catch((e) => { if (e.name !== "AbortError") { setError(e.message); setLoading(false); } });
        return () => controller.abort();
    }, [q, service, area, available, sort]);

    const reset = () => { typed.current = false; setText(""); setParams({}, { replace: true }); };
    const onSubmit = (e) => { e.preventDefault(); update({ q: text.trim() }); };

    return (
        <>
            <PageHero crumb="Find Technicians" title="Find a technician">
                Search by skill or service, filter by area and availability, then book the right person for the job.
            </PageHero>
            <section className="technicians-section" id="technicians" aria-label="Technician results" style={{ paddingBlock: "56px 96px" }}>
                <div className="section-shell">
                    <div className="search-panel" style={{ marginBottom: 18, width: "100%" }}>
                        <form className="search-bar" role="search" onSubmit={onSubmit}>
                            <Icon name="search" className="search-icon" />
                            <label className="sr-only" htmlFor="service-search">Search services or technicians</label>
                            <input id="service-search" name="service" type="search" autoComplete="off"
                                placeholder="Search by name, skill or service, e.g. leaking tap"
                                value={text} onChange={(e) => { typed.current = true; setText(e.target.value); }} />
                            <button className="button button-primary search-submit" type="submit">Search</button>
                        </form>
                    </div>
                    <div className="filter-bar" role="group" aria-label="Filters">
                        <div className="field"><label htmlFor="filter-service">Service</label>
                            <select className="input" id="filter-service" value={service} onChange={(e) => update({ service: e.target.value })}>
                                <option value="">All services</option>
                                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select></div>
                        <div className="field"><label htmlFor="filter-area">Area</label>
                            <select className="input" id="filter-area" value={area} onChange={(e) => update({ area: e.target.value })}>
                                <option value="">All areas</option>
                                {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                            </select></div>
                        <div className="field"><label htmlFor="filter-sort">Sort by</label>
                            <select className="input" id="filter-sort" value={sort} onChange={(e) => update({ sort: e.target.value === "recommended" ? "" : e.target.value })}>
                                <option value="recommended">Recommended</option>
                                <option value="rating">Highest rated</option>
                                <option value="price-asc">Price: low to high</option>
                                <option value="price-desc">Price: high to low</option>
                                <option value="experience">Most experienced</option>
                            </select></div>
                        <div className="field"><span className="label">Availability</span>
                            <label className="chip"><input type="checkbox" id="filter-available" checked={available}
                                onChange={(e) => update({ available: e.target.checked ? "1" : "" })} /><span>Available now only</span></label></div>
                    </div>
                    <div className="filter-meta">
                        <p className="results-count" role="status" aria-live="polite">
                            {loading ? "Searching…" : result.total ? `${result.total} ${result.total === 1 ? "technician" : "technicians"} found · ${result.availableNow} available now` : "No technicians found"}
                        </p>
                        <div className="filter-meta-actions"><button className="text-link" type="button" onClick={reset}>Reset filters</button></div>
                    </div>

                    {error && <div className="notice error" role="alert"><Icon name="error" /><span>{error}</span></div>}
                    {!error && !loading && result.total === 0 ? (
                        <div className="empty-state">
                            <Icon name="search_off" />
                            <h3>No technicians match that search</h3>
                            <p>Try another service, widen the area, or switch off the availability filter.</p>
                            <button className="button button-primary" type="button" onClick={reset}>Reset filters</button>
                        </div>
                    ) : (
                        <div className="technician-grid" aria-busy={loading} style={{ opacity: loading ? 0.55 : 1, transition: "opacity 200ms ease" }}>
                            {result.technicians.map((t) => <TechCard key={t.id} tech={t} />)}
                        </div>
                    )}
                </div>
            </section>
        </>
    );
}
