import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import type { DiscountCampaignLiveDto, GuestOfferDto } from '@/lib/api/types';
import type { Campaign } from '@/lib/campaignVisits';
import { routes } from '@/lib/routes';

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

// Event creation, with the guest's code filled in at checkout once they hold one. Opened in the same
// tab, so the create pop-up takes it where it is on.
export function guestOfferCreateHref(code: string | null): string {
    return routes.events.new({ code });
}

export type GuestOfferMode = 'claim' | 'campaign' | 'claimed';

// What the card shows: a code the guest already holds stays; otherwise a live campaign takes the
// claim's place. The headline percent is the discount on offer, none once a code is held.
export function guestOfferView(
    offer: GuestOfferDto,
    campaign: DiscountCampaignLiveDto | null,
): { mode: GuestOfferMode; percent: number | null; campaignEndsAt: string | null } {
    if (offer.code) return { mode: 'claimed', percent: null, campaignEndsAt: null };
    if (campaign) return { mode: 'campaign', percent: campaign.percent, campaignEndsAt: campaign.endsAt };
    return { mode: 'claim', percent: offer.discountPercent, campaignEndsAt: null };
}
