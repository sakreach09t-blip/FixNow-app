import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../api.js";

const MetaContext = createContext(null);
export const useMeta = () => useContext(MetaContext);

/** Loads services, districts, time slots and FAQ once, then renders the app. */
export function MetaProvider({ children }) {
    const [meta, setMeta] = useState(null);
    const [error, setError] = useState(null);

    const load = useCallback(() => {
        setError(null);
        api.meta().then(setMeta).catch((e) => setError(e.message));
    }, []);
    useEffect(load, [load]);

    if (error) {
        return (
            <div className="not-found section-shell">
                <div>
                    <div className="code" style={{ fontSize: "3rem" }}>Oops</div>
                    <p>{error}</p>
                    <button className="button button-primary" type="button" onClick={load}>Try again</button>
                </div>
            </div>
        );
    }
    if (!meta) return <div className="not-found section-shell" aria-busy="true"><p>Loading FixNow…</p></div>;
    return <MetaContext.Provider value={meta}>{children}</MetaContext.Provider>;
}
