import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { BusinessPreviewsSection } from '@/components/business/BusinessPreviewsSection';
import type { PartnerBrandingDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const cardPreview: PartnerBrandingDto = {
    variant: 'FEATURE_CARD',
    displayName: 'Studio Lumen',
    role: 'PHOTOGRAPHER',
    logoUrl: 'https://cdn.example.com/logo.png',
    coverUrl: 'https://cdn.example.com/cover.png',
    tagline: { el: 'Φωτογραφία γάμου', en: 'Wedding photography' },
    services: { el: 'Γάμοι', en: 'Weddings' },
    linkUrl: null,
    placement: null,
};

function renderSection(props: Partial<Parameters<typeof BusinessPreviewsSection>[0]>) {
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
            <BusinessPreviewsSection cardPreview={null} showSneakPeek={false} name="Studio Lumen" logoUrl={null} {...props} />
        </NextIntlClientProvider>,
    );
}

describe('BusinessPreviewsSection', () => {
    afterEach(cleanup);

    it('shows the card in all three styles, each with a label and none as a link', () => {
        renderSection({ cardPreview });
        expect(screen.getByText('Large card')).toBeInTheDocument();
        expect(screen.getByText('Compact row')).toBeInTheDocument();
        expect(screen.getByText('Credit line')).toBeInTheDocument();
        expect(screen.getAllByText('Studio Lumen').length).toBeGreaterThanOrEqual(3);
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
        expect(screen.queryByText('A first look post')).not.toBeInTheDocument();
    });

    it('does not link even when the card has a link', () => {
        renderSection({ cardPreview: { ...cardPreview, linkUrl: '/api/partner-click/1' } });
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('shows only the sneak peek when there is no card', () => {
        renderSection({ showSneakPeek: true });
        expect(screen.getByText('A first look post')).toBeInTheDocument();
        expect(screen.queryByText('Your card in the feed')).not.toBeInTheDocument();
        expect(screen.queryByText('Large card')).not.toBeInTheDocument();
    });
});
