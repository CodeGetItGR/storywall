import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import type { QrLinkResolutionDto } from '@/lib/api/types';
import type { Campaign } from '@/lib/campaignVisits';
import { routes } from '@/lib/routes';

// What a scanned event code can offer (KAN-208). Join, upload and wish come from the codes themselves;
// a signed-in member gets Open the event in place of Join, and the event's wishbook when it has one.
export type QrLandingChoice = 'join' | 'open' | 'upload' | 'wish' | 'wishbook';

// The forms the page opens in place. The other choices are links to other pages.
export type QrLandingForm = 'upload' | 'wish';

export interface QrLandingPlan {
    choices: QrLandingChoice[];
    // The token each choice uses. Upload and wish can run on a different code than the one scanned.
    joinInviteToken: string | null;
    uploadToken: string | null;
    wishToken: string | null;
}

export interface QrLandingVisitor {
    isMember: boolean;
    hasWishbook: boolean;
}

const NO_PLAN: QrLandingPlan = { choices: [], joinInviteToken: null, uploadToken: null, wishToken: null };

// The choices one active event code offers this visitor, in display order.
export function qrLandingPlan(resolution: QrLinkResolutionDto | null | undefined, visitor: QrLandingVisitor): QrLandingPlan {
    if (resolution?.status !== 'ACTIVE') return NO_PLAN;

    // An upload code uploads even from a backend too old to list its actions.
    const ownToken = resolution.targetType === 'MEDIA_UPLOAD' || (resolution.guestActions ?? []).includes('UPLOAD');
    const joinInviteToken = (resolution.targetType === 'EVENT_JOIN' ? resolution.inviteToken : resolution.joinInviteToken) ?? null;
    const uploadToken = resolution.targetType === 'EVENT_JOIN' ? (resolution.uploadToken ?? null) : ownToken ? 'self' : null;
    // Every plan with a wishbook takes wishes without an account (the backend names the token). A backend older
    // than wishToken still lets a lite event's guest code take them.
    const wishToken =
        resolution.wishToken ?? (resolution.targetType === 'GUEST' && (resolution.guestActions ?? []).includes('WISH') ? 'self' : null);

    const choices: QrLandingChoice[] = [];
    if (visitor.isMember) choices.push('open');
    else if (joinInviteToken) choices.push('join');
    if (uploadToken) choices.push('upload');
    if (visitor.isMember && visitor.hasWishbook) choices.push('wishbook');
    else if (wishToken) choices.push('wish');

    return { choices, joinInviteToken, uploadToken, wishToken };
}

// The scanned token stands in for 'self', so the plan stays a pure function of the resolution.
export function resolveQrLandingToken(planToken: string | null, scannedToken: string): string | null {
    return planToken === 'self' ? scannedToken : planToken;
}

// Where a choice that leaves the page leads, or null for the forms the page opens itself.
export function qrLandingChoiceHref(choice: QrLandingChoice, plan: QrLandingPlan, eventId: string | null | undefined): string | null {
    if (choice === 'join') return plan.joinInviteToken ? routes.inviteToken(plan.joinInviteToken) : null;
    if (choice === 'open') return eventId ? routes.events.feed(eventId) : null;
    if (choice === 'wishbook') return eventId ? routes.events.tools.wishbook(eventId) : null;
    return null;
}

// What the page opens on: the chooser when there is more than one choice, otherwise the one choice.
export function qrLandingStart(plan: QrLandingPlan): QrLandingChoice | 'chooser' | null {
    if (plan.choices.length === 0) return null;
    if (plan.choices.length > 1) return 'chooser';
    return plan.choices[0];
}

// Campaign parameters, so a sign-up that starts from the QR page's banner shows up as such in the sign-up sources.
export const QR_PROMO_CAMPAIGN: Campaign = { utmSource: 'storywall', utmMedium: 'qr', utmCampaign: 'qr-promo' };

// The landing page in the visitor's language, tagged as coming from the QR page's banner.
export function qrPromoHref(locale: Locale): string {
    const query = new URLSearchParams({
        utm_source: QR_PROMO_CAMPAIGN.utmSource,
        utm_medium: QR_PROMO_CAMPAIGN.utmMedium,
        utm_campaign: QR_PROMO_CAMPAIGN.utmCampaign,
    }).toString();
    return `${getPublicLandingPath(locale)}?${query}`;
}
