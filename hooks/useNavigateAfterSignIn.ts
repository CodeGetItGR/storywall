'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { localeCookieName } from '@/i18n/config';

// Sign-in can restore the account's language into the locale cookie (see
// lib/auth/accountLocale.ts). The root layout survives a client-side
// navigation and would stay in the old language, so a changed language gets a
// full page load instead.
function localeCookieChanged(): boolean {
    const match = document.cookie.match(new RegExp(`(?:^|; )${localeCookieName}=([^;]*)`));
    return match !== null && decodeURIComponent(match[1]) !== document.documentElement.lang;
}

export function useNavigateAfterSignIn() {
    const router = useRouter();

    return useCallback(
        (path: string) => {
            if (localeCookieChanged()) window.location.replace(path);
            else router.replace(path);
        },
        [router],
    );
}
