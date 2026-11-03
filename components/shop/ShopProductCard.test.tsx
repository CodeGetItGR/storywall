import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ShopProductCard } from '@/components/shop/ShopProductCard';
import type { ShopProductCardDto } from '@/lib/api/types';

vi.mock('next-intl/server', () => ({
    getTranslations: async () => (key: string) => key,
}));

const card: ShopProductCardDto = {
    storeSlug: 'inviart',
    handle: 'passport',
    title: 'Passport invitation',
    imageUrl: 'https://cdn.shopify.com/s/files/1/passport.jpg',
    imageAlt: null,
    minPriceCents: 5800,
    maxPriceCents: 5800,
    currency: 'EUR',
    isDigital: true,
};

describe('ShopProductCard', () => {
    afterEach(cleanup);

    it('links to the storywall product page and shows price and kind', async () => {
        render(await ShopProductCard({ locale: 'en', product: card }));

        expect(screen.getByRole('link')).toHaveAttribute('href', '/shop/inviart/passport');
        expect(screen.getByText('€58.00')).toBeInTheDocument();
        expect(screen.getByText('digital')).toBeInTheDocument();
    });

    it('falls back to the title for alt text and asks for a resized image', async () => {
        render(await ShopProductCard({ locale: 'en', product: card }));

        const image = screen.getByRole('img', { name: 'Passport invitation' });
        expect(image).toHaveAttribute('src', 'https://cdn.shopify.com/s/files/1/passport.jpg?width=600');
    });

    it('says printed when a variant ships', async () => {
        render(await ShopProductCard({ locale: 'en', product: { ...card, isDigital: false } }));

        expect(screen.getByText('printed')).toBeInTheDocument();
    });

    it('renders without an image', async () => {
        render(await ShopProductCard({ locale: 'en', product: { ...card, imageUrl: null } }));

        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
});
