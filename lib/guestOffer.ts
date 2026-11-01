import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';

// Campaign parameters, so a sign-up that starts from the card shows up as such in the sign-up sources.
const GUEST_OFFER_CAMPAIGN = 'utm_source=storywall&utm_medium=feed&utm_campaign=guest-offer';

// The landing page in the guest's language, tagged as coming from the guest offer card.
export function guestOfferLandingHref(locale: Locale): string {
    return `${getPublicLandingPath(locale)}?${GUEST_OFFER_CAMPAIGN}`;
}
