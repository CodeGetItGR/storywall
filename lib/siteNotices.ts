import type { SiteNoticeArea, SiteNoticeLiveDto, SiteNoticeTone } from '@/lib/api/types';
import { isDemoPath } from '@/lib/demo/demoRouting';

// The notice bar (spec 2026-10-22-site-notices-design). One notice shows at a time: the viewer's
// area must match, the highest tone wins, then the newest. A closed notice is remembered by
// id:version, so an edited text shows again.

// PENDING: an event page whose viewer role isn't known yet. Only EVERYWHERE notices show, so a
// guest never sees a host-only offer for a moment.
export type SiteNoticeViewArea = Exclude<SiteNoticeArea, 'EVERYWHERE'> | 'PENDING';

const TONE_RANK: Record<SiteNoticeTone, number> = { CRITICAL: 3, WARNING: 2, OFFER: 1, INFO: 0 };

const APP_PREFIXES = ['/home', '/profile', '/notifications', '/feed', '/events'];

export function dismissalKey(notice: Pick<SiteNoticeLiveDto, 'id' | 'version'>): string {
    return `${notice.id}:${notice.version}`;
}

function matchesArea(notice: SiteNoticeLiveDto, area: SiteNoticeViewArea): boolean {
    if (notice.areas.includes('EVERYWHERE')) return true;
    return area !== 'PENDING' && notice.areas.includes(area);
}

function recency(notice: SiteNoticeLiveDto): number {
    return Date.parse(notice.startsAt ?? notice.createdAt) || 0;
}

export function pickSiteNotice(
    notices: readonly SiteNoticeLiveDto[],
    area: SiteNoticeViewArea | null,
    dismissed: ReadonlySet<string>,
): SiteNoticeLiveDto | null {
    if (area === null) return null;
    const candidates = notices.filter((notice) => matchesArea(notice, area) && !(notice.dismissible && dismissed.has(dismissalKey(notice))));
    candidates.sort((a, b) => TONE_RANK[b.tone] - TONE_RANK[a.tone] || recency(b) - recency(a));
    return candidates[0] ?? null;
}

function underPrefix(pathname: string, prefix: string): boolean {
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function siteNoticeAreaFor({
    pathname,
    isSignedIn,
    routeEventId,
    isHost,
    isEventLoading,
}: {
    pathname: string;
    isSignedIn: boolean;
    routeEventId: string | null;
    isHost: boolean;
    isEventLoading: boolean;
}): SiteNoticeViewArea | null {
    if (isDemoPath(pathname)) return null;
    if (underPrefix(pathname, '/admin')) return 'ADMIN';
    if (!isSignedIn) return 'PUBLIC';
    if (routeEventId) {
        if (isEventLoading) return 'PENDING';
        return isHost ? 'HOST' : 'GUEST';
    }
    // A post page belongs to an event the URL doesn't name, so the viewer's role there is unknown.
    if (underPrefix(pathname, '/post')) return 'PENDING';
    if (underPrefix(pathname, '/invite')) return 'GUEST';
    if (APP_PREFIXES.some((prefix) => underPrefix(pathname, prefix))) return 'HOST';
    return 'PUBLIC';
}
