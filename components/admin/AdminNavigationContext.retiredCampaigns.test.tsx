import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { AdminNavigationProvider, useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import type { PlatformRole } from '@/lib/api/types';
import messages from '@/messages/en.json';

function CurrentTab() {
    const { tab, tabs } = useAdminNavigation();
    return (
        <p>
            {tab}:{tabs.map((item) => item.key).join(',')}
        </p>
    );
}

function renderAt(hash: string, role: PlatformRole = 'ADMIN') {
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

describe('the old campaign pages', () => {
    it.each(['#campaign-overview', '#discount-campaigns', '#discount-campaigns/7f1c'])('open Campaigns from %s', (hash) => {
        renderAt(hash);

        expect(screen.getByText(/^campaigns:/)).toBeInTheDocument();
        expect(window.location.hash).toBe('#campaigns');
    });

    it('open Campaigns for marketing too', () => {
        renderAt('#campaign-overview', 'MARKETING');

        expect(screen.getByText(/^campaigns:/)).toBeInTheDocument();
        expect(window.location.hash).toBe('#campaigns');
    });

    it('are gone from the sidebar', () => {
        renderAt('#campaigns');

        const keys = screen.getByText(/^campaigns:/).textContent ?? '';
        expect(keys).not.toContain('campaignOverview');
        expect(keys).not.toContain('discountCampaigns');
    });
});
