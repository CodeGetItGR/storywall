import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DesktopNavRail } from '@/components/layout/DesktopNavRail';
import { CreateWizardFlagProvider } from '@/providers/CreateWizardFlagProvider';

const auth = vi.hoisted(() => ({ user: { firstName: 'Ann', role: 'USER' } as { firstName: string; role: string } }));

vi.mock('next/navigation', () => ({ usePathname: () => '/home' }));
vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (key: string) => `${ns}.${key}` }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('@/hooks/useDesktopAccountSidebar', () => ({
    useDesktopAccountSidebar: () => ({ expanded: false, handleMouseEnter: vi.fn(), handleMouseLeave: vi.fn(), togglePinned: vi.fn() }),
}));
vi.mock('@/hooks/useIsDemoRoute', () => ({ useIsDemoRoute: () => false }));
vi.mock('@/hooks/useMe', () => ({ useMe: () => ({ data: undefined }) }));
vi.mock('@/hooks/useNotifications', () => ({ useUnreadNotificationCount: () => ({ data: 0 }) }));
vi.mock('@/providers/EventProvider', () => ({ useActiveEvent: () => null }));
vi.mock('@/components/account/AccountLogoutButton', () => ({ AccountLogoutButton: () => null }));
vi.mock('@/components/account/AccountSidebarLogo', () => ({ AccountSidebarLogo: () => null }));
vi.mock('@/components/LanguageSwitcher', () => ({ LanguageSwitcher: () => null }));
vi.mock('@/components/ui/avatar', () => ({ default: () => null }));
vi.mock('@/components/ui/AppLink', () => ({
    AppLink: ({ children, ...props }: { children: ReactNode; href: string }) => <a {...props}>{children}</a>,
}));

afterEach(() => {
    cleanup();
    auth.user = { firstName: 'Ann', role: 'USER' };
});

const CREATE = 'CreateEventPage.title';

describe('DesktopNavRail create button', () => {
    it('is absent with the wizard off', () => {
        render(<DesktopNavRail />);
        expect(screen.queryByRole('link', { name: CREATE })).toBeNull();
    });

    it('links to /events/new with the wizard on', () => {
        render(
            <CreateWizardFlagProvider enabled createLabel="Create an event">
                <DesktopNavRail />
            </CreateWizardFlagProvider>,
        );
        expect(screen.getByRole('link', { name: CREATE })).toHaveAttribute('href', '/events/new');
    });

    it('is absent for an admin', () => {
        auth.user = { firstName: 'Ann', role: 'ADMIN' };
        render(
            <CreateWizardFlagProvider enabled createLabel="Create an event">
                <DesktopNavRail />
            </CreateWizardFlagProvider>,
        );
        expect(screen.queryByRole('link', { name: CREATE })).toBeNull();
    });
});
