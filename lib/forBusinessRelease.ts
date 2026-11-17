import { showsUnreleasedPages } from '@/lib/unreleasedPages';

// The page for all businesses (/for-business, /el/epaggelmaties). While this is false it shows everywhere
// but the production site; there it 404s and stays out of the sitemap and every link. The vendor type
// pages under it are live.
export const FOR_BUSINESS_HUB_LAUNCHED = false;

export function showsForBusinessHub(env?: Parameters<typeof showsUnreleasedPages>[0]): boolean {
    return showsUnreleasedPages(env, FOR_BUSINESS_HUB_LAUNCHED);
}
