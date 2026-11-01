import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { AdminNavigationProvider, useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import messages from '@/messages/en.json';

function CurrentTab() {
    const { tab, tabs } = useAdminNavigation();
    return (
        <p>
            {tab}|{tabs.map((item) => item.key).join(',')}
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

describe('Admin navigation for marketing', () => {
    it('lists only the marketing group and phones', () => {
        renderAs('#outreach', 'MARKETING');
        expect(
            screen.getByText('outreach|outreach,outreachRequests,discountCodes,guestOffer,appReviews,campaignOverview,campaigns,phones'),
        ).toBeInTheDocument();
    });

    it('sends a hidden section to partner outreach', () => {
        renderAs('#withdrawals', 'MARKETING');
        expect(screen.getByText(/^outreach\|/)).toBeInTheDocument();
        expect(window.location.hash).toBe('#outreach');
    });

    it('opens outreach with no hash', () => {
        renderAs('', 'MARKETING');
        expect(window.location.hash).toBe('#outreach');
    });

    it('keeps a prospect link', () => {
        renderAs('#outreach/p-1', 'MARKETING');
        expect(window.location.hash).toBe('#outreach/p-1');
    });

    it('still opens metrics for admins', () => {
        renderAs('', 'ADMIN');
        expect(screen.getByText(/^metrics\|/)).toBeInTheDocument();
        expect(window.location.hash).toBe('#metrics');
    });
});
