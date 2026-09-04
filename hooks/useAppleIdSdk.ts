import { useEffect, useState } from 'react';

const SCRIPT_SRC = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';

declare global {
    interface Window {
        AppleID?: {
            auth: {
                init: (config: { clientId: string; scope: string; redirectURI: string; usePopup: boolean }) => void;
                signIn: () => Promise<{ authorization: { id_token: string } }>;
            };
        };
    }
}

// Same loading contract as useGoogleIdentitySdk — Apple serves this
// unversioned too, no SRI hash. See the OAuth guide's Apple section.
export function useAppleIdSdk(): boolean {
    const [ready, setReady] = useState(() => typeof window !== 'undefined' && Boolean(window.AppleID?.auth));

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
        script.addEventListener('load', () => setReady(true), { once: true });
        document.head.appendChild(script);
    }, [ready]);

    return ready;
}
