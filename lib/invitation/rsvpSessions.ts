import { type DateLanguage, dayAndMonthWords } from '@/lib/invitation/dateDisplay';
import { type InvitationEventData, localDateTime } from '@/lib/invitation/eventLinks';

// A schedule session the guest answers for on its own (KAN-298): its name and when it starts.
export type RsvpSessionChoice = { id: string; title: string; when: string };

// What the invitation's RSVP section knows of its event's replies.
export type InvitationRsvpState = {
    // The reply-by date has passed (KAN-297): the section shows that replies are closed.
    closed: boolean;
    // The sessions with RSVP turned on, in the event's order.
    sessions: RsvpSessionChoice[];
};

export const OPEN_RSVP: InvitationRsvpState = { closed: false, sessions: [] };

// Whether replies closed at the deadline: the backend refuses them from that moment on.
export function isRsvpClosed(deadline: string | null | undefined, now: number): boolean {
    if (!deadline) return false;
    const at = new Date(deadline).getTime();
    return !Number.isNaN(at) && now >= at;
}

// The sessions as the venue's clock shows them: the time alone when they are all on one day, else the day too.
export function rsvpSessionChoices(event: InvitationEventData | null, language: DateLanguage): RsvpSessionChoice[] {
    const sessions = event?.rsvp?.sessions ?? [];
    const local = sessions.map((session) => (session.startAt ? localDateTime(session.startAt, event?.timezone ?? 'UTC') : null));
    const days = new Set(local.filter(Boolean).map((value) => value?.slice(0, 10)));
    return sessions.map((session, index) => {
        const value = local[index];
        if (!value) return { id: session.id, title: session.title, when: '' };
        const time = value.slice(11, 16);
        const [month, day] = value.slice(5, 10).split('-').map(Number);
        return { id: session.id, title: session.title, when: days.size > 1 ? `${dayAndMonthWords(month, day, language)}, ${time}` : time };
    });
}

// The section's state from the event: closed once its deadline has passed, and the sessions it asks about.
export function invitationRsvpState(event: InvitationEventData | null, language: DateLanguage, now: number): InvitationRsvpState {
    return { closed: isRsvpClosed(event?.rsvp?.deadline, now), sessions: rsvpSessionChoices(event, language) };
}
