import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useGuidelinesAcceptanceBlocking } from '@/hooks/useGuidelinesAcceptanceBlocking';
import type { UserResponseDto } from '@/lib/api/types';
import { sessionFromProfile } from '@/lib/auth/sessionHandoff';
import { clearSession } from '@/lib/auth/tokenStore';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { DemoRouteAuthScope } from '@/providers/demo/DemoRouteAuthScope';
import { EventProvider, useActiveEvent } from '@/providers/EventProvider';

const mocks = vi.hoisted(() => ({ pathname: '/demo/wedding/feed' }));

vi.mock('next/navigation', () => ({
    usePathname: () => mocks.pathname,
    useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));

const profile = {
    id: 'user-1',
    email: 'host@example.test',
    emailVerified: true,
    firstName: 'Real',
    lastName: 'Host',
    profilePictureUrl: null,
    authProvider: 'LOCAL',
    isGuestAccount: false,
    status: 'ACTIVE',
    platformRole: 'USER',
    createdAt: '2026-09-01T00:00:00Z',
    guidelinesAcceptanceRequired: false,
    currentGuidelinesVersion: null,
    termsAcceptanceRequired: false,
    currentTermsVersion: null,
} as unknown as UserResponseDto;

// A signed-in visitor's session, as the server hands it over on a full page load.
const handoff = { session: sessionFromProfile('token-1', profile), expiresInMs: 15 * 60 * 1000, profile };

function respond(url: string): Response {
    if (url.endsWith('/api/me/events')) return Response.json([{ id: 'member-1', eventId: 'event-1', role: 'HOST' }]);
    if (url.endsWith('/api/me')) return Response.json(profile);
    if (url.endsWith('/api/events/event-1')) return Response.json({ id: 'event-1', title: 'Real event' });
    return Response.json({});
}

// What the app shell around a page reads: the signed-in user, the active event, and the
// Guidelines gate (which reads /api/me).
function ShellProbe() {
    const { user } = useAuth();
    const activeEvent = useActiveEvent();
    useGuidelinesAcceptanceBlocking();
    return (
        <p>
            {user?.firstName ?? 'nobody'} / {activeEvent?.title ?? 'no event'}
        </p>
    );
}

function Shell({ children }: { children: ReactNode }) {
    return (
        <AuthProvider handoff={handoff}>
            <DemoRouteAuthScope>
                <EventProvider>{children}</EventProvider>
            </DemoRouteAuthScope>
        </AuthProvider>
    );
}

describe('DemoRouteAuthScope', () => {
    let fetchMock: ReturnType<typeof vi.fn>;
    let queryClient: QueryClient;

    beforeEach(() => {
        fetchMock = vi.fn(async (input: RequestInfo | URL) => respond(String(input)));
        vi.stubGlobal('fetch', fetchMock);
        queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    });

    afterEach(() => {
        cleanup();
        clearSession();
        vi.unstubAllGlobals();
        mocks.pathname = '/demo/wedding/feed';
    });

    function accountCalls(): string[] {
        return fetchMock.mock.calls.map(([input]) => String(input)).filter((url) => /\/api\/(me|events)\b/.test(url));
    }

    function renderShell() {
        return render(
            <QueryClientProvider client={queryClient}>
                <Shell>
                    <ShellProbe />
                </Shell>
            </QueryClientProvider>,
        );
    }

    it('asks the backend nothing about a signed-in account on a demo page', async () => {
        renderShell();
        // Let every query that would start, start.
        await act(() => new Promise((resolve) => setTimeout(resolve, 20)));

        expect(screen.getByText('nobody / no event')).toBeInTheDocument();
        expect(accountCalls()).toEqual([]);
    });

    it('covers /demo itself', async () => {
        mocks.pathname = '/demo';
        renderShell();
        await act(() => new Promise((resolve) => setTimeout(resolve, 20)));

        expect(accountCalls()).toEqual([]);
    });

    it('loads the account, its event and /api/me on every other page', async () => {
        mocks.pathname = '/home';
        renderShell();

        await waitFor(() => expect(screen.getByText('Real / Real event')).toBeInTheDocument());
        expect(accountCalls()).toEqual(expect.arrayContaining(['/api/me/events', '/api/events/event-1', '/api/me']));
    });

    // The session stays in the token store while the demo is open.
    it('is still signed in after leaving the demo', async () => {
        const { rerender } = renderShell();
        await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
        expect(accountCalls()).toEqual([]);

        mocks.pathname = '/home';
        rerender(
            <QueryClientProvider client={queryClient}>
                <Shell>
                    <ShellProbe />
                </Shell>
            </QueryClientProvider>,
        );

        await waitFor(() => expect(screen.getByText('Real / Real event')).toBeInTheDocument());
    });
});
