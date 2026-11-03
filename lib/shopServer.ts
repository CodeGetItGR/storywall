import { cache } from 'react';

import { endpoints } from '@/lib/api/endpoints';
import { serverPublicGet } from '@/lib/api/serverFetch';
import type { ShopCategoryDto, ShopProductDto, ShopProductPageDto } from '@/lib/api/types';

// Server-only: the public shop's reads. Null when Spring has nothing (an unknown category or
// product) or is down, so the page shows the 404 page instead of a broken one.

export async function loadShopList(category: string | undefined, page: number): Promise<{ categories: ShopCategoryDto[]; products: ShopProductPageDto } | null> {
    try {
        const [categories, products] = await Promise.all([
            serverPublicGet<ShopCategoryDto[]>(endpoints.shop.categories),
            serverPublicGet<ShopProductPageDto>(endpoints.shop.products({ category, page })),
        ]);
        return { categories, products };
    } catch {
        return null;
    }
}

// Cached per request: generateMetadata and the page both ask, and serverPublicGet skips Next's fetch dedupe.
export const loadShopProduct = cache(async (storeSlug: string, handle: string): Promise<ShopProductDto | null> => {
    try {
        return await serverPublicGet<ShopProductDto>(endpoints.shop.product(storeSlug, handle));
    } catch {
        return null;
    }
});

// Route params may arrive still percent-encoded (Greek handles); a stray % must not throw.
export function decodeShopParam(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}
