import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import type { Campaign } from '@/lib/campaignVisits';

// Campaign parameters, so a sign-up that starts from the card shows up as such in the sign-up sources.
export const GUEST_OFFER_CAMPAIGN: Campaign = { utmSource: 'storywall', utmMedium: 'feed', utmCampaign: 'guest-offer' };

const GUEST_OFFER_QUERY = new URLSearchParams({
    utm_source: GUEST_OFFER_CAMPAIGN.utmSource,
    utm_medium: GUEST_OFFER_CAMPAIGN.utmMedium,
    utm_campaign: GUEST_OFFER_CAMPAIGN.utmCampaign,
}).toString();

// The landing page in the guest's language, tagged as coming from the guest offer card.
export function guestOfferLandingHref(locale: Locale): string {
    return `${getPublicLandingPath(locale)}?${GUEST_OFFER_QUERY}`;
}

// The same page at its plans, for the card while a discount campaign is live.
export function guestOfferPlansHref(locale: Locale): string {
    return `${guestOfferLandingHref(locale)}#pricing`;
}
