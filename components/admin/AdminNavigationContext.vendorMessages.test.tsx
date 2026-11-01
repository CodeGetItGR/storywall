import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { AdminNavigationProvider, useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import messages from '@/messages/en.json';

function CurrentTab() {
    const { tab, tabs, activeHash } = useAdminNavigation();
    return (
        <p>
            {tab}:{tabs.find((item) => item.key === tab)?.label}:{activeHash}|{tabs.map((item) => item.key).join(',')}
        </p>
    );
}

function renderAs(hash: string, role: 'ADMIN' | 'MARKETING') {
    window.history.replaceState(null, '', `/admin${hash}`);
    render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <AdminNavigationProvider role={role}>
                <CurrentTab />
            </AdminNavigationProvider>
        </NextIntlClientProvider>,
    );
}

afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
});

describe('Vendor messages tab', () => {
    it('opens Vendor messages from #vendor-messages for admins only', () => {
        renderAs('#vendor-messages', 'ADMIN');
        expect(screen.getByText(/^vendorMessages:Vendor messages:#vendor-messages\|/)).toBeInTheDocument();
        cleanup();

        renderAs('#vendor-messages', 'MARKETING');
        const text = screen.getByText(/\|/).textContent ?? '';
        expect(text.startsWith('outreach:')).toBe(true);
        expect(text.split('|')[1].split(',')).not.toContain('vendorMessages');
        expect(window.location.hash).toBe('#outreach');
    });
});
