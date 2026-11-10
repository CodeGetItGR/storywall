import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { AdminNavigationProvider, useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import messages from '@/messages/en.json';

function CurrentTab() {
    const { tab, tabs, activeHash } = useAdminNavigation();
    return (
        <p>
            {tab}:{tabs.find((item) => item.key === tab)?.label}:{activeHash}
        </p>
    );
}

afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
});

describe('Save my date themes tab', () => {
    it('opens from #save-my-date-themes', () => {
        window.history.replaceState(null, '', '/admin#save-my-date-themes');
        render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <AdminNavigationProvider>
                    <CurrentTab />
                </AdminNavigationProvider>
            </NextIntlClientProvider>,
        );

        expect(screen.getByText('invitationThemes:Themes:#save-my-date-themes')).toBeInTheDocument();
    });
});
