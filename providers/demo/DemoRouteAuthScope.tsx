'use client';

import { type ReactNode, useMemo } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useIsDemoRoute } from '@/hooks/useIsDemoRoute';
import { AuthContext, type AuthContextValue } from '@/providers/AuthProvider';

// On /demo pages the visitor's real account is out of scope. The demo brings its own session
// (DemoAuthProvider), and its mock worker answers account calls with demo data. Everything
// around the demo (memberships, the active event, /api/me for the Guidelines gate) reads as
// signed out, so it never asks the backend about the account. The session itself stays in the
// token store: leaving the demo lands signed in.
export function DemoRouteAuthScope({ children }: { children: ReactNode }) {
    const auth = useAuth();
    const isDemoRoute = useIsDemoRoute();
    const value: AuthContextValue = useMemo(
        () => (isDemoRoute ? { ...auth, user: null, isAuthenticated: false, isBootstrapping: false, isSessionUnavailable: false } : auth),
        [auth, isDemoRoute],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
