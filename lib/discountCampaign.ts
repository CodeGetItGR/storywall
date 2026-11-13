import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import type { DiscountCampaignLiveDto, SiteNoticeLiveDto } from '@/lib/api/types';
import type { SiteNoticeViewArea } from '@/lib/siteNotices';

// The discount campaign's banner (spec 2026-11-03-discount-campaigns-design). No React here, so the
// root layouts can seed the query cache with the same key.

export const discountCampaignKeys = {
    live: () => ['discount-campaign', 'live'] as const,
};

const CAMPAIGN_AREAS: ReadonlySet<SiteNoticeViewArea> = new Set<SiteNoticeViewArea>(['PUBLIC', 'HOST']);

// A campaign's text never changes in a way that should reopen it, so its version is always 1.
export function discountCampaignDismissalKey(id: string): string {
    return `${id}:1`;
}

// Whether the campaign takes the bar from `notice`, the notice that would show otherwise. Only a
// warning or a critical notice keeps it. A closed campaign stays closed.
export function campaignShowsOver(
    campaign: DiscountCampaignLiveDto,
    notice: SiteNoticeLiveDto | null,
    area: SiteNoticeViewArea | null,
    dismissed: ReadonlySet<string>,
): boolean {
    if (area === null || !CAMPAIGN_AREAS.has(area)) return false;
    if (dismissed.has(discountCampaignDismissalKey(campaign.id))) return false;
    return notice === null || notice.tone === 'OFFER' || notice.tone === 'INFO';
}

export function plansHref(locale: Locale): string {
    return `${getPublicLandingPath(locale)}#pricing`;
}

// A scanned QR code's page shows the campaign in its own banner at the foot (KAN-208), so the bar
// leaves it out there.
export function campaignBarHiddenOn(pathname: string): boolean {
    return pathname === '/q' || pathname.startsWith('/q/');
}
