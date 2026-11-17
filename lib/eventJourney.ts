import type { HelpProgress } from '@/hooks/useHelpProgress';
import type { EventDetailResponseDto, EventSessionResponseDto } from '@/lib/api/types';
import { addDays, localDay } from '@/lib/datetime';
import { eventCapabilities } from '@/lib/eventCapabilities';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import type { JourneyIconKey } from '@/lib/journeyIcons';
import { routes } from '@/lib/routes';

export type JourneyPhase = 'before' | 'day' | 'after';
export const JOURNEY_PHASES: JourneyPhase[] = ['before', 'day', 'after'];

export type JourneyStopStatus = 'done' | 'current' | 'upcoming';

export type JourneyChip = { key: string; label: string; tone: 'success' | 'neutral' | 'warn' };

/** One stop on the path. Everything is display-ready text; components only lay it out. */
export type JourneyStopModel = {
    key: string;
    title: string;
    icon: JourneyIconKey;
    status: JourneyStopStatus;
    href: string;
    detail?: string;
    chips?: JourneyChip[];
    links?: { key: string; label: string; href: string }[];
    // Coral line under the title (the running session's "Now").
    highlight?: string;
    // Shown inside the current circle instead of the icon (a session's start time).
    badge?: string;
    // The current stop's card.
    card?: { body?: string; action: { label: string; href: string } };
};

type JourneyEvent = Pick<EventDetailResponseDto, 'sessions' | 'schedule'>;

function liveSessions(event: JourneyEvent): EventSessionResponseDto[] {
    return (event.sessions ?? []).filter((item) => !item.deletedAt);
}

/** Whether the event has a date. A lite event may have none: its Overview shows one path with no phases. */
export function hasEventDate(event: JourneyEvent): boolean {
    return Boolean(event.schedule.startAt && event.schedule.timezone);
}

/** The event's time zone. An event without a date has none, and then no day on its journey depends on it. */
export function journeyTimeZone(event: JourneyEvent): string {
    return event.schedule.timezone ?? 'UTC';
}

/** The main session's day in the event's time zone, or the event's start day when it has no time. Null without a date. */
export function primaryDay(event: JourneyEvent): string | null {
    const main = liveSessions(event).find((item) => item.isMain && item.startAt);
    const start = main?.startAt ?? event.schedule.startAt;
    return start ? localDay(start, journeyTimeZone(event)) : null;
}

/** An event without a date is always before its day. */
export function phaseOfDay(day: string, primary: string | null): JourneyPhase {
    if (primary === null || day < primary) return 'before';
    return day === primary ? 'day' : 'after';
}

export function currentPhase(event: JourneyEvent, now: Date = new Date()): JourneyPhase {
    return phaseOfDay(localDay(now, journeyTimeZone(event)), primaryDay(event));
}

function byStart(left: EventSessionResponseDto, right: EventSessionResponseDto): number {
    if (left.startAt && right.startAt) return Date.parse(left.startAt) - Date.parse(right.startAt);
    if (left.startAt) return -1;
    if (right.startAt) return 1;
    return left.displayOrder - right.displayOrder;
}

/** Sessions grouped by the phase their day falls in, each by time. Untimed sessions sit on the day, last. */
export function sessionsByPhase(event: JourneyEvent): Record<JourneyPhase, EventSessionResponseDto[]> {
    const primary = primaryDay(event);
    const groups: Record<JourneyPhase, EventSessionResponseDto[]> = { before: [], day: [], after: [] };
    for (const item of [...liveSessions(event)].sort(byStart)) {
        const phase = item.startAt ? phaseOfDay(localDay(item.startAt, journeyTimeZone(event)), primary) : 'day';
        groups[phase].push(item);
    }
    return groups;
}

export type SessionState = 'done' | 'now' | 'upcoming';

/**
 * Where each session (sorted by time) stands at `now`. A session without an end runs until the
 * next timed session starts, or until its own day ends.
 */
export function sessionStates(sessions: EventSessionResponseDto[], timeZone: string, now: Date = new Date()): SessionState[] {
    const nowMs = now.getTime();
    const today = localDay(now, timeZone);
    return sessions.map((item, index) => {
        if (!item.startAt) return 'upcoming';
        if (Date.parse(item.startAt) > nowMs) return 'upcoming';
        if (item.endAt) return Date.parse(item.endAt) > nowMs ? 'now' : 'done';
        const next = sessions.slice(index + 1).find((later) => later.startAt);
        if (next?.startAt) return Date.parse(next.startAt) > nowMs ? 'now' : 'done';
        return localDay(item.startAt, timeZone) === today ? 'now' : 'done';
    });
}

/** The day after the primary day: where the After phase starts. Null without a date. */
export function afterStartDay(event: JourneyEvent): string | null {
    const primary = primaryDay(event);
    return primary ? addDays(primary, 1) : null;
}

/** Where the All set card's print button goes: a lite event has no QR links, so it opens the gallery. */
export function journeyPrintHref(event: EventDetailResponseDto): string {
    return eventCapabilities(event)?.kind === 'LITE' ? routes.events.tools.gallery(event.id) : routes.events.invitationsQr(event.id);
}

export type SetupStepKey = keyof HelpProgress;

type SetupEvent = Pick<EventDetailResponseDto, 'id' | 'status' | 'deletedAt' | 'suspended' | 'capabilities' | 'modules'>;

/** The Before journey's setup stops this event has, in path order. */
export function setupStepKeys(event: SetupEvent): SetupStepKey[] {
    const wishlistOn = event.modules.some((item) => item.moduleKey === 'wishlist' && item.isEnabled && item.isAvailable);
    const keys: SetupStepKey[] = ['details'];
    if (isModuleAvailable(event.modules, 'rsvp')) keys.push('rsvp');
    // A lite event takes no guests: it has no schedule or invitations to set up.
    const takesGuests = eventCapabilities(event)?.takesGuests ?? true;
    if (takesGuests) keys.push('schedule');
    if (wishlistOn) keys.push('giftAccount');
    if (takesGuests) keys.push('invitations');
    return keys;
}

/**
 * Steps left in the event's current phase, as the Overview path shows them: Before counts setup
 * stops not done and earlier sessions not ended; On the day counts the day's sessions not ended.
 * After has no count, since its stops are never marked done.
 */
export function journeyStepsLeft(event: JourneyEvent & SetupEvent, progress: HelpProgress, now: Date = new Date()): number | null {
    const phase = currentPhase(event, now);
    if (phase === 'after') return null;
    const groups = sessionsByPhase(event);
    const openSessions = (list: EventSessionResponseDto[]) =>
        sessionStates(list, journeyTimeZone(event), now).filter((state) => state !== 'done').length;
    if (phase === 'day') return openSessions(groups.day);
    return setupStepKeys(event).filter((key) => !progress[key]).length + openSessions(groups.before);
}

/** The dashboard's Overview: `/manage` with no tab, or `?tab=overview`. */
export function isOverviewPath(eventId: string, pathname: string, searchParams: string): boolean {
    if (pathname !== routes.events.manage(eventId)) return false;
    const tab = new URLSearchParams(searchParams).get('tab');
    return tab === null || tab === 'overview';
}
