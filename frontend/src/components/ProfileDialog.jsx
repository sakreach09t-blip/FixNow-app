import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon.jsx";

const ProfileContext = createContext(() => {});
export const useProfile = () => useContext(ProfileContext);

/** Holds the technician profile dialog once for the whole app; any card can open it. */
export function ProfileProvider({ children }) {
    const [tech, setTech] = useState(null);
    const ref = useRef(null);

    const open = useCallback((t) => setTech(t), []);
    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (tech && !dialog.open) dialog.showModal();
    }, [tech]);

    const close = () => ref.current?.close();
    const busy = tech?.status === "busy";

    return (
        <ProfileContext.Provider value={open}>
            {children}
            <dialog className="modal" ref={ref} aria-labelledby="profile-title" onClose={() => setTech(null)}
                onClick={(e) => { if (e.target === ref.current) close(); }}>
                {tech && (
                    <>
                        <div className="modal-head">
                            <img src={`/assets/${tech.photo}`} alt="" />
                            <div>
                                <h2 id="profile-title">{tech.name}</h2>
                                <div className="tech-line">
                                    <span className="skill-tag">{tech.trade}</span>
                                    <span className={`availability ${busy ? "busy" : "available"}`} style={{ position: "static" }}>
                                        <span />{busy ? "Busy" : "Available"}
                                    </span>
                                </div>
                            </div>
                            <button className="modal-close" type="button" aria-label="Close profile" onClick={close}><Icon name="close" /></button>
                        </div>
                        <div className="modal-body">
                            <p>{tech.bio}</p>
                            <div className="profile-stats" style={{ marginTop: 20 }}>
                                <div><strong>{tech.rating.toFixed(1)}</strong><span>Rating</span></div>
                                <div><strong>{tech.jobs}</strong><span>Jobs done</span></div>
                                <div><strong>{tech.years} yrs</strong><span>Experience</span></div>
                            </div>
                            <h3>Skills</h3><p>{tech.skills}</p>
                            <h3>Services provided</h3>
                            <ul className="pill-list">{tech.provides.map((p) => <li key={p}>{p}</li>)}</ul>
                            <h3>Service categories</h3>
                            <ul className="pill-list">{tech.serviceNames.map((n) => <li key={n}>{n}</li>)}</ul>
                            <h3>Areas covered in Phnom Penh</h3>
                            <ul className="pill-list">{tech.areas.map((a) => <li key={a}>{a}</li>)}</ul>
                            <h3>Languages</h3><p>{tech.languages.join(", ")}</p>
                            <div className="modal-footer">
                                <div className="price"><span>Starting from</span><strong>${tech.price} <small>/ service</small></strong></div>
                                {busy
                                    ? <Link className="button button-secondary" to={`/technicians?service=${tech.services[0]}&available=1`} onClick={close}>See available {tech.serviceNames[0] || "technicians"}</Link>
                                    : <Link className="button button-primary" to={`/booking?tech=${tech.id}`} onClick={close}>Book {tech.name.split(" ")[0]}</Link>}
                            </div>
                        </div>
                    </>
                )}
            </dialog>
        </ProfileContext.Provider>
    );
}
