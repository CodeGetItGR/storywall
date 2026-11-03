import { useQuery } from '@tanstack/react-query';

import type { EventTypeConvention } from '@/lib/api/types';
import { INVIART_CACHE_SECONDS, type InviartCard } from '@/lib/inviart';

// INVIART's cards for an event type, from the app's own cached route (never Shopify directly).
// A failed read gives no cards, which hides the section.

export const inviartCardKeys = {
    byEventType: (eventType: EventTypeConvention) => ['inviart', 'cards', eventType] as const,
};

async function fetchInviartCards(eventType: EventTypeConvention): Promise<InviartCard[]> {
    const res = await fetch(`/api/inviart/${encodeURIComponent(eventType)}`);
    if (!res.ok) return [];
    return (await res.json()) as InviartCard[];
}

export function useInviartCards(eventType: EventTypeConvention) {
    const query = useQuery({
        queryKey: inviartCardKeys.byEventType(eventType),
        queryFn: () => fetchInviartCards(eventType),
        staleTime: INVIART_CACHE_SECONDS * 1000,
        retry: false,
    });
    return query.data ?? [];
}
