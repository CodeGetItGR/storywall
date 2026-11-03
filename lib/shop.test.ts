import { describe, expect, it } from 'vitest';

import { formatShopPrice, parseShopPage, shopImageUrl, shopListPath, shopProductPath } from '@/lib/shop';

// Intl may put a no-break space before the euro sign; compare spaces as plain spaces.
const spaces = (value: string) => value.replace(/\s/g, ' ');

describe('shop helpers', () => {
    it('builds list and product paths per locale', () => {
        expect(shopListPath('en')).toBe('/shop');
        expect(shopListPath('el', { category: 'wedding-invitations', page: 2 })).toBe('/el/shop?category=wedding-invitations&page=2');
        expect(shopListPath('en', { page: 0 })).toBe('/shop');
        expect(shopProductPath('el', 'inviart', 'ιστοσελίδα-γάμου-1')).toBe(
            '/el/shop/inviart/%CE%B9%CF%83%CF%84%CE%BF%CF%83%CE%B5%CE%BB%CE%AF%CE%B4%CE%B1-%CE%B3%CE%AC%CE%BC%CE%BF%CF%85-1',
        );
    });

    it('formats a single price and a range', () => {
        expect(spaces(formatShopPrice('el', 5800, 5800, 'EUR'))).toBe('58,00 €');
        expect(spaces(formatShopPrice('en', 5800, 6450, 'EUR'))).toBe('€58.00 – €64.50');
    });

    it('asks Shopify’s CDN for a resized image', () => {
        expect(shopImageUrl('https://cdn.shopify.com/s/files/1/a.jpg', 480)).toBe('https://cdn.shopify.com/s/files/1/a.jpg?width=480');
        expect(shopImageUrl('https://cdn.shopify.com/s/files/1/a.jpg?v=2', 480)).toBe('https://cdn.shopify.com/s/files/1/a.jpg?v=2&width=480');
    });

    it('parses the page param defensively', () => {
        expect(parseShopPage(undefined)).toBe(0);
        expect(parseShopPage('3')).toBe(3);
        expect(parseShopPage('-1')).toBe(0);
        expect(parseShopPage('abc')).toBe(0);
    });
});
