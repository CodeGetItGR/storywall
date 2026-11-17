import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdminNavigationProvider } from '@/components/admin/AdminNavigationContext';
import { AdminShellNav } from '@/components/admin/AdminShellNav';
import type { PlatformRole } from '@/lib/api/types';
import messages from '@/messages/en.json';

vi.mock('@/components/LanguageSwitcher', () => ({ LanguageSwitcher: () => null }));
vi.mock('@/hooks/useAdminPartnerApplications', () => ({ usePendingApplicationsCount: () => 0 }));
vi.mock('@/hooks/useAdminOutreachRequests', () => ({ usePendingOutreachRequestsCount: () => 0 }));
vi.mock('@/hooks/useAdminVendorMessages', () => ({ useNewVendorMessagesCount: () => 0 }));

function renderNav(role: PlatformRole) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <AdminNavigationProvider role={role}>
                <AdminShellNav mobile email="admin@example.com" userId="usr-1" onLogoutAction={vi.fn()} />
            </AdminNavigationProvider>
        </NextIntlClientProvider>,
    );
}

afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
});

// KAN-201: one link to the Save my date admin replaces the console's themes section.
describe('AdminShellNav Save my date link', () => {
    it('links admins to the Save my date page from the Catalog group', () => {
        const { container } = renderNav('ADMIN');
        const link = screen.getByRole('link', { name: 'Save my date' });
        expect(link).toHaveAttribute('href', '/admin/save-my-date');
        expect(link.closest('nav')).toHaveTextContent(messages.AdminPage.layout.groupCatalog);
        expect(container.querySelector('[data-tab="invitationThemes"]')).toBeNull();
    });

    it('has no link for marketing', () => {
        renderNav('MARKETING');
        expect(screen.queryByRole('link', { name: 'Save my date' })).toBeNull();
    });
});
