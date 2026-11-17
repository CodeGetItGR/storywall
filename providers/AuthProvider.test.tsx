import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode, Suspense, use, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthSessionDto, UserResponseDto } from '@/lib/api/types';
import type { SessionHandoff } from '@/lib/auth/sessionHandoff';
import { clearSession, getAccessToken } from '@/lib/auth/tokenStore';
import { CREATE_WIZARD_DRAFT_KEY } from '@/lib/createEventWizardDraft';
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

function renderAuthHook(handoff?: SessionHandoff) {
    const queryClient = new QueryClient();
    // Read on every render, so a test can change it between renders.
    const props = { handoff };
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            <AuthProvider handoff={props.handoff}>{children}</AuthProvider>
        </QueryClientProvider>
    );
    // Every render's bootstrapping flag, first render included.
    const bootstrapping: boolean[] = [];
    const hook = renderHook(
        () => {
            const auth = useAuth();
            bootstrapping.push(auth.isBootstrapping);
            return auth;
        },
        { wrapper },
    );
    return { ...hook, bootstrapping, props };
}

async function renderAuth(handoff?: SessionHandoff) {
    const hook = renderAuthHook(handoff);
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

        await act(() =>
            result.current.register({
                email: 'host@example.test',
                password: 'test-password',
                firstName: 'Host',
                lastName: 'Test',
                acceptedGuidelinesVersion: '2026-09-30',
                acceptedTermsVersion: '2026-10-04',
                adultConfirmed: true,
            }),
        );

        expect(mocks.refresh).toHaveBeenCalledOnce();
    });

    it("drops the router's cached pages on a Google or Apple sign-in", async () => {
        const { result } = await renderAuth();

        await act(() => result.current.oauth('GOOGLE', { idToken: 'id-token-1' }));

        expect(mocks.refresh).toHaveBeenCalledOnce();
    });

    it('reports the refresh after a sign-in as pending until the router has re-rendered', async () => {
        // Like Next's router: refresh() puts a pending page into router state, and the transition
        // it runs in stays pending until that page arrives.
        let suspendRouter: (page: Promise<void>) => void = () => {};
        function RouterState() {
            const [page, setPage] = useState<Promise<void> | null>(null);
            suspendRouter = setPage;
            if (page) use(page);
            return null;
        }
        let arrive: () => void = () => {};
        mocks.refresh.mockImplementation(() => suspendRouter(new Promise<void>((resolve) => (arrive = resolve))));
        const wrapper = ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={new QueryClient()}>
                <AuthProvider>
                    <Suspense fallback={null}>
                        <RouterState />
                    </Suspense>
                    {children}
                </AuthProvider>
            </QueryClientProvider>
        );
        const { result } = renderHook(() => useAuth(), { wrapper });
        await waitFor(() => expect(result.current.isBootstrapping).toBe(false));
        expect(result.current.isRefreshingSession).toBe(false);

        await act(() => result.current.login({ email: 'host@example.test', password: 'test-password' }));
        expect(result.current.isRefreshingSession).toBe(true);

        await act(async () => arrive());
        expect(result.current.isRefreshingSession).toBe(false);
    });

    it("drops the router's cached pages on logout", async () => {
        const { result } = await renderAuth();

        await act(() => result.current.logout());

        expect(mocks.refresh).toHaveBeenCalledOnce();
    });

    it("forgets the create wizard's answers on logout", async () => {
        window.localStorage.setItem(CREATE_WIZARD_DRAFT_KEY, '{"version":1}');
        const { result } = await renderAuth();

        await act(() => result.current.logout());

        expect(window.localStorage.getItem(CREATE_WIZARD_DRAFT_KEY)).toBeNull();
    });

    describe('with the session the server handed over', () => {
        const handoff: SessionHandoff = {
            session: { ...session, accessToken: 'server-token' },
            expiresInMs: 10 * 60_000,
            profile: {} as UserResponseDto,
        };

        it('starts signed in without asking for a new token', async () => {
            const { result } = await renderAuth(handoff);

            expect(result.current.user?.userId).toBe('user-1');
            expect(getAccessToken()).toBe('server-token');
            expect(mocks.authClient.session).not.toHaveBeenCalled();
            expect(mocks.refresh).not.toHaveBeenCalled();
        });

        it('renders the first time as bootstrapping, like the server did', async () => {
            const { bootstrapping } = await renderAuth(handoff);

            expect(bootstrapping[0]).toBe(true);
        });

        it('ignores a handoff that arrives after the first render', async () => {
            const { result, rerender, props } = await renderAuth();

            props.handoff = handoff;
            rerender();

            expect(result.current.isBootstrapping).toBe(false);
            expect(getAccessToken()).toBe('token-1');
        });
    });
});
