'use client';

import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AuthResponseDto, PlatformRole } from '@/lib/api/types';
import {
    clearSession,
    getAuthState,
    getStoredInviteToken,
    getStoredRefreshToken,
    setSession,
    setStoredInviteToken,
    setStoredRefreshToken,
    subscribeAuthState,
} from '@/lib/auth/tokenStore';

interface AuthUser {
    userId: string;
    email: string | null;
    role: PlatformRole;
}

interface AuthContextValue {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isBootstrapping: boolean;
    register: (input: { email: string; password: string; displayName: string }) => Promise<AuthResponseDto>;
    login: (input: { email: string; password: string }) => Promise<AuthResponseDto>;
    guestLogin: (input: { inviteToken: string; displayName: string }) => Promise<AuthResponseDto>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function applyAuthResponse(auth: AuthResponseDto) {
    setSession(auth);
    // Guests never receive a refresh token — persisting `null` here would wipe
    // out a real refresh token belonging to a registered user, so only write
    // when one was actually issued.
    if (auth.refreshToken) setStoredRefreshToken(auth.refreshToken);
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [authState, setAuthState] = useState(getAuthState());
    const [isBootstrapping, setIsBootstrapping] = useState(true);

    useEffect(() => subscribeAuthState(setAuthState), []);

    // The access token is memory-only and doesn't survive a reload. On first
    // mount, silently re-derive one from whatever persisted credential we have.
    useEffect(() => {
        let cancelled = false;

        async function bootstrap() {
            const refreshToken = getStoredRefreshToken();
            const inviteToken = getStoredInviteToken();

            try {
                if (refreshToken) {
                    const auth = await api.post<AuthResponseDto>(endpoints.auth.refresh, {
                        refreshToken,
                    });
                    if (!cancelled) applyAuthResponse(auth);
                } else if (inviteToken) {
                    const auth = await api.post<AuthResponseDto>(endpoints.auth.guestLogin, {
                        inviteToken,
                    });
                    if (!cancelled) applyAuthResponse(auth);
                }
            } catch {
                clearSession();
            } finally {
                if (!cancelled) setIsBootstrapping(false);
            }
        }

        bootstrap();
        return () => {
            cancelled = true;
        };
    }, []);

    const value: AuthContextValue = {
        user: authState.accessToken ? { userId: authState.userId!, email: authState.email, role: authState.role! } : null,
        isAuthenticated: Boolean(authState.accessToken),
        isBootstrapping,
        register: async (input) => {
            const auth = await api.post<AuthResponseDto>(endpoints.auth.register, input);
            applyAuthResponse(auth);
            return auth;
        },
        login: async (input) => {
            const auth = await api.post<AuthResponseDto>(endpoints.auth.login, input);
            applyAuthResponse(auth);
            return auth;
        },
        guestLogin: async ({ inviteToken, displayName }) => {
            const auth = await api.post<AuthResponseDto>(endpoints.auth.guestLogin, {
                inviteToken,
                displayName,
            });
            applyAuthResponse(auth);
            setStoredInviteToken(inviteToken);
            return auth;
        },
        logout: async () => {
            const refreshToken = getStoredRefreshToken();
            if (refreshToken) {
                try {
                    await api.post(endpoints.auth.logout, { refreshToken });
                } catch {
                    // Logout is best-effort server-side revocation; always clear
                    // client state regardless of whether the request succeeded.
                }
            }
            clearSession();
        },
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
