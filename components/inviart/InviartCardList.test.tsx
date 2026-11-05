import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { InviartCardList } from '@/components/inviart/InviartCardList';
import type { InviartCard } from '@/lib/inviart';

const card: InviartCard = {
    handle: 'passport',
    title: 'Passport invitation',
    image: { url: 'https://cdn.shopify.com/s/files/passport.jpg', altText: null },
    price: { amount: '50.0', currencyCode: 'EUR' },
    compareAtPrice: { amount: '80.0', currencyCode: 'EUR' },
};

describe('InviartCardList', () => {
    afterEach(cleanup);

    it('links each card to inviart.gr with the event type in the UTM', () => {
        render(<InviartCardList cards={[card]} eventType="BAPTISM" locale="en" ctaLabel="See it on INVIART" wasLabel="Was" />);

        const link = screen.getByRole('link');
        expect(link).toHaveAttribute(
            'href',
            'https://www.inviart.gr/products/passport?utm_source=storywall&utm_medium=referral&utm_campaign=baptism',
        );
        expect(link).toHaveAttribute('target', '_blank');
        expect(screen.getByText('€50.00')).toBeInTheDocument();
        expect(screen.getByLabelText('Was €80.00')).toBeInTheDocument();
    });

    it('gives the photo fixed dimensions, lazy loading and alt text', () => {
        render(<InviartCardList cards={[card]} eventType="WEDDING" locale="en" ctaLabel="See it" wasLabel="Was" />);

        const image = screen.getByRole('img', { name: 'Passport invitation' });
        expect(image).toHaveAttribute('width', '600');
        expect(image).toHaveAttribute('height', '600');
        expect(image).toHaveAttribute('loading', 'lazy');
    });
});
