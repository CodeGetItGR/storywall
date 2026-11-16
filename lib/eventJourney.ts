import type { EventDetailResponseDto, EventSessionResponseDto } from '@/lib/api/types';
import { addDays, localDay } from '@/lib/datetime';
import type { JourneyIconKey } from '@/lib/journeyIcons';
import { isLiteEvent } from '@/lib/liteEvents';
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

/** The main session's day in the event's time zone, or the event's start day when it has no time. */
export function primaryDay(event: JourneyEvent): string {
    const main = liveSessions(event).find((item) => item.isMain && item.startAt);
    return localDay(main?.startAt ?? event.schedule.startAt, event.schedule.timezone);
}

export function phaseOfDay(day: string, primary: string): JourneyPhase {
    if (day < primary) return 'before';
    return day === primary ? 'day' : 'after';
}

export function currentPhase(event: JourneyEvent, now: Date = new Date()): JourneyPhase {
    return phaseOfDay(localDay(now, event.schedule.timezone), primaryDay(event));
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
        const phase = item.startAt ? phaseOfDay(localDay(item.startAt, event.schedule.timezone), primary) : 'day';
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

/** The day after the primary day: where the After phase starts. */
export function afterStartDay(event: JourneyEvent): string {
    return addDays(primaryDay(event), 1);
}

/** Where the All set card's print button goes: a lite event has no QR links, so it opens the gallery. */
export function journeyPrintHref(event: EventDetailResponseDto): string {
    return isLiteEvent(event) ? routes.events.tools.gallery(event.id) : routes.events.invitationsQr(event.id);
}
