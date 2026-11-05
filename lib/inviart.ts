import type { Locale } from '@/i18n/config';
import type { EventTypeConvention } from '@/lib/api/types';

// INVIART's products, read from the Shopify Storefront API (KAN-104, INVIART's integration spec).
// Shopify ships a Storefront API version every quarter and supports each for about a year: move
// this forward at least once a year, and check Shopify's changelog for the fields below.
export const INVIART_STOREFRONT_API_VERSION = '2026-10';
// Prices for Greece. Visitors from Cyprus see the Greek price until they reach inviart.gr.
export const INVIART_COUNTRY = 'GR';
export const INVIART_CARD_LIMIT = 8;
export const INVIART_IMAGE_SIZE = 600;
// Cards and the occasion → collection mapping are cached on our server for this long, so
// visitors never reach Shopify themselves.
export const INVIART_CACHE_SECONDS = 300;

export type InviartPrice = { amount: string; currencyCode: string };

export type InviartCard = {
    handle: string;
    title: string;
    image: { url: string; altText: string | null } | null;
    price: InviartPrice;
    // The old price, shown crossed out; null when the product is not on sale.
    compareAtPrice: InviartPrice | null;
};

export const INVIART_CARDS_QUERY = `query InviartCards($handle: String!, $first: Int!, $country: CountryCode!) @inContext(country: $country) {
  collection(handle: $handle) {
    products(first: $first, filters: [{ available: true }]) {
      nodes {
        handle
        title
        availableForSale
        featuredImage { url(transform: { maxWidth: ${INVIART_IMAGE_SIZE}, maxHeight: ${INVIART_IMAGE_SIZE}, crop: CENTER }) altText }
        priceRange { minVariantPrice { amount currencyCode } }
        compareAtPriceRange { minVariantCompareAtPrice { amount currencyCode } }
      }
    }
  }
}`;

type StorefrontProduct = {
    handle: string;
    title: string;
    availableForSale: boolean;
    featuredImage: { url: string; altText: string | null } | null;
    priceRange: { minVariantPrice: InviartPrice };
    compareAtPriceRange: { minVariantCompareAtPrice: InviartPrice | null } | null;
};

export type InviartCardsResponse = {
    data?: { collection: { products: { nodes: StorefrontProduct[] } } | null } | null;
    errors?: unknown;
};

// Storefront response → cards. Null for an error response; products not for sale are left out.
export function parseInviartCards(response: InviartCardsResponse): InviartCard[] | null {
    if (response.errors || !response.data) return null;
    const products = response.data.collection?.products.nodes ?? [];
    return products
        .filter((product) => product.availableForSale)
        .map((product) => {
            const price = product.priceRange.minVariantPrice;
            const compareAt = product.compareAtPriceRange?.minVariantCompareAtPrice ?? null;
            return {
                handle: product.handle,
                title: product.title,
                image: product.featuredImage,
                price,
                compareAtPrice: compareAt && Number(compareAt.amount) > Number(price.amount) ? compareAt : null,
            };
        });
}

// Straight to INVIART's product page, no redirect in between.
export function inviartProductUrl(handle: string, eventType: EventTypeConvention): string {
    const params = new URLSearchParams({ utm_source: 'storywall', utm_medium: 'referral', utm_campaign: eventType.toLowerCase() });
    return `https://www.inviart.gr/products/${encodeURIComponent(handle)}?${params.toString()}`;
}

// Shopify's amount as it is: euro amounts have two decimals, so nothing is rounded.
export function formatInviartPrice(locale: Locale, price: InviartPrice): string {
    return new Intl.NumberFormat(locale === 'el' ? 'el-GR' : 'en-IE', { style: 'currency', currency: price.currencyCode }).format(Number(price.amount));
}
