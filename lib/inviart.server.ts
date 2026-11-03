import { unstable_cache } from 'next/cache';

import { endpoints } from '@/lib/api/endpoints';
import type { EventTypeConvention, InviartCollectionDto } from '@/lib/api/types';
import {
    INVIART_CACHE_SECONDS,
    INVIART_CARD_LIMIT,
    INVIART_CARDS_QUERY,
    INVIART_COUNTRY,
    INVIART_STOREFRONT_API_VERSION,
    type InviartCard,
    type InviartCardsResponse,
    parseInviartCards,
} from '@/lib/inviart';
import { showsInviartCards } from '@/lib/inviartRelease';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const TIMEOUT_MS = 3000;

// Server only: the private Storefront token never reaches the browser (no NEXT_PUBLIC_ prefix).
// INVIART_STOREFRONT_DOMAIN is the store's xxx.myshopify.com domain.
async function fetchCards(eventType: EventTypeConvention): Promise<InviartCard[] | null> {
    const domain = process.env.INVIART_STOREFRONT_DOMAIN;
    const token = process.env.INVIART_STOREFRONT_TOKEN;
    if (!domain || !token) return null;

    const mappingRes = await fetch(`${API_BASE_URL}${endpoints.inviart.collections}`, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!mappingRes.ok) return null;
    const handle = ((await mappingRes.json()) as InviartCollectionDto[]).find((row) => row.eventType === eventType)?.collectionHandle;
    if (!handle) return [];

    const res = await fetch(`https://${domain}/api/${INVIART_STOREFRONT_API_VERSION}/graphql.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Shopify-Storefront-Private-Token': token },
        body: JSON.stringify({ query: INVIART_CARDS_QUERY, variables: { handle, first: INVIART_CARD_LIMIT, country: INVIART_COUNTRY } }),
        cache: 'no-store',
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return parseInviartCards((await res.json()) as InviartCardsResponse);
}

// One Shopify call per occasion per window, whatever the traffic. A failure is cached as null for
// the window too, so a broken token or an outage is not retried on every page view.
const loadCards = unstable_cache(
    async (eventType: EventTypeConvention): Promise<InviartCard[] | null> => {
        try {
            return await fetchCards(eventType);
        } catch {
            return null;
        }
    },
    ['inviart-cards'],
    { revalidate: INVIART_CACHE_SECONDS },
);

// Best-effort: null (an error, no collection, nothing for sale) hides the section.
export async function loadInviartCards(eventType: EventTypeConvention): Promise<InviartCard[] | null> {
    if (!showsInviartCards()) return null;
    try {
        const cards = await loadCards(eventType);
        return cards && cards.length > 0 ? cards : null;
    } catch {
        return null;
    }
}
