import { showsUnreleasedPages } from '@/lib/unreleasedPages';

// The customizable feed (KAN-242): saved feed layouts, edit mode and the signed-out feed on the join
// link. While this is false the production site keeps today's feed, Theme page and join link.
export const FEED_EDITOR_LAUNCHED = false;

// Server only: VERCEL_ENV never reaches the browser. Client code reads useFeedEditorEnabled().
export function showsFeedEditor(env?: Parameters<typeof showsUnreleasedPages>[0]): boolean {
    return showsUnreleasedPages(env, FEED_EDITOR_LAUNCHED);
}
