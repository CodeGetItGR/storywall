import { NextResponse } from 'next/server';

import type { EventTypeConvention } from '@/lib/api/types';
import { loadInviartCards } from '@/lib/inviart.server';
import { OCCASIONS } from '@/lib/occasions/occasions';

// INVIART's cards for the event Overview (hooks/useInviartCards.ts). Our server calls Shopify, so
// the Storefront token stays here; an empty list hides the section.
export async function GET(_request: Request, { params }: { params: Promise<{ eventType: string }> }) {
    const { eventType } = await params;
    const known = OCCASIONS.some((occasion) => occasion.eventType === eventType);
    const cards = known ? await loadInviartCards(eventType as EventTypeConvention) : null;
    return NextResponse.json(cards ?? [], {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
}
