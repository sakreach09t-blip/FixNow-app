import { useEffect, useRef } from "react";
import Icon from "./Icon.jsx";

/** Yes/no dialog. Render it with `open` true/false; it uses the native <dialog> element. */
export default function ConfirmDialog({ open, title, children, confirmLabel, cancelLabel = "Keep booking", busy, onConfirm, onClose }) {
    const ref = useRef(null);
    useEffect(() => {
        const dialog = ref.current;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);
    return (
        <dialog className="modal" ref={ref} aria-labelledby="confirm-title" onClose={onClose}
            onClick={(e) => { if (e.target === ref.current) onClose(); }}>
            <div className="modal-head">
                <h2 id="confirm-title">{title}</h2>
                <button className="modal-close" type="button" aria-label="Close" onClick={onClose}><Icon name="close" /></button>
            </div>
            <div className="modal-body">
                <p>{children}</p>
                <div className="modal-footer" style={{ justifyContent: "flex-end" }}>
                    <button className="button button-secondary" type="button" onClick={onClose}>{cancelLabel}</button>
                    <button className="button button-primary" type="button" onClick={onConfirm} disabled={busy}>{confirmLabel}</button>
                </div>
            </div>
        </dialog>
    );
}
