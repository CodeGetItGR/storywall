import { cleanup, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SaveMyDateAdminShell } from '@/components/admin/saveMyDate/SaveMyDateAdminShell';
import messages from '@/messages/en.json';

const nav = vi.hoisted(() => ({ pathname: '/admin/save-my-date/themes', replace: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({
    usePathname: () => nav.pathname,
    useRouter: () => ({ replace: nav.replace, push: nav.push }),
}));
vi.mock('@/components/LanguageSwitcher', () => ({ LanguageSwitcher: () => null }));
const auth = vi.hoisted(() => ({
    user: null as null | { userId: string; email: string; role: string },
    isBootstrapping: false,
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ ...auth, logout: vi.fn() }) }));

function renderShell() {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <SaveMyDateAdminShell>
                <p>Themes content</p>
            </SaveMyDateAdminShell>
        </NextIntlClientProvider>,
    );
}

beforeEach(() => {
    nav.pathname = '/admin/save-my-date/themes';
    auth.isBootstrapping = false;
    auth.user = { userId: 'usr-admin', email: 'admin@example.com', role: 'ADMIN' };
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('SaveMyDateAdminShell', () => {
    it('gives admins the menu, with the way back to the console first', () => {
        renderShell();
        const menu = screen.getByRole('complementary');
        const links = within(menu).getAllByRole('link');
        expect(links[0]).toHaveTextContent('Back to admin');
        expect(links[0]).toHaveAttribute('href', '/admin');
        const themes = within(menu).getByRole('link', { name: 'Themes' });
        expect(themes).toHaveAttribute('href', '/admin/save-my-date/themes');
        expect(themes).toHaveAttribute('aria-current', 'page');
        expect(screen.getByText('Themes content')).toBeInTheDocument();
    });

    it('shows marketing the access message, not the page', () => {
        auth.user = { userId: 'usr-mkt', email: 'mkt@example.com', role: 'MARKETING' };
        renderShell();
        expect(screen.getByRole('heading', { name: messages.AdminPage.accessDenied.title })).toBeInTheDocument();
        expect(screen.queryByText('Themes content')).toBeNull();
        expect(screen.queryByRole('link', { name: 'Themes' })).toBeNull();
    });

    it('sends a signed-out visitor to sign in, back to the same page', () => {
        auth.user = null;
        window.history.replaceState(null, '', '/admin/save-my-date/themes');
        renderShell();
        expect(screen.queryByText('Themes content')).toBeNull();
        expect(nav.replace).toHaveBeenCalledWith(expect.stringContaining(encodeURIComponent('/admin/save-my-date/themes')));
        window.history.replaceState(null, '', '/');
    });
});
