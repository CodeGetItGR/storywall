import type { CheckoutAttributionDto } from '@/lib/api/types';
import { type Campaign, campaignFromUrl } from '@/lib/campaignVisits';

// The last campaign link this browser came through, credited to the order it buys (spec
// 2026-11-03-discount-campaigns-design). Unlike the sign-up source, the latest visit wins and it
// works for existing accounts. Written only with analytics consent, and read only from the cookie,
// so a visitor who declined is never credited.

export const CAMPAIGN_ATTRIBUTION_COOKIE = 'sw_campaign';

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

// This visit's link, until consent allows the cookie. Module memory: gone on the next full page load.
let arrival: Campaign | null = null;

export function rememberCampaignArrival(href: string) {
    const campaign = campaignFromUrl(href);
    if (campaign) arrival = campaign;
}

export function currentCampaignArrival(): Campaign | null {
    return arrival;
}

export function writeCampaignAttributionCookie(campaign: Campaign) {
    try {
        const secure = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `${CAMPAIGN_ATTRIBUTION_COOKIE}=${encodeURIComponent(JSON.stringify(campaign))}; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
    } catch {
        // Blocked cookies: nothing is credited.
    }
}

function isCampaign(value: unknown): value is Campaign {
    const candidate = value as Partial<Campaign> | null;
    return typeof candidate?.utmSource === 'string' && typeof candidate.utmMedium === 'string' && typeof candidate.utmCampaign === 'string';
}

export function readCampaignAttributionCookie(): Campaign | null {
    try {
        const prefix = `${CAMPAIGN_ATTRIBUTION_COOKIE}=`;
        const match = document.cookie.split('; ').find((part) => part.startsWith(prefix));
        if (!match) return null;
        const parsed: unknown = JSON.parse(decodeURIComponent(match.slice(prefix.length)));
        return isCampaign(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

// Spread into a checkout body. The server keeps it only when it matches a saved link.
export function checkoutAttribution(): { attribution?: CheckoutAttributionDto } {
    const campaign = readCampaignAttributionCookie();
    return campaign ? { attribution: { source: campaign.utmSource, medium: campaign.utmMedium, campaign: campaign.utmCampaign } } : {};
}
