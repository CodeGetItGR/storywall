import { showsUnreleasedPages } from '@/lib/unreleasedPages';

// The INVIART cards (KAN-104). While this is false they show everywhere but the production site.
export const INVIART_CARDS_LAUNCHED = false;

export function showsInviartCards(env?: Parameters<typeof showsUnreleasedPages>[0]): boolean {
    return showsUnreleasedPages(env, INVIART_CARDS_LAUNCHED);
}
