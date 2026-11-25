import { Link } from "react-router-dom";
import Icon from "./Icon.jsx";
import { useProfile } from "./ProfileDialog.jsx";

export default function TechCard({ tech }) {
    const openProfile = useProfile();
    const busy = tech.status === "busy";
    return (
        <article className="technician-card" data-id={tech.id}>
            <div className="technician-photo">
                <img src={`/assets/${tech.photo}`} alt={tech.name} loading="lazy" />
                <button className="photo-button" type="button" onClick={() => openProfile(tech)} aria-label={`View ${tech.name}'s profile`} />
                <span className={`availability ${busy ? "busy" : "available"}`}><span />{busy ? "Busy" : "Available"}</span>
            </div>
            <div className="technician-info">
                <div className="technician-name">
                    <h3>{tech.name}</h3>
                    <div className="tech-line">
                        <span className="skill-tag">{tech.trade}</span>
                        <span className="rating"><Icon name="star" />{tech.rating.toFixed(1)} <small>({tech.jobs} jobs)</small></span>
                    </div>
                </div>
                <div className="profile-detail"><strong>Skills</strong><p>{tech.skills}</p></div>
                <div className="profile-detail"><strong>Services provided</strong><p>{tech.provides.join(", ")}</p></div>
                <button className="text-link" type="button" onClick={() => openProfile(tech)}>View profile <Icon name="arrow_forward" /></button>
                <div className="technician-footer">
                    <div className="price"><span>Starting from</span><strong>${tech.price} <small>/ service</small></strong></div>
                    {busy
                        ? <button className="button button-disabled book-button" type="button" disabled>Currently Busy</button>
                        : <Link className="button button-primary book-button" to={`/booking?tech=${tech.id}`}>Book Now</Link>}
                </div>
            </div>
        </article>
    );
}
