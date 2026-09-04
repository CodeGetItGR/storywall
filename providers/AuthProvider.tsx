'use client';

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { authClient } from '@/lib/api/authClient';
import type { AccountStatus, AuthProvider as AuthProviderName, AuthSessionDto, PlatformRole, UserResponseDto } from '@/lib/api/types';
import { clearSession, getAuthState, getSessionGeneration, setSession, subscribeAuthState, updateSessionProfile } from '@/lib/auth/tokenStore';

const BOOTSTRAP_TIMEOUT_MS = 8000;

interface AuthUser {
    userId: string;
    email: string | null;
    displayName: string | null;
    lastName: string | null;
    profilePictureUrl: string | null;
    authProvider: AuthProviderName;
    isGuestAccount: boolean;
    status: AccountStatus;
    createdAt: string;
    role: PlatformRole;
}

interface AuthContextValue {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isBootstrapping: boolean;
    register: (input: { email: string; password: string; displayName: string; inviteToken?: string }) => Promise<AuthSessionDto>;
    login: (input: { email: string; password: string; inviteToken?: string }) => Promise<AuthSessionDto>;
    oauth: (provider: 'GOOGLE' | 'APPLE', input: { idToken: string; inviteToken?: string }) => Promise<AuthSessionDto>;
    logout: () => Promise<void>;
    updateProfile: (profile: Pick<UserResponseDto, 'displayName' | 'lastName' | 'profilePictureUrl'>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [authState, setAuthState] = useState(getAuthState());
    const [isBootstrapping, setIsBootstrapping] = useState(true);

    useEffect(() => subscribeAuthState(setAuthState), []);

    // The access token is memory-only and doesn't survive a reload. On first
    // mount, ask the BFF to re-derive one from whatever httpOnly cookie it
    // holds (refresh token or guest identity) — see app/api/auth/session/route.ts.
    //
    // Every consumer of `isBootstrapping` renders a blank placeholder while it
    // is true (see components/layout/AppShell.tsx), so this probe must always
    // settle: an unbounded request would leave the whole app on an empty screen
    // with no error state and no way out but a reload. It is bounded by
    // BOOTSTRAP_TIMEOUT_MS and treated as "no session" if it doesn't answer,
    // which lands on the login screen instead of nothing at all.
    useEffect(() => {
        let cancelled = false;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), BOOTSTRAP_TIMEOUT_MS);
        const startedAt = getSessionGeneration();

        // Only apply the probe's verdict if nothing else wrote to the store
        // while it was in flight. A login that lands first owns the session —
        // a late "no session" answer to a question asked before the user
        // signed in must not clear it back out.
        function applyIfCurrent(apply: () => void) {
            if (cancelled || getSessionGeneration() !== startedAt) return;
            apply();
        }

        async function bootstrap() {
            try {
                const session = await authClient.session(controller.signal);
                applyIfCurrent(() => (session ? setSession(session) : clearSession()));
            } catch {
                applyIfCurrent(clearSession);
            } finally {
                clearTimeout(timeoutId);
                // Unlike the session verdict, this always applies: the app must
                // leave its blank bootstrapping state even when the probe was
                // superseded, aborted, or failed.
                if (!cancelled) setIsBootstrapping(false);
            }
        }

        bootstrap();
        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, []);

    const register = useCallback(async (input: { email: string; password: string; displayName: string; inviteToken?: string }) => {
        const session = await authClient.register(input);
        setSession(session);
        return session;
    }, []);

    const login = useCallback(async (input: { email: string; password: string; inviteToken?: string }) => {
        const session = await authClient.login(input);
        setSession(session);
        return session;
    }, []);

    const oauth = useCallback(async (provider: 'GOOGLE' | 'APPLE', input: { idToken: string; inviteToken?: string }) => {
        const session = await authClient.oauth(provider, input);
        setSession(session);
        return session;
    }, []);

    const logout = useCallback(async () => {
        try {
            await authClient.logout();
        } catch {
            // Logout is best-effort server-side revocation; always clear
            // client state regardless of whether the request succeeded.
        }
        clearSession();
    }, []);

    const updateProfile = useCallback((profile: Pick<UserResponseDto, 'displayName' | 'lastName' | 'profilePictureUrl'>) => {
        updateSessionProfile({
            displayName: profile.displayName ?? '',
            lastName: profile.lastName,
            profilePictureUrl: profile.profilePictureUrl,
        });
    }, []);

    // Memoized on the individual fields rather than on `authState`, so a write
    // that swaps the state object without changing who is signed in (a token
    // refresh) doesn't hand every consumer a new identity — while a write that
    // does change them propagates, which keying the memo on `isAuthenticated`
    // alone did not: a role or display name arriving later left consumers
    // holding the previous user.
    const { accessToken, userId, email, displayName, lastName, profilePictureUrl, authProvider, isGuestAccount, status, createdAt, role } = authState;
    const user = useMemo(
        () =>
            accessToken
                ? {
                      userId: userId!,
                      email,
                      displayName,
                      lastName,
                      profilePictureUrl,
                      authProvider: authProvider!,
                      isGuestAccount: isGuestAccount!,
                      status: status!,
                      createdAt: createdAt!,
                      role: role!,
                  }
                : null,
        [accessToken, userId, email, displayName, lastName, profilePictureUrl, authProvider, isGuestAccount, status, createdAt, role]
    );
    const isAuthenticated = Boolean(accessToken);

    const value: AuthContextValue = useMemo(
        () => ({ user, isAuthenticated, isBootstrapping, register, login, oauth, logout, updateProfile }),
        [user, isAuthenticated, isBootstrapping, register, login, oauth, logout, updateProfile]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
