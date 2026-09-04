import { useEffect, useState } from 'react';

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
                    renderButton: (parent: HTMLElement, options: { theme: string; size: string; width?: number }) => void;
                };
            };
        };
    }
}

// Loads Google's own unversioned gsi/client script once per page (Google
// rotates it without notice — no SRI hash is possible, see the OAuth guide).
// Returns whether `window.google.accounts.id` is ready to call.
export function useGoogleIdentitySdk(): boolean {
    const [ready, setReady] = useState(() => typeof window !== 'undefined' && Boolean(window.google?.accounts?.id));

    useEffect(() => {
        if (ready) return;
        if (typeof document === 'undefined') return;

        const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
        if (existing) {
            existing.addEventListener('load', () => setReady(true), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        script.addEventListener('load', () => setReady(true), { once: true });
        document.head.appendChild(script);
    }, [ready]);

    return ready;
}
