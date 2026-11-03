import type { Locale } from '@/i18n/config';
import { SHOP_PATHS } from '@/i18n/publicLocale';

// The public shop (plan 2026-10-27-shopify-shop): paths, prices, images.

export function shopListPath(locale: Locale, { category, page }: { category?: string; page?: number } = {}): string {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (page && page > 0) params.set('page', String(page));
    const query = params.toString();
    return query ? `${SHOP_PATHS[locale]}?${query}` : SHOP_PATHS[locale];
}

export function shopProductPath(locale: Locale, storeSlug: string, handle: string): string {
    return `${SHOP_PATHS[locale]}/${encodeURIComponent(storeSlug)}/${encodeURIComponent(handle)}`;
}

export function formatShopPrice(locale: Locale, minCents: number, maxCents: number, currency: string): string {
    const format = new Intl.NumberFormat(locale === 'el' ? 'el-GR' : 'en-IE', { style: 'currency', currency });
    const min = format.format(minCents / 100);
    return minCents === maxCents ? min : `${min} – ${format.format(maxCents / 100)}`;
}

// Shopify's CDN resizes on request, so the shop needs no entry in next.config images.
export function shopImageUrl(url: string, width: number): string {
    return `${url}${url.includes('?') ? '&' : '?'}width=${width}`;
}

export function parseShopPage(value: string | string[] | undefined): number {
    const page = Number(Array.isArray(value) ? value[0] : value);
    return Number.isInteger(page) && page > 0 ? page : 0;
}
