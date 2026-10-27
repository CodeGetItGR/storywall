// Admin-side rules for Shopify stores and shop categories, matching the backend's validation
// (ShopStoreCreateDto, ShopCategoryCreateDto, ShopCategoryCollectionsDto).

export const SHOP_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,39}$/;
export const SHOP_SLUG_MAX = 40;
export const SHOP_DOMAIN_PATTERN = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
export const SHOP_DOMAIN_MAX = 120;
export const SHOP_STORE_NAME_MAX = 80;
export const SHOP_CLIENT_ID_MAX = 120;
export const SHOP_CLIENT_SECRET_MAX = 200;
export const SHOP_CATEGORY_NAME_MAX = 40;
export const SHOP_SORT_ORDER_MAX = 1000;
export const SHOP_CATEGORY_COLLECTIONS_MAX = 50;

// What the admin types into the slug field: lower-case, spaces become dashes.
export function normalizeShopSlug(value: string): string {
    return value.toLowerCase().replace(/\s+/g, '-');
}

// Domains are matched lower-case; surrounding spaces are dropped when checked and sent.
export function normalizeShopDomain(value: string): string {
    return value.toLowerCase();
}

export function isShopSlugValid(slug: string): boolean {
    return SHOP_SLUG_PATTERN.test(slug);
}

export function isShopDomainValid(domain: string): boolean {
    const trimmed = domain.trim();
    return trimmed.length <= SHOP_DOMAIN_MAX && SHOP_DOMAIN_PATTERN.test(trimmed);
}

// One collection of one store, as a stable key for selection sets.
export function shopCollectionKey(storeId: string, collectionGid: string): string {
    return `${storeId}|${collectionGid}`;
}
