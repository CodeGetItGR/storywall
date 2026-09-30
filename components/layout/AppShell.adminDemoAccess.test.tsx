import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppShell } from '@/components/layout/AppShell';

const mocks = vi.hoisted(() => ({
    replace: vi.fn(),
    pathname: '/events/evt-demo/feed',
    get: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace: mocks.replace }),
    usePathname: () => mocks.pathname,
    useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/hooks/useAuth', () => ({
    useAuth: () => ({ user: { userId: 'admin-1', role: 'ADMIN' }, isBootstrapping: false, isSessionUnavailable: false }),
}));
vi.mock('@/lib/api/client', () => ({ api: { get: mocks.get } }));
// The shell's chrome is not what this test is about.
vi.mock('@/components/layout', () => ({
    AuthLoadingState: () => <p>loading</p>,
    DesktopNavRail: () => null,
    MobileTabBar: () => null,
}));
vi.mock('@/providers/AccountPanelProvider', () => ({ AccountPanelProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/components/account/AccountPanelShell', () => ({ AccountPanelShell: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/components/legal/GuidelinesAcceptanceGate', () => ({
    GuidelinesAcceptanceGate: ({ children }: { children: React.ReactNode }) => children,
}));

function renderShell() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <NextIntlClientProvider locale="en" messages={{}}>
                <AppShell>
                    <p>page</p>
                </AppShell>
            </NextIntlClientProvider>
        </QueryClientProvider>,
    );
}

describe('AppShell for an admin', () => {
    afterEach(() => {
        cleanup();
        mocks.replace.mockReset();
        mocks.get.mockReset();
    });

    it('opens the pages of a current demo event', async () => {
        mocks.pathname = '/events/evt-demo/feed';
        mocks.get.mockResolvedValue([{ eventTypeKey: 'WEDDING', eventId: 'evt-demo' }]);

        renderShell();

        expect(await screen.findByText('page')).toBeInTheDocument();
        expect(mocks.replace).not.toHaveBeenCalled();
    });

    it('sends the admin back to /admin for any other event', async () => {
        mocks.pathname = '/events/evt-real/feed';
        mocks.get.mockResolvedValue([{ eventTypeKey: 'WEDDING', eventId: 'evt-demo' }]);

        renderShell();

        await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/admin'));
        expect(screen.queryByText('page')).not.toBeInTheDocument();
    });

    it('sends the admin back to /admin outside event pages without asking for demos', async () => {
        mocks.pathname = '/home';

        renderShell();

        await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/admin'));
        expect(mocks.get).not.toHaveBeenCalled();
    });
});
