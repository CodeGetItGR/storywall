import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthSessionDto } from '@/lib/api/types';
import { clearSession } from '@/lib/auth/tokenStore';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';

const mocks = vi.hoisted(() => ({
    refresh: vi.fn(),
    authClient: {
        session: vi.fn(),
        register: vi.fn(),
        login: vi.fn(),
        oauth: vi.fn(),
        logout: vi.fn(),
    },
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock('@/lib/api/authClient', () => ({ authClient: mocks.authClient }));

const session: AuthSessionDto = {
    accessToken: 'token-1',
    userId: 'user-1',
    email: 'host@example.test',
    role: 'USER',
    firstName: 'Host',
    lastName: null,
    profilePictureUrl: null,
    authProvider: 'LOCAL',
    isGuestAccount: false,
    status: 'ACTIVE',
    createdAt: '2026-09-01T00:00:00Z',
};

async function renderAuth() {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
    );
    const hook = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(hook.result.current.isBootstrapping).toBe(false));
    return hook;
}

describe('AuthProvider', () => {
    beforeEach(() => {
        mocks.refresh.mockReset();
        mocks.authClient.session.mockReset().mockResolvedValue(session);
        mocks.authClient.register.mockReset().mockResolvedValue(session);
        mocks.authClient.login.mockReset().mockResolvedValue(session);
        mocks.authClient.oauth.mockReset().mockResolvedValue(session);
        mocks.authClient.logout.mockReset().mockResolvedValue(undefined);
    });

    afterEach(() => clearSession());

    it("keeps the router's cached pages when the session is restored on load", async () => {
        await renderAuth();

        expect(mocks.refresh).not.toHaveBeenCalled();
    });

    it("drops the router's cached pages on login", async () => {
        const { result } = await renderAuth();

        await act(() => result.current.login({ email: 'host@example.test', password: 'test-password' }));

        expect(mocks.refresh).toHaveBeenCalledOnce();
    });

    it("drops the router's cached pages on register", async () => {
        const { result } = await renderAuth();

        await act(() => result.current.register({ email: 'host@example.test', password: 'test-password', firstName: 'Host', lastName: 'Test' }));

        expect(mocks.refresh).toHaveBeenCalledOnce();
    });

    it("drops the router's cached pages on a Google or Apple sign-in", async () => {
        const { result } = await renderAuth();

        await act(() => result.current.oauth('GOOGLE', { idToken: 'id-token-1' }));

        expect(mocks.refresh).toHaveBeenCalledOnce();
    });

    it("drops the router's cached pages on logout", async () => {
        const { result } = await renderAuth();

        await act(() => result.current.logout());

        expect(mocks.refresh).toHaveBeenCalledOnce();
    });
});
