import type { EventDetailResponseDto, EventSessionResponseDto } from '@/lib/api/types';
import { localDay } from '@/lib/datetime';
import { hasEventDate, journeyTimeZone, type SessionState, sessionStates } from '@/lib/eventJourney';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import { moduleOfBlock } from '@/lib/feedModuleBlocks';
import type { InvitationSection } from '@/lib/invitation/sections';

type ScheduleEvent = Pick<EventDetailResponseDto, 'schedule' | 'sessions'>;

export type FeedScheduleRow = { session: EventSessionResponseDto; state: SessionState };
// day: yyyy-mm-dd in the event's time zone.
export type FeedScheduleDay = { day: string; timeZone: string; rows: FeedScheduleRow[] };

type TimedSession = EventSessionResponseDto & { startAt: string };

// The schedule leaves out sessions without a time: it can't place them on the rail.
function timedSessions(event: ScheduleEvent): TimedSession[] {
    return (event.sessions ?? [])
        .filter((item): item is TimedSession => !item.deletedAt && Boolean(item.startAt))
        .sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt));
}

// Whether the schedule has anything to draw on some day: a date and at least one timed session.
export function hasTimedSessions(event: ScheduleEvent): boolean {
    return hasEventDate(event) && timedSessions(event).length > 0;
}

// The event's days with sessions, in order, each session's day read in the event's time zone.
function scheduleDays(event: ScheduleEvent, timeZone: string, now: Date): FeedScheduleDay[] {
    const byDay = new Map<string, TimedSession[]>();
    for (const item of timedSessions(event)) {
        const day = localDay(item.startAt, timeZone);
        byDay.set(day, [...(byDay.get(day) ?? []), item]);
    }
    return [...byDay].map(([day, sessions]) => {
        const states = sessionStates(sessions, timeZone, now);
        return { day, timeZone, rows: sessions.map((session, index) => ({ session, state: states[index] })) };
    });
}

// Every day with sessions, for the whole timeline. Empty without a date or a timed session.
export function feedScheduleDays(event: ScheduleEvent, now: Date): FeedScheduleDay[] {
    return hasEventDate(event) ? scheduleDays(event, journeyTimeZone(event), now) : [];
}

// The schedule as guests see it (KAN-293): the sessions to come and the one under way, by day. Past sessions leave
// it, and a day whose sessions are all over goes too. Empty once the last session is over.
export function upcomingScheduleDays(event: ScheduleEvent, now: Date): FeedScheduleDay[] {
    return feedScheduleDays(event, now)
        .map((day) => ({ ...day, rows: day.rows.filter((row) => row.state !== 'done') }))
        .filter((day) => day.rows.length > 0);
}

// Whether the schedule still has a session to come or under way.
export function hasUpcomingSessions(event: ScheduleEvent, now: Date): boolean {
    return upcomingScheduleDays(event, now).length > 0;
}

type ScheduleBlockEvent = ScheduleEvent & Pick<EventDetailResponseDto, 'modules'>;
type BlockSection = Pick<InvitationSection, 'type' | 'data'>;

// The Schedule block and Feed mode's schedule while the event has the module and no timed session: hosts get the white card
// that opens the editor, guests nothing (useFeedTop leaves the block out).
export function drawsScheduleCard(section: BlockSection, event: ScheduleBlockEvent): boolean {
    const isSchedule = section.type === 'feedSchedule' || moduleOfBlock(section) === 'schedule';
    return isSchedule && isModuleAvailable(event.modules, 'schedule') && !hasTimedSessions(event);
}

// The Schedule block drawn as the timeline of the sessions.
export function drawsScheduleTimeline(section: BlockSection, event: ScheduleBlockEvent): boolean {
    return moduleOfBlock(section) === 'schedule' && isModuleAvailable(event.modules, 'schedule') && hasTimedSessions(event);
}

// Whether the block is a white card, which holds its own tools in edit mode.
export function drawsCard(section: BlockSection, event: ScheduleBlockEvent): boolean {
    return (moduleOfBlock(section) !== null && !drawsScheduleTimeline(section, event)) || drawsScheduleCard(section, event);
}

// A schedule whose last session is over: off the page for everyone, hosts too (owner, 2026-11-26). Edit mode keeps it.
export function scheduleIsOver(section: BlockSection, event: ScheduleBlockEvent, now: Date): boolean {
    const isSchedule = section.type === 'feedSchedule' || moduleOfBlock(section) === 'schedule';
    return isSchedule && hasTimedSessions(event) && !hasUpcomingSessions(event, now);
}
