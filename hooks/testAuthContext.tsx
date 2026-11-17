import type { ReactNode } from 'react';
import { vi } from 'vitest';

import { AuthContext, type AuthContextValue, type AuthUser } from '@/providers/AuthProvider';

// The session a test renders with: signed in as a verified host by default, or signed out.
export const TEST_USER = {
    userId: 'user-1',
    email: 'host@example.test',
    firstName: 'Maria',
    lastName: 'Papadopoulou',
    role: 'USER',
    emailVerified: true,
} as unknown as AuthUser;

export function testAuth({
    user = TEST_USER,
    isBootstrapping = false,
}: { user?: AuthUser | null; isBootstrapping?: boolean } = {}): AuthContextValue {
    return {
        user,
        isAuthenticated: Boolean(user),
        isBootstrapping,
        isSessionUnavailable: false,
        isRefreshingSession: false,
        register: vi.fn(),
        login: vi.fn(),
        oauth: vi.fn(),
        logout: vi.fn(),
        updateProfile: vi.fn(),
    };
}

export function WithAuth({ value = testAuth(), children }: { value?: AuthContextValue; children: ReactNode }) {
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
