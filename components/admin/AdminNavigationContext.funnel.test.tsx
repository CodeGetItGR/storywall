import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdminNavigationProvider, useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import { AdminPageState } from '@/components/admin/AdminPageState';
import messages from '@/messages/en.json';

vi.mock('@/components/admin/AdminConsole', () => ({ AdminConsole: () => <p>console</p> }));

function CurrentTab() {
    const { tab, tabs } = useAdminNavigation();
    return (
        <p>
            {tab}:{tabs.find((item) => item.key === tab)?.label}
        </p>
    );
}

afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
});

describe('Growth tab', () => {
    it('opens from #funnel', () => {
        window.history.replaceState(null, '', '/admin#funnel');
        render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <AdminNavigationProvider>
                    <CurrentTab />
                </AdminNavigationProvider>
            </NextIntlClientProvider>,
        );

        expect(screen.getByText('funnel:Growth')).toBeInTheDocument();
    });

    it('is not shown to non-admins', () => {
        render(<AdminPageState isAdmin={false} isBootstrapping={false} loadingMessage="Loading" accessDeniedTitle="Access denied" accessDeniedBody="Admins only" />);

        expect(screen.getByText('Access denied')).toBeInTheDocument();
        expect(screen.queryByText('console')).not.toBeInTheDocument();
    });
});
