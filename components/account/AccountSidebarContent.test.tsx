import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AccountSidebarContent } from '@/components/account/AccountSidebarContent';

vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (key: string) => `${ns}.${key}` }));
vi.mock('next/navigation', () => ({ usePathname: () => '/events' }));
vi.mock('@/components/account/AccountInstallAppButton', () => ({ AccountInstallAppButton: () => null }));
vi.mock('@/components/account/AccountLogoutButton', () => ({ AccountLogoutButton: () => null }));
vi.mock('@/components/account/AccountSidebarLogo', () => ({ AccountSidebarLogo: () => null }));
vi.mock('@/components/LanguageSwitcher', () => ({ LanguageSwitcher: () => null }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { firstName: 'Ana', email: 'ana@example.com', profilePictureUrl: null } }) }));
vi.mock('@/hooks/useIsDemoRoute', () => ({ useIsDemoRoute: () => false }));
vi.mock('@/hooks/useNotifications', () => ({ useUnreadNotificationCount: () => ({ data: 0 }) }));
const me = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock('@/hooks/useMe', () => ({ useMe: () => ({ data: me.data }) }));

afterEach(cleanup);

describe('AccountSidebarContent', () => {
    it.each([{ vendor: true }, { partner: true }])('shows My business for %o', (flags) => {
        me.data = flags;
        render(<AccountSidebarContent onCloseAction={vi.fn()} />);
        expect(screen.getByRole('link', { name: 'AccountDrawer.business' }).getAttribute('href')).toBe('/business');
    });

    it.each([{ vendor: false, partner: false }, undefined])('hides My business for %o', (data) => {
        me.data = data;
        render(<AccountSidebarContent onCloseAction={vi.fn()} />);
        expect(screen.queryByRole('link', { name: 'AccountDrawer.business' })).toBeNull();
        expect(screen.getByRole('link', { name: 'AccountDrawer.profile' })).toBeTruthy();
    });
});
