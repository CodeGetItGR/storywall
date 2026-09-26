type GuestCandidate = { role: string; deletedAt?: string | null };
type GuestRsvp = { eventMemberId: string; attendanceStatus: string; adultCount: number; childCount: number };

// Who the RSVP numbers are about, matching the backend: hosts organise the
// event, and removed members have left it.
export function isRsvpGuest(member: GuestCandidate): boolean {
    return member.role !== 'HOST' && !member.deletedAt;
}

// People coming, as the RSVP report's "Total people" counts them.
export function attendingGuestPeople(members: ({ id: string } & GuestCandidate)[], rsvps: GuestRsvp[]): number {
    const guestIds = new Set(members.filter(isRsvpGuest).map((member) => member.id));
    return rsvps
        .filter((rsvp) => rsvp.attendanceStatus === 'ATTENDING' && guestIds.has(rsvp.eventMemberId))
        .reduce((sum, rsvp) => sum + rsvp.adultCount + rsvp.childCount, 0);
}
