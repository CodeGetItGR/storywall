import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PartnerFeedCard } from '@/components/feed/partner/PartnerFeedCard';
import type { PartnerBrandingDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { email: 'maria@example.com' } }) }));

const BRANDING: PartnerBrandingDto = {
    variant: 'FEATURE_CARD',
    displayName: 'Aegean Weddings',
    role: 'PLANNER',
    logoUrl: '/landing/decor-03.webp',
    coverUrl: '/landing/03-wedding-ceremony-santorini.webp',
    tagline: { en: 'Island weddings.', el: 'Γάμοι στα νησιά.' },
    services: { en: 'Planning', el: 'Οργάνωση' },
    linkUrl: '/api/partner-branding/click/abc',
    placement: { firstAfter: 2, every: 6 },
};

function renderCard(branding: PartnerBrandingDto) {
    render(
        <QueryClientProvider client={new QueryClient()}>
            <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
                <PartnerFeedCard branding={branding} eventId="evt-1" />
            </NextIntlClientProvider>
        </QueryClientProvider>,
    );
}

describe('PartnerFeedCard asking', () => {
    afterEach(cleanup);

    it('opens the ask sheet from the feature card, outside its link', () => {
        renderCard({ ...BRANDING, inquiry: { canAsk: true, sentAt: null } });
        const ask = screen.getByRole('button', { name: 'Ask about my date' });
        expect(ask.closest('a')).toBeNull();
        fireEvent.click(ask);
        expect(screen.getByRole('dialog', { name: 'Ask Aegean Weddings' })).toBeInTheDocument();
    });

    it('offers no ask without an inquiry state', () => {
        renderCard(BRANDING);
        expect(screen.queryByRole('button', { name: 'Ask about my date' })).not.toBeInTheDocument();
    });

    it('offers no ask on the compact row', () => {
        renderCard({ ...BRANDING, variant: 'COMPACT_ROW', inquiry: { canAsk: true, sentAt: null } });
        expect(screen.queryByRole('button', { name: 'Ask about my date' })).not.toBeInTheDocument();
    });
});
