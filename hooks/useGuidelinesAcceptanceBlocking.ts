'use client';

import { usePathname } from 'next/navigation';

import { useMe } from '@/hooks/useMe';

// Pages that stay reachable while the gate is up. /legal/ holds the guidelines
// themselves (the gate's Read link opens them in a new tab). The auth pages and
// newsletter token links are exempt from 4013 server-side, and gating them would
// only trap a signed-in user who landed there. Keep this list short.
const UNGATED_PREFIXES = ['/legal/', '/login', '/register', '/verify-email', '/forgot-password', '/reset-password', '/newsletter/'];

export function isUngatedPath(pathname: string | null): boolean {
    if (!pathname) return false;
    return UNGATED_PREFIXES.some((prefix) =>
        prefix.endsWith('/') ? pathname.startsWith(prefix) : pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
}

// True while GuidelinesAcceptanceGate is replacing the page. Also read by
// ComposerProvider, whose modals render beside the page rather than inside it.
// Signed out, useMe never runs, so this is false.
export function useGuidelinesAcceptanceBlocking(): boolean {
    const pathname = usePathname();
    const { data: me } = useMe();
    return Boolean(me?.guidelinesAcceptanceRequired && me.currentGuidelinesVersion) && !isUngatedPath(pathname);
}
