import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '@/hooks/useAuth';
import { meQueryKey, useMe } from '@/hooks/useMe';
import { api } from '@/lib/api/client';
import type { UserResponseDto } from '@/lib/api/types';
import { sessionFromProfile, type SessionHandoff } from '@/lib/auth/sessionHandoff';
import { clearSession } from '@/lib/auth/tokenStore';
import { AuthProvider } from '@/providers/AuthProvider';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/hooks/useAppConfig', () => ({ usePresignedUrlRefreshMs: () => 5 * 60_000 }));

const profile = {
    id: 'user-1',
    email: 'host@example.test',
    emailVerified: true,
    firstName: 'Host',
    lastName: null,
    profilePictureUrl: null,
    authProvider: 'LOCAL',
    isGuestAccount: false,
    status: 'ACTIVE',
    platformRole: 'USER',
    createdAt: '2026-09-01T00:00:00Z',
} as UserResponseDto;

describe('useMe with the profile the server handed over', () => {
    afterEach(() => {
        clearSession();
        vi.restoreAllMocks();
    });

    it("sets the user's email verification once the session is adopted, without fetching /api/me", async () => {
        const get = vi.spyOn(api, 'get');
        const queryClient = new QueryClient();
        queryClient.setQueryData(meQueryKey, profile);
        const handoff: SessionHandoff = { session: sessionFromProfile('token-1', profile), expiresInMs: 10 * 60_000, profile };
        const wrapper = ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={queryClient}>
                <AuthProvider handoff={handoff}>{children}</AuthProvider>
            </QueryClientProvider>
        );

        const { result } = renderHook(
            () => {
                useMe();
                return useAuth();
            },
            { wrapper },
        );

        await waitFor(() => expect(result.current.user?.emailVerified).toBe(true));
        expect(get).not.toHaveBeenCalled();
    });
});
