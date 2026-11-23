import type { EventDetailResponseDto } from '@/lib/api/types';
import { localDay } from '@/lib/datetime';
import { journeyTimeZone, primaryDay } from '@/lib/eventJourney';
import { routes } from '@/lib/routes';

// The feed page's two modes with Save my date (the Invitation | Feed switch). 'single': one page, no switch.
export const FEED_MODES = ['invitation', 'feed'] as const;
export type FeedMode = (typeof FEED_MODES)[number];
export type FeedPageMode = FeedMode | 'single';

// ?view=invitation or ?view=feed: opens that mode, and is kept in step with the switch.
export const VIEW_PARAM = 'view';

// A viewer's last pick, with the day (in the event's time zone) it was made, so the event day's reset happens once.
export type FeedModePick = { mode: FeedMode; savedDay: string };

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function isFeedMode(value: unknown): value is FeedMode {
    return value === 'invitation' || value === 'feed';
}

export function parseFeedModeParam(value: string | null): FeedMode | null {
    return isFeedMode(value) ? value : null;
}

export function readFeedModePick(raw: string | null | undefined): FeedModePick | null {
    if (!raw) return null;
    try {
        const value = JSON.parse(raw) as Partial<FeedModePick> | null;
        if (!value || !isFeedMode(value.mode) || typeof value.savedDay !== 'string' || !DAY.test(value.savedDay)) return null;
        return { mode: value.mode, savedDay: value.savedDay };
    } catch {
        return null;
    }
}

type DatedEvent = Pick<EventDetailResponseDto, 'schedule' | 'sessions'>;

// The event day: the main session's day in the event's time zone, else the start day. Null without a date.
export function eventDayOf(event: DatedEvent): string | null {
    return primaryDay(event);
}

// Today in the event's time zone.
export function todayFor(event: DatedEvent, now: number = Date.now()): string {
    return localDay(new Date(now), journeyTimeZone(event));
}

// save: the pick to store now (a link's mode, or the event day's one-time reset), or null.
export type FeedModeOpening = { mode: FeedMode; save: FeedModePick | null };

type OpeningInput = { today: string; eventDay: string | null; pick: FeedModePick | null; param: FeedMode | null };

// Which mode the page opens on (spec rules 1–5). Days are yyyy-mm-dd, so they compare as strings.
export function openingFeedMode({ today, eventDay, pick, param }: OpeningInput): FeedModeOpening {
    if (param) {
        const already = pick?.mode === param && pick.savedDay === today;
        return { mode: param, save: already ? null : { mode: param, savedDay: today } };
    }
    const fromEventDay = eventDay !== null && today >= eventDay;
    if (fromEventDay && pick && pick.savedDay < eventDay) return { mode: 'feed', save: { mode: 'feed', savedDay: today } };
    if (pick) return { mode: pick.mode, save: null };
    return { mode: fromEventDay ? 'feed' : 'invitation', save: null };
}

// The page's address with ?view= set to the mode, every other param kept.
export function withViewParam(pathname: string, search: string, mode: FeedMode): string {
    const params = new URLSearchParams(search);
    params.set(VIEW_PARAM, mode);
    return `${pathname}?${params.toString()}`;
}

// The date row's place link for a member: the main session's place page, as the cover's main session button.
export function feedPlaceHref(event: Pick<EventDetailResponseDto, 'id' | 'sessions'>): string | null {
    return (event.sessions ?? []).some((session) => session.isMain) ? routes.events.location(event.id, 'main') : null;
}
