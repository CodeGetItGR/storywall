import { describe, expect, it } from 'vitest';

import { formatInviartPrice, inviartProductUrl, parseInviartCards } from '@/lib/inviart';

const EUR = (amount: string) => ({ amount, currencyCode: 'EUR' });

function product(overrides: Record<string, unknown> = {}) {
    return {
        handle: 'qr-code-photo-upload-roses',
        title: 'QR Code Photo Upload – Roses',
        availableForSale: true,
        featuredImage: { url: 'https://cdn.shopify.com/s/files/roses.jpg', altText: null },
        priceRange: { minVariantPrice: EUR('50.0') },
        compareAtPriceRange: { minVariantCompareAtPrice: EUR('80.0') },
        ...overrides,
    };
}

describe('parseInviartCards', () => {
    it('maps products with their sale price', () => {
        const cards = parseInviartCards({ data: { collection: { products: { nodes: [product()] } } } });

        expect(cards).toEqual([
            {
                handle: 'qr-code-photo-upload-roses',
                title: 'QR Code Photo Upload – Roses',
                image: { url: 'https://cdn.shopify.com/s/files/roses.jpg', altText: null },
                price: EUR('50.0'),
                compareAtPrice: EUR('80.0'),
            },
        ]);
    });

    it('leaves out products not for sale', () => {
        const cards = parseInviartCards({ data: { collection: { products: { nodes: [product({ availableForSale: false })] } } } });

        expect(cards).toEqual([]);
    });

    it('drops a compare-at price that is not above the price', () => {
        const cards = parseInviartCards({
            data: { collection: { products: { nodes: [product({ compareAtPriceRange: { minVariantCompareAtPrice: EUR('0.0') } })] } } },
        });

        expect(cards?.[0].compareAtPrice).toBeNull();
    });

    it('gives no cards for a missing collection and null for an error', () => {
        expect(parseInviartCards({ data: { collection: null } })).toEqual([]);
        expect(parseInviartCards({ errors: [{ message: 'Unauthorized' }] })).toBeNull();
    });
});

describe('inviartProductUrl', () => {
    it('links straight to the product with the UTM tags', () => {
        expect(inviartProductUrl('qr-code-photo-upload-roses', 'WEDDING')).toBe(
            'https://www.inviart.gr/products/qr-code-photo-upload-roses?utm_source=storywall&utm_medium=referral&utm_campaign=wedding',
        );
    });
});

describe('formatInviartPrice', () => {
    it('shows the amount as Shopify gives it', () => {
        // Intl puts a no-break space before the euro sign.
        expect(formatInviartPrice('el', EUR('50.0'))).toMatch(/^50,00\s€$/);
        expect(formatInviartPrice('en', EUR('64.5'))).toBe('€64.50');
    });
});
