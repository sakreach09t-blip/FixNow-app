import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

// The "Install FixNow" (PWA) logic from the original behavior.js, as a shared React context.
const InstallContext = createContext(null);
export const useInstall = () => useContext(InstallContext);

const isInstalled = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export function InstallProvider({ children }) {
    const deferred = useRef(null);
    const [installed, setInstalled] = useState(isInstalled);
    const [canPrompt, setCanPrompt] = useState(false);
    const [help, setHelp] = useState("");

    useEffect(() => {
        const onPrompt = (event) => {
            event.preventDefault();
            if (isInstalled()) return;
            deferred.current = event;
            setCanPrompt(true);
            setHelp("");
        };
        const onInstalled = () => { deferred.current = null; setInstalled(true); setCanPrompt(false); };
        window.addEventListener("beforeinstallprompt", onPrompt);
        window.addEventListener("appinstalled", onInstalled);
        return () => {
            window.removeEventListener("beforeinstallprompt", onPrompt);
            window.removeEventListener("appinstalled", onInstalled);
        };
    }, []);

    const helpMessage = () => (isIOS()
        ? "In Safari, tap Share, then choose “Add to Home Screen” to install FixNow."
        : "The native install prompt is unavailable. Open your browser menu and choose “Install app” or “Add to Home Screen”.");

    const install = useCallback(async () => {
        if (!deferred.current) { setHelp(helpMessage()); return; }
        const prompt = deferred.current;
        deferred.current = null;
        try {
            await prompt.prompt();
            const { outcome } = await prompt.userChoice;
            if (outcome === "accepted" || isInstalled()) setInstalled(true);
            else { setCanPrompt(false); setHelp("Installation was canceled. You can install FixNow from your browser menu."); }
        } catch {
            setHelp(helpMessage());
        }
    }, []);

    return <InstallContext.Provider value={{ installed, canPrompt, help, install }}>{children}</InstallContext.Provider>;
}
