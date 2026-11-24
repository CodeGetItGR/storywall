import type { AttendanceStatus, RsvpSessionResponsResponseDto } from '@/lib/api/types';

export type SessionRsvpAnswer = 'attending' | 'declined' | null;

// A guest's answer for one session, as Today's schedule shows it. A guest who isn't coming has declined every
// session. Null before they RSVP, or when they haven't answered this session yet.
export function sessionRsvpAnswer(
    attendance: AttendanceStatus | null,
    responses: readonly Pick<RsvpSessionResponsResponseDto, 'eventSessionId' | 'isAttending'>[],
    sessionId: string,
): SessionRsvpAnswer {
    if (attendance === 'DECLINED') return 'declined';
    if (attendance === null) return null;
    const response = responses.find((item) => item.eventSessionId === sessionId);
    if (!response) return null;
    return response.isAttending ? 'attending' : 'declined';
}

// The id of a session's question on the RSVP page, so a link can scroll to it.
export function rsvpSessionAnchor(sessionId: string): string {
    return `rsvp-session-${sessionId}`;
}
