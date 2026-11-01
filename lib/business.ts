import type { BusinessOverviewDto, PartnerBrandingDto } from '@/lib/api/types';

export type BusinessInsightKey = 'events' | 'guests' | 'proViews' | 'postViewers' | 'cardTaps' | 'listTaps';

// The counts the insights strip shows, in order. Partners get the views and card taps too.
export function businessInsightKeys(overview: BusinessOverviewDto): BusinessInsightKey[] {
    if (!overview.partner) return ['events', 'guests', 'listTaps'];
    return ['events', 'guests', 'proViews', 'postViewers', 'cardTaps', 'listTaps'];
}

// Which optional sections the page shows. A section with nothing to show is left out, not drawn empty.
export function businessSections(overview: BusinessOverviewDto, cardPreview: PartnerBrandingDto | null) {
    const content = Boolean(overview.content);
    const feedCard = overview.partner && cardPreview !== null;
    return {
        content,
        printPrices: overview.vendorType === 'PHOTOGRAPHER',
        feedCard,
        sneakPeekSample: content,
        previews: feedCard || content,
    };
}

// "2026-10" → "Oct" / "Οκτ". The month is a calendar month, so UTC keeps it from shifting.
export function monthLabel(locale: string, month: string): string {
    return new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`));
}
