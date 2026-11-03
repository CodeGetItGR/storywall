import { showsUnreleasedPages } from '@/lib/unreleasedPages';

// The shop pages (plan 2026-10-27-shopify-shop). While this is false they show
// everywhere but the production site; there they 404.
export const SHOP_LAUNCHED = false;

export function showsShop(env?: Parameters<typeof showsUnreleasedPages>[0]): boolean {
    return showsUnreleasedPages(env, SHOP_LAUNCHED);
}
