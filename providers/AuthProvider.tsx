'use client';

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { authClient } from '@/lib/api/authClient';
import type { AuthSessionDto, PlatformRole } from '@/lib/api/types';
import { clearSession, getAuthState, setSession, subscribeAuthState } from '@/lib/auth/tokenStore';

interface AuthUser {
    userId: string;
    email: string | null;
    displayName: string;
    role: PlatformRole;
}

interface AuthContextValue {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isBootstrapping: boolean;
    register: (input: { email: string; password: string; displayName: string }) => Promise<AuthSessionDto>;
    login: (input: { email: string; password: string }) => Promise<AuthSessionDto>;
    guestLogin: (input: { inviteToken: string; displayName: string }) => Promise<AuthSessionDto>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [authState, setAuthState] = useState(getAuthState());
    const [isBootstrapping, setIsBootstrapping] = useState(true);

    useEffect(() => subscribeAuthState(setAuthState), []);

    // The access token is memory-only and doesn't survive a reload. On first
    // mount, ask the BFF to re-derive one from whatever httpOnly cookie it
    // holds (refresh token or guest identity) — see app/api/auth/session/route.ts.
    useEffect(() => {
        let cancelled = false;

        async function bootstrap() {
            try {
                const session = await authClient.session();
                if (!cancelled) {
                    if (session) setSession(session);
                    else clearSession();
                }
            } catch {
                if (!cancelled) clearSession();
            } finally {
                if (!cancelled) setIsBootstrapping(false);
            }
        }

        bootstrap();
        return () => {
            cancelled = true;
        };
    }, []);

    const register = useCallback(async (input: { email: string; password: string; displayName: string }) => {
        const session = await authClient.register(input);
        setSession(session);
        return session;
    }, []);

    const login = useCallback(async (input: { email: string; password: string }) => {
        const session = await authClient.login(input);
        setSession(session);
        return session;
    }, []);

    const guestLogin = useCallback(async (input: { inviteToken: string; displayName: string }) => {
        const session = await authClient.guestLogin(input);
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

    const user = authState.accessToken
        ? { userId: authState.userId!, email: authState.email, displayName: authState.displayName!, role: authState.role! }
        : null;
    const isAuthenticated = Boolean(authState.accessToken);

    const value: AuthContextValue = useMemo(
        () => ({ user, isAuthenticated, isBootstrapping, register, login, guestLogin, logout }),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- `user` is derived fresh from authState each render; comparing its fields keeps this memo from invalidating on every authState change that doesn't actually affect them.
        [
            authState.accessToken,
            authState.userId,
            authState.email,
            authState.displayName,
            authState.role,
            isBootstrapping,
            register,
            login,
            guestLogin,
            logout,
        ]
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
