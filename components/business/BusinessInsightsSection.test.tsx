import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BusinessInsightsSection } from '@/components/business/BusinessInsightsSection';
import type { BusinessOverviewDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

vi.mock('@/components/business/BusinessTrendChart', () => ({ BusinessTrendChart: () => <div data-testid="trend" /> }));

function renderSection(partner: boolean) {
    const overview: BusinessOverviewDto = partner
        ? {
              partner: true,
              vendorType: 'PHOTOGRAPHER',
              totals: { events: 3, guests: 120, listTaps: 4, proViews: 900, postViewers: 60, cardTaps: 12 },
              trend: [{ month: '2026-11', views: 20 }],
          }
        : { partner: false, vendorType: 'MUSIC', totals: { events: 3, guests: 120, listTaps: 4 } };
    const onBecomePartner = vi.fn();
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
            <BusinessInsightsSection overview={overview} onBecomePartnerAction={onBecomePartner} />
        </NextIntlClientProvider>,
    );
    return onBecomePartner;
}

describe('BusinessInsightsSection', () => {
    afterEach(cleanup);

    it('shows a vendor three counts and the partner prompt', () => {
        const onBecomePartner = renderSection(false);
        expect(screen.getByText('Events')).toBeInTheDocument();
        expect(screen.getByText('Guests')).toBeInTheDocument();
        expect(screen.getByText('Profile taps')).toBeInTheDocument();
        expect(screen.queryByText('Photo and video views')).not.toBeInTheDocument();
        expect(screen.queryByTestId('trend')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Become a partner' }));
        expect(onBecomePartner).toHaveBeenCalledTimes(1);
    });

    it('shows a partner every count and the chart', () => {
        renderSection(true);
        expect(screen.getByText('Photo and video views')).toBeInTheDocument();
        expect(screen.getByText('Post viewers')).toBeInTheDocument();
        expect(screen.getByText('Feed card taps')).toBeInTheDocument();
        expect(screen.getByText('900')).toBeInTheDocument();
        expect(screen.getByTestId('trend')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Become a partner' })).not.toBeInTheDocument();
    });
});
