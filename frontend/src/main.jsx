import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { InstallProvider } from "./context/InstallContext.jsx";
import { MetaProvider } from "./context/MetaContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import "./styles/style.css";

document.documentElement.classList.add("js");

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToastProvider>
                <MetaProvider>
                    <AuthProvider>
                        <InstallProvider>
                            <App />
                        </InstallProvider>
                    </AuthProvider>
                </MetaProvider>
            </ToastProvider>
        </BrowserRouter>
    </StrictMode>
);

// Offline support. Also removes the pre-React worker, if a visitor still has it registered.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
    window.addEventListener("load", async () => {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations
                .filter((r) => [r.active, r.installing, r.waiting].some((w) => w?.scriptURL.endsWith("/js/server-worker.js")))
                .map((r) => r.unregister()));
            await navigator.serviceWorker.register("/service-worker.js");
        } catch (error) {
            console.error("PWA service worker registration failed:", error);
        }
    });
}
