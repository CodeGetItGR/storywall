import type { EventTypeConvention } from '@/lib/api/types';

// A dated campaign on occasion pages. Copy lives in messages under
// OccasionPages.campaigns.<id> (lead, cta, banner). It never changes the H1.
export type OccasionCampaign = {
    id: string;
    occasions: readonly EventTypeConvention[] | 'all';
    // ISO with offset. startsAt inclusive, endsAt exclusive.
    startsAt: string;
    endsAt: string;
    // Swaps the hero sentence and CTA label (from copy) and, if set, the image.
    hero?: { image?: { src: string; width: number; height: number } };
    banner?: boolean;
    // Carried to /events/new?code=… by every create link on the page.
    discountCode?: string;
};

export const OCCASION_CAMPAIGNS: readonly OccasionCampaign[] = [];

function appliesTo(campaign: { occasions?: readonly EventTypeConvention[] | 'all' }, eventType: EventTypeConvention): boolean {
    return !campaign.occasions || campaign.occasions === 'all' || campaign.occasions.includes(eventType);
}

export function isWithinWindow(window: { startsAt: string; endsAt: string }, now: Date): boolean {
    const time = now.getTime();
    return Date.parse(window.startsAt) <= time && time < Date.parse(window.endsAt);
}

// The newest-starting campaign live for this occasion right now, if any.
export function activeCampaign(
    eventType: EventTypeConvention,
    now: Date,
    campaigns: readonly OccasionCampaign[] = OCCASION_CAMPAIGNS,
): OccasionCampaign | null {
    return (
        campaigns
            .filter((campaign) => appliesTo(campaign, eventType) && isWithinWindow(campaign, now))
            .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt))[0] ?? null
    );
}
