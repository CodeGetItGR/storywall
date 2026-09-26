'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { authClient } from '@/lib/api/authClient';
import { ApiError } from '@/lib/api/client';
import type {
    AccountStatus,
    AuthProvider as AuthProviderName,
    AuthSessionDto,
    PlatformRole,
    RegisterRequestDto,
    UserResponseDto,
} from '@/lib/api/types';
import { clearSession, getAuthState, getSessionGeneration, setSession, subscribeAuthState, updateSessionProfile } from '@/lib/auth/tokenStore';

const BOOTSTRAP_TIMEOUT_MS = 8000;
const RETRY_BASE_MS = 1000;
const RETRY_MAX_MS = 10_000;

// 1s, 2s, 4s, 8s, then every 10s: quick enough to catch a dev-server
// restart, slow enough not to hammer a Spring that's down for a deploy.
function retryDelayMs(attempt: number): number {
    return Math.min(RETRY_BASE_MS * 2 ** attempt, RETRY_MAX_MS);
}

export interface AuthUser {
    userId: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    profilePictureUrl: string | null;
    authProvider: AuthProviderName;
    isGuestAccount: boolean;
    status: AccountStatus;
    createdAt: string;
    role: PlatformRole;
    // null until /api/me has been fetched at least once this session — see
    // updateProfile below, the only thing that ever sets it.
    emailVerified: boolean | null;
}

export interface AuthContextValue {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isBootstrapping: boolean;
    // True while bootstrapping because the server couldn't be reached, not
    // because the answer is still on its way. The session is being retried.
    isSessionUnavailable: boolean;
    register: (input: RegisterRequestDto) => Promise<AuthSessionDto>;
    login: (input: { email: string; password: string; inviteToken?: string }) => Promise<AuthSessionDto>;
    oauth: (provider: 'GOOGLE' | 'APPLE', input: { idToken: string; inviteToken?: string }) => Promise<AuthSessionDto>;
    logout: () => Promise<void>;
    updateProfile: (profile: Pick<UserResponseDto, 'firstName' | 'lastName' | 'profilePictureUrl' | 'emailVerified'>) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();
    const router = useRouter();
    const [authState, setAuthState] = useState(getAuthState());
    const [isBootstrapping, setIsBootstrapping] = useState(true);
    const [isSessionUnavailable, setIsSessionUnavailable] = useState(false);

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
    //
    // The one exception is a 503: the BFF only answers that when it holds a
    // refresh cookie but Spring couldn't be reached (a restart, a deploy). The
    // user is still signed in, so ending the bootstrap signed out would bounce
    // them to the login screen. Instead the probe keeps bootstrapping, flags
    // `isSessionUnavailable` so AppShell can say why, and retries with backoff
    // until Spring gives a real answer.
    useEffect(() => {
        let cancelled = false;
        let controller = new AbortController();
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        let retryId: ReturnType<typeof setTimeout> | undefined;
        let attempt = 0;
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
            controller = new AbortController();
            timeoutId = setTimeout(() => controller.abort(), BOOTSTRAP_TIMEOUT_MS);
            try {
                const session = await authClient.session(controller.signal);
                applyIfCurrent(() => (session ? setSession(session) : clearSession()));
            } catch (error) {
                // authClient.session() only throws for a non-401 failure (503 from a
                // rate-limited/unreachable Spring, a network error, or the abort
                // above) — a real "no session" already resolved via the branch
                // above without throwing. Only a 401 means the session is gone, so
                // leave whatever's in the store untouched here rather than log the
                // user out from a transient failure.
                if (!cancelled && error instanceof ApiError && error.status === 503) {
                    clearTimeout(timeoutId);
                    setIsSessionUnavailable(true);
                    retryId = setTimeout(bootstrap, retryDelayMs(attempt++));
                    return;
                }
            }
            clearTimeout(timeoutId);
            // Unlike the session verdict, this always applies: the app must
            // leave its blank bootstrapping state even when the probe was
            // superseded, aborted, or failed.
            if (!cancelled) {
                setIsSessionUnavailable(false);
                setIsBootstrapping(false);
            }
        }

        bootstrap();
        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
            clearTimeout(retryId);
            controller.abort();
        };
    }, []);

    // Every cached query is scoped to whoever was signed in when it was
    // fetched, and so is every page the router keeps for back/forward and
    // repeat visits (next.config.mjs staleTimes): each one carries the server
    // prefetch it was rendered with, which would hydrate straight back into
    // the cleared query cache. Drop both whenever who is signed in changes.
    const resetSessionCaches = useCallback(() => {
        queryClient.clear();
        router.refresh();
    }, [queryClient, router]);

    const register = useCallback(
        async (input: RegisterRequestDto) => {
            const session = await authClient.register(input);
            // A prior session's queries (e.g. the un-scoped myEventsKeys.all) can
            // still be sitting in cache if the previous account never went through
            // an explicit logout (silent refresh-token expiry, account switch) —
            // clear before setSession so nothing ever renders their data.
            resetSessionCaches();
            setSession(session);
            return session;
        },
        [resetSessionCaches],
    );

    const login = useCallback(
        async (input: { email: string; password: string; inviteToken?: string }) => {
            const session = await authClient.login(input);
            resetSessionCaches();
            setSession(session);
            return session;
        },
        [resetSessionCaches],
    );

    const oauth = useCallback(
        async (provider: 'GOOGLE' | 'APPLE', input: { idToken: string; inviteToken?: string }) => {
            const session = await authClient.oauth(provider, input);
            resetSessionCaches();
            setSession(session);
            return session;
        },
        [resetSessionCaches],
    );

    const logout = useCallback(async () => {
        try {
            await authClient.logout();
        } catch {
            // Logout is best-effort server-side revocation; always clear
            // client state regardless of whether the request succeeded.
        }
        clearSession();
        // Without this, the next login (a different account, in the same SPA
        // session) would render straight from this cache until each query's
        // staleTime happened to elapse.
        resetSessionCaches();
    }, [resetSessionCaches]);

    const updateProfile = useCallback((profile: Pick<UserResponseDto, 'firstName' | 'lastName' | 'profilePictureUrl' | 'emailVerified'>) => {
        updateSessionProfile({
            firstName: profile.firstName ?? '',
            lastName: profile.lastName,
            profilePictureUrl: profile.profilePictureUrl,
            emailVerified: profile.emailVerified,
        });
    }, []);

    // Memoized on the individual fields rather than on `authState`, so a write
    // that swaps the state object without changing who is signed in (a token
    // refresh) doesn't hand every consumer a new identity — while a write that
    // does change them propagates, which keying the memo on `isAuthenticated`
    // alone did not: a role or display name arriving later left consumers
    // holding the previous user.
    const {
        accessToken,
        userId,
        email,
        firstName,
        lastName,
        profilePictureUrl,
        authProvider,
        isGuestAccount,
        status,
        createdAt,
        role,
        emailVerified,
    } = authState;
    const user = useMemo(
        () =>
            accessToken
                ? {
                      userId: userId!,
                      email,
                      firstName,
                      lastName,
                      profilePictureUrl,
                      authProvider: authProvider!,
                      isGuestAccount: isGuestAccount!,
                      status: status!,
                      createdAt: createdAt!,
                      role: role!,
                      emailVerified,
                  }
                : null,
        [accessToken, userId, email, firstName, lastName, profilePictureUrl, authProvider, isGuestAccount, status, createdAt, role, emailVerified],
    );
    const isAuthenticated = Boolean(accessToken);

    const value: AuthContextValue = useMemo(
        () => ({ user, isAuthenticated, isBootstrapping, isSessionUnavailable, register, login, oauth, logout, updateProfile }),
        [user, isAuthenticated, isBootstrapping, isSessionUnavailable, register, login, oauth, logout, updateProfile],
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
