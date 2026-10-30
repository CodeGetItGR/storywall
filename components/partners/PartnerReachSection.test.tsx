import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { PartnerReachSection } from '@/components/partners/PartnerReachSection';
import type { PartnerPortalReachDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const REACH: PartnerPortalReachDto = {
    events: 2,
    guests: 240,
    proViews: 812,
    postViewers: 150,
    listTaps: 19,
    recent: [{ startAt: '2026-10-10T16:00:00Z', vendorType: 'PHOTOGRAPHER', guests: 120, views: 400 }],
};

function renderSection(reach: PartnerPortalReachDto) {
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
            <PartnerReachSection reach={reach} />
        </NextIntlClientProvider>,
    );
}

describe('PartnerReachSection', () => {
    afterEach(cleanup);

    it('shows the totals and the recent events without titles', () => {
        renderSection(REACH);
        expect(screen.getByText('812')).toBeInTheDocument();
        expect(screen.getByText('Recent events')).toBeInTheDocument();
        expect(screen.getByText('400 views')).toBeInTheDocument();
        expect(screen.getByText('120 guests')).toBeInTheDocument();
        expect(screen.getByText('2 events')).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(1);
    });

    it('says when they were never a vendor', () => {
        renderSection({ events: 0, guests: 0, proViews: 0, postViewers: 0, listTaps: 0, recent: [] });
        expect(screen.getByText('No events as a vendor yet.')).toBeInTheDocument();
        expect(screen.queryByRole('list')).toBeNull();
    });
});
