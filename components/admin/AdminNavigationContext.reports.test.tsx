import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { AdminNavigationProvider, useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import messages from '@/messages/en.json';

function CurrentTab() {
    const { tab, tabs, activeHash } = useAdminNavigation();
    const keys = tabs.map((item) => item.key);
    return (
        <p>
            {tab}:{tabs.find((item) => item.key === tab)?.label}:{activeHash}:{keys.indexOf('reports') + 1 === keys.indexOf('bugReports') ? 'beforeBugReports' : 'elsewhere'}
        </p>
    );
}

afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
});

describe('Reports tab', () => {
    it('opens from #reports and sits right before Bug reports', () => {
        window.history.replaceState(null, '', '/admin#reports');
        render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <AdminNavigationProvider>
                    <CurrentTab />
                </AdminNavigationProvider>
            </NextIntlClientProvider>,
        );

        expect(screen.getByText('reports:Reports:#reports:beforeBugReports')).toBeInTheDocument();
    });
});
