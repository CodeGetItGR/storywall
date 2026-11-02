import { showsUnreleasedPages } from '@/lib/unreleasedPages';

// Save my date pages, editor and plans. While this is false they show
// everywhere but the production site; there they 404 and stay out of the
// sitemap, every link and every plan.
export const SAVE_MY_DATE_LAUNCHED = false;

export function showsSaveMyDate(env?: Parameters<typeof showsUnreleasedPages>[0]): boolean {
    return showsUnreleasedPages(env, SAVE_MY_DATE_LAUNCHED);
}
