import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppShell } from '@/components/layout/AppShell';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace: vi.fn() }),
    usePathname: () => '/notifications',
    useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1', role: 'USER' }, isBootstrapping: false }) }));
vi.mock('@/hooks/useAdminDemoEventAccess', () => ({ useAdminDemoEventAccess: () => ({ isChecking: false, isAdminAllowed: false }) }));
vi.mock('@/components/account/AccountPanelShell', () => ({ AccountPanelShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/providers/AccountPanelProvider', () => ({ AccountPanelProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/layout', () => ({ AuthLoadingState: () => null, DesktopNavRail: () => null, MobileTabBar: () => null }));

afterEach(cleanup);

describe('AppShell content wrapper', () => {
    it('is a full-height grid whose children fill the width (auto-margin items would otherwise shrink-to-fit)', () => {
        render(
            <NextIntlClientProvider locale="en" messages={{}}>
                <AppShell>
                    <p>page</p>
                </AppShell>
            </NextIntlClientProvider>,
        );
        const wrapper = screen.getByText('page').parentElement!;
        expect(wrapper).toHaveClass('grid', 'min-h-full', '*:w-full');
    });
});
