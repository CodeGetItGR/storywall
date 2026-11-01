import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BusinessInsightsSection } from '@/components/business/BusinessInsightsSection';
import type { BusinessOverviewDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

vi.mock('@/components/business/BusinessTrendChart', () => ({ BusinessTrendChart: () => <div data-testid="trend" /> }));

const VENDOR: BusinessOverviewDto = { partner: false, showPartnerPrompt: true, vendorType: 'MUSIC', totals: { events: 3, guests: 120, listTaps: 4 } };
const PARTNER: BusinessOverviewDto = {
    partner: true,
    showPartnerPrompt: false,
    vendorType: 'PHOTOGRAPHER',
    totals: { events: 3, guests: 120, listTaps: 4, proViews: 900, postViewers: 60, cardTaps: 12 },
    trend: [{ month: '2026-11', views: 20 }],
};

function renderSection(overview: BusinessOverviewDto, showPartnerPrompt = overview.showPartnerPrompt) {
    const onBecomePartner = vi.fn();
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
            <BusinessInsightsSection overview={overview} showPartnerPrompt={showPartnerPrompt} onBecomePartnerAction={onBecomePartner} />
        </NextIntlClientProvider>,
    );
    return onBecomePartner;
}

describe('BusinessInsightsSection', () => {
    afterEach(cleanup);

    it('shows a vendor three counts and the partner prompt', () => {
        const onBecomePartner = renderSection(VENDOR);
        expect(screen.getByText('Events')).toBeInTheDocument();
        expect(screen.getByText('Guests')).toBeInTheDocument();
        expect(screen.getByText('Profile taps')).toBeInTheDocument();
        expect(screen.queryByText('Photo and video views')).not.toBeInTheDocument();
        expect(screen.queryByTestId('trend')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Become a partner' }));
        expect(onBecomePartner).toHaveBeenCalledTimes(1);
    });

    it('leaves the prompt out when the server says not to show it', () => {
        renderSection({ ...VENDOR, showPartnerPrompt: false });
        expect(screen.queryByRole('button', { name: 'Become a partner' })).not.toBeInTheDocument();
    });

    it('shows a partner every count and the chart', () => {
        renderSection(PARTNER);
        expect(screen.getByText('Photo and video views')).toBeInTheDocument();
        expect(screen.getByText('Post viewers')).toBeInTheDocument();
        expect(screen.getByText('Feed card taps')).toBeInTheDocument();
        expect(screen.getByText('900')).toBeInTheDocument();
        expect(screen.getByTestId('trend')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Become a partner' })).not.toBeInTheDocument();
    });

    it('shows an empty state instead of zeros and a flat chart', () => {
        renderSection({
            ...PARTNER,
            totals: { events: 0, guests: 0, listTaps: 0, proViews: 0, postViewers: 0, cardTaps: 0 },
            trend: [
                { month: '2026-10', views: 0 },
                { month: '2026-11', views: 0 },
            ],
        });
        expect(screen.getByText('No numbers yet')).toBeInTheDocument();
        expect(screen.getByText('Your numbers show up here once guests see you at an event.')).toBeInTheDocument();
        expect(screen.queryByText('Events')).not.toBeInTheDocument();
        expect(screen.queryByTestId('trend')).not.toBeInTheDocument();
    });

    it('keeps the prompt next to the empty state', () => {
        renderSection({ ...VENDOR, totals: { events: 0, guests: 0, listTaps: 0 } });
        expect(screen.getByText('No numbers yet')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Become a partner' })).toBeInTheDocument();
    });
});
