import { pageRoute } from '@/lib/vercelInsights';

type RouteParams = Record<string, string | string[] | undefined>;

// The Google Analytics 4 measurement id. Set only on the production
// deployment, so local and preview builds never send data to the property.
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || null;

// Page views are sent by hand (one per page, with a cleaned URL), so the
// automatic one on config is off.
export const GA_CONFIG = { send_page_view: false };

// Campaign parameters Analytics needs to tell where a visit came from. Every
// other query parameter is dropped.
const CAMPAIGN_PARAMS = new Set(['gclid', 'gbraid', 'wbraid']);

function isCampaignParam(name: string): boolean {
    return name.startsWith('utm_') || CAMPAIGN_PARAMS.has(name);
}

// The page under its route (`/events/[eventId]/checkout/success`), never an id
// or token from the real URL, with only the campaign parameters kept.
export function analyticsPageLocation(href: string, params: RouteParams): string {
    const url = new URL(href);
    const kept = new URLSearchParams();
    url.searchParams.forEach((value, name) => {
        if (isCampaignParam(name)) kept.append(name, value);
    });
    const query = kept.toString();
    return `${url.origin}${pageRoute(url.pathname, params)}${query ? `?${query}` : ''}`;
}

// A referrer on this site may be a page with a token in its URL, so it is cut
// to the origin. Other sites' referrers are kept: that is where visits come from.
export function analyticsPageReferrer(referrer: string, origin: string): string {
    if (!referrer) return '';
    try {
        return new URL(referrer).origin === origin ? origin : referrer;
    } catch {
        return '';
    }
}

// Set for the page as well, so the events Analytics sends by itself on this
// page carry the cleaned URL too.
export function trackAnalyticsPageview(tagId: string, pageLocation: string, pageReferrer: string): void {
    const page = { page_location: pageLocation, page_referrer: pageReferrer };
    window.gtag?.('set', page);
    window.gtag?.('event', 'page_view', { send_to: tagId, ...page });
}

// Google's own switch to stop the tag sending anything, used when the visitor
// withdraws consent or leaves the pages that may be measured.
export function setAnalyticsDisabled(tagId: string, disabled: boolean): void {
    (window as unknown as Record<string, unknown>)[`ga-disable-${tagId}`] = disabled;
}
