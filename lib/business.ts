import type { BusinessOverviewDto, PartnerBrandingDto, PartnerPortalResponseDto, PartnerTierProgressDto } from '@/lib/api/types';
import { type PartnerBalance, partnerBalances, partnerPortalBlock } from '@/lib/partnerPortal';

export type BusinessInsightKey = 'events' | 'guests' | 'proViews' | 'postViewers' | 'cardTaps' | 'listTaps';

// Whether there is anything to count yet: a total above zero, or a month with views.
export function businessHasNumbers(overview: BusinessOverviewDto): boolean {
    const totals = Object.values(overview.totals).some((value) => (value ?? 0) > 0);
    return totals || (overview.trend?.some((point) => point.views > 0) ?? false);
}

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
        // The one "Become a partner" prompt on the page; the server decides when it shows.
        partnerPrompt: overview.showPartnerPrompt,
    };
}

// "2026-10" → "Oct" / "Οκτ". The month is a calendar month, so UTC keeps it from shifting.
export function monthLabel(locale: string, month: string): string {
    return new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`));
}

// "2026-10" → "October 2026" / "Οκτώβριος 2026", for reading out.
export function monthYearLabel(locale: string, month: string): string {
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`));
}

// "June 2026: 0, July 2026: 120, …" for the trend chart's accessible label, in the locale's list style.
export function trendListLabel(locale: string, trend: { month: string; views: number }[], point: (month: string, views: number) => string): string {
    const items = trend.map((entry) => point(monthYearLabel(locale, entry.month), entry.views));
    return new Intl.ListFormat(locale, { style: 'short', type: 'unit' }).format(items);
}

// Sections another page can link to with ?section=…, and the id of the element the page scrolls to.
export type BusinessPageSection = 'printPrices';
export const BUSINESS_SECTION_IDS: Record<BusinessPageSection, string> = { printPrices: 'print-prices' };

export function isBusinessPageSection(value: string | null | undefined): value is BusinessPageSection {
    return value === 'printPrices';
}

// Where the partner's earnings stand in the top card. 'hidden' for non-partners.
export type BusinessEarnings =
    | { state: 'hidden' | 'loading' | 'notVerified' | 'notLinked' | 'failed' }
    | { state: 'ready'; balances: PartnerBalance[]; tierProgress: PartnerTierProgressDto | null };

export function businessEarnings(
    partner: boolean,
    portal: { data?: PartnerPortalResponseDto; error: unknown; isLoading: boolean },
): BusinessEarnings {
    if (!partner) return { state: 'hidden' };
    if (portal.data) return { state: 'ready', balances: partnerBalances(portal.data.totals), tierProgress: portal.data.tierProgress };
    if (portal.isLoading) return { state: 'loading' };
    if (portal.error) return { state: partnerPortalBlock(portal.error) ?? 'failed' };
    return { state: 'loading' };
}
