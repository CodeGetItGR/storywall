import { useEffect, useState } from 'react';

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
                    renderButton: (
                        parent: HTMLElement,
                        options: {
                            type?: string;
                            theme: string;
                            size: string;
                            text?: string;
                            shape?: string;
                            logo_alignment?: string;
                            width?: number;
                            locale?: string;
                        },
                    ) => void;
                };
            };
        };
    }
}

// Loads Google's own unversioned gsi/client script once per page (Google
// rotates it without notice — no SRI hash is possible, see the OAuth guide).
// Returns whether `window.google.accounts.id` is ready to call.
export function useGoogleIdentitySdk(locale?: string): boolean {
    const [ready, setReady] = useState(() => typeof window !== 'undefined' && Boolean(window.google?.accounts?.id));

    useEffect(() => {
        if (ready) return;
        if (typeof document === 'undefined') return;

        const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity-sdk]');
        if (existing) {
            const handleExistingLoad = () => setReady(true);
            existing.addEventListener('load', handleExistingLoad, { once: true });
            return () => existing.removeEventListener('load', handleExistingLoad);
        }

        const script = document.createElement('script');
        script.src = locale ? `${SCRIPT_SRC}?hl=${encodeURIComponent(locale)}` : SCRIPT_SRC;
        script.dataset.googleIdentitySdk = '';
        script.async = true;
        script.defer = true;

        const handleLoad = () => setReady(true);
        script.addEventListener('load', handleLoad, { once: true });
        document.head.appendChild(script);

        return () => {
            script.removeEventListener('load', handleLoad);
        };
    }, [locale, ready]);

    return ready;
}
