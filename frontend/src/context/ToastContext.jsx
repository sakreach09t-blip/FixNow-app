import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
    const [items, setItems] = useState([]);
    const nextId = useRef(0);

    const toast = useCallback((message) => {
        const id = ++nextId.current;
        setItems((list) => [...list, { id, message }]);
        setTimeout(() => setItems((list) => list.filter((item) => item.id !== id)), 4200);
    }, []);

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="toast-region" role="status" aria-live="polite">
                {items.map((item) => <div className="toast" key={item.id}>{item.message}</div>)}
            </div>
        </ToastContext.Provider>
    );
}
