import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import type { AuthSessionDto } from '@/lib/api/types';
import { clearSession } from '@/lib/auth/tokenStore';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';

const mocks = vi.hoisted(() => ({
    authClient: {
        session: vi.fn(),
        register: vi.fn(),
        login: vi.fn(),
        oauth: vi.fn(),
        logout: vi.fn(),
    },
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
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

const unavailable = () => new ApiError(503, null);

function renderAuth() {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
    );
    return renderHook(() => useAuth(), { wrapper });
}

// Lets the pending session probe settle without moving the clock past a retry.
async function flush() {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
    });
}

describe('AuthProvider when the session check is unavailable', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mocks.authClient.session.mockReset();
    });

    afterEach(() => {
        clearSession();
        vi.useRealTimers();
    });

    // A 503 means the refresh cookie exists but Spring couldn't answer, so the
    // user is still signed in. Ending the bootstrap signed out would send them
    // to the login screen.
    it('keeps bootstrapping and reports the session as unavailable on a 503', async () => {
        mocks.authClient.session.mockRejectedValue(unavailable());

        const { result } = renderAuth();
        await flush();

        expect(result.current.isBootstrapping).toBe(true);
        expect(result.current.isSessionUnavailable).toBe(true);
        expect(result.current.isAuthenticated).toBe(false);
    });

    it('retries and signs the user in once the server answers', async () => {
        mocks.authClient.session.mockRejectedValueOnce(unavailable()).mockResolvedValueOnce(session);

        const { result } = renderAuth();
        await flush();
        expect(result.current.isSessionUnavailable).toBe(true);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });

        expect(mocks.authClient.session).toHaveBeenCalledTimes(2);
        expect(result.current.isBootstrapping).toBe(false);
        expect(result.current.isSessionUnavailable).toBe(false);
        expect(result.current.isAuthenticated).toBe(true);
    });

    it('ends signed out when a retry finds no session', async () => {
        mocks.authClient.session.mockRejectedValueOnce(unavailable()).mockResolvedValueOnce(null);

        const { result } = renderAuth();
        await flush();
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });

        expect(result.current.isBootstrapping).toBe(false);
        expect(result.current.isSessionUnavailable).toBe(false);
        expect(result.current.isAuthenticated).toBe(false);
    });

    it('backs off between retries', async () => {
        mocks.authClient.session.mockRejectedValue(unavailable());

        renderAuth();
        await flush();
        expect(mocks.authClient.session).toHaveBeenCalledTimes(1);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });
        expect(mocks.authClient.session).toHaveBeenCalledTimes(2);

        // The second wait is longer than the first.
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });
        expect(mocks.authClient.session).toHaveBeenCalledTimes(2);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });
        expect(mocks.authClient.session).toHaveBeenCalledTimes(3);
    });

    it('still settles signed out on any other failure', async () => {
        mocks.authClient.session.mockRejectedValue(new ApiError(500, null));

        const { result } = renderAuth();
        await flush();

        expect(result.current.isBootstrapping).toBe(false);
        expect(result.current.isSessionUnavailable).toBe(false);
        expect(mocks.authClient.session).toHaveBeenCalledTimes(1);
    });
});
