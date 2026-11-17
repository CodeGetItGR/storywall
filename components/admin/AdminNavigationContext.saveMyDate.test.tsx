import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { AdminNavigationProvider, useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import messages from '@/messages/en.json';

function CurrentTab() {
    const { tab, tabs } = useAdminNavigation();
    return (
        <p>
            {tab}:{tabs.map((item) => item.key).join(',')}
        </p>
    );
}

afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
});

// KAN-201: Save my date's themes left the console for /admin/save-my-date.
describe('Save my date in the console', () => {
    it('has no themes section any more', () => {
        render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <AdminNavigationProvider>
                    <CurrentTab />
                </AdminNavigationProvider>
            </NextIntlClientProvider>,
        );

        expect(screen.getByText(/^metrics:/).textContent).not.toContain('invitationThemes');
    });

    it('lands marketing on its home from the old themes link', () => {
        window.history.replaceState(null, '', '/admin#save-my-date-themes');
        render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <AdminNavigationProvider role="MARKETING">
                    <CurrentTab />
                </AdminNavigationProvider>
            </NextIntlClientProvider>,
        );

        expect(screen.getByText(/^outreach:/)).toBeInTheDocument();
        expect(window.location.hash).not.toBe('#save-my-date-themes');
    });
});
