'use client';

import { useAuth } from '@/hooks/useAuth';
import { useIsHydrated } from '@/hooks/useIsHydrated';

// Whether the landing shows the signed-in header and hero. The server renders them signed out, and
// the session can settle before a part of the page has hydrated, so each part keeps the signed-out
// render until it has hydrated itself, then switches.
export function useLandingSignedIn(): boolean {
    const { isAuthenticated, isBootstrapping } = useAuth();
    const isHydrated = useIsHydrated();

    return isHydrated && isAuthenticated && !isBootstrapping;
}
