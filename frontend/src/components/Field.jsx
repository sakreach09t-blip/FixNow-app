import { useState } from "react";

/** Small form helper: values + errors + props that wire inputs to labels and error text. */
export function useForm(initial) {
    const [values, setValues] = useState(initial);
    const [errors, setErrors] = useState({});
    const set = (name, value) => {
        setValues((v) => ({ ...v, [name]: value }));
        setErrors((e) => (e[name] ? { ...e, [name]: "" } : e));
    };
    // prefix keeps ids unique when two forms live on one page
    const input = (name, prefix) => ({
        id: `${prefix}-${name}`,
        name,
        value: values[name] ?? "",
        onChange: (event) => set(name, event.target.value),
        className: "input",
        "aria-invalid": errors[name] ? "true" : undefined,
        "aria-describedby": errors[name] ? `${prefix}-${name}-error` : undefined
    });
    // run validators: { field: (value, values) => message }. Returns true if everything passes.
    const validate = (validators) => {
        const next = {};
        for (const [name, fn] of Object.entries(validators)) {
            const message = fn(values[name], values);
            if (message) next[name] = message;
        }
        setErrors(next);
        const first = Object.keys(next)[0];
        if (first) setTimeout(() => document.querySelector(`[name="${first}"]`)?.focus(), 0);
        return !first;
    };
    return { values, errors, set, setErrors, setValues, input, validate };
}

export default function Field({ id, name, label, error, hint, required = true, full = false, children }) {
    return (
        <div className={full ? "field full" : "field"}>
            <label htmlFor={id}>{label}{required && <> <span className="req" aria-hidden="true">*</span></>}</label>
            {children}
            {hint && <span className="hint">{hint}</span>}
            <p className="field-error" id={`${id}-error`} data-error-for={name}>{error}</p>
        </div>
    );
}
