'use client';

import { useSearchParams } from 'next/navigation';
import { useSyncExternalStore } from 'react';

import { AUTH_RETURN_PATH_PARAM, getSafeReturnPath, withLocationHash } from '@/lib/auth/returnPath';

function subscribeToHash(onChange: () => void) {
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
}

// The login/register page's `next`, plus the `#section` the browser kept on
// this page's URL from the link that led here.
export function useAuthReturnPath(): string | null {
    const searchParams = useSearchParams();
    const hash = useSyncExternalStore(
        subscribeToHash,
        () => window.location.hash,
        () => '',
    );
    return getSafeReturnPath(withLocationHash(searchParams.get(AUTH_RETURN_PATH_PARAM), hash));
}
