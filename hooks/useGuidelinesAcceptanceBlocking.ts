'use client';

import { usePathname } from 'next/navigation';

import { useMe } from '@/hooks/useMe';

// Pages that stay reachable while the gate is up. /legal/ holds the guidelines and
// the Terms themselves (the gate's links open them in a new tab). The auth pages and
// newsletter token links are exempt from 4013 and 4020 server-side, and gating them would
// only trap a signed-in user who landed there. /report-content is the public content
// notice form: POST /api/content-notices is exempt from 4013 and 4020 so that a user who has
// not accepted the current Guidelines can still report. Keep this list short.
const UNGATED_PREFIXES = [
    '/legal/',
    '/login',
    '/register',
    '/verify-email',
    '/forgot-password',
    '/reset-password',
    '/newsletter/',
    '/report-content',
];

function isUngatedPath(pathname: string | null): boolean {
    if (!pathname) return false;
    return UNGATED_PREFIXES.some((prefix) =>
        prefix.endsWith('/') ? pathname.startsWith(prefix) : pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
}

// isBlocking: true while GuidelinesAcceptanceGate is replacing the page, for the
// Community Guidelines, the Terms of Use, or both. Also read by ComposerProvider,
// whose modals render beside the page rather than inside it.
// guidelinesVersion / termsVersion: the version the user still owes, which the gate's
// accept sends back; null when that document is not owed.
// Signed out, useMe never runs, so this is false.
export function useGuidelinesAcceptanceBlocking(): { isBlocking: boolean; guidelinesVersion: string | null; termsVersion: string | null } {
    const pathname = usePathname();
    const { data: me } = useMe();
    const guidelinesVersion = (me?.guidelinesAcceptanceRequired && me.currentGuidelinesVersion) || null;
    const termsVersion = (me?.termsAcceptanceRequired && me.currentTermsVersion) || null;
    return { isBlocking: Boolean(guidelinesVersion || termsVersion) && !isUngatedPath(pathname), guidelinesVersion, termsVersion };
}
