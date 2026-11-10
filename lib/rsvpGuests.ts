import type { RsvpDisplayStatus } from '@/lib/statusTones';

type GuestCandidate = { role: string; deletedAt?: string | null };

export type RosterMember = { id: string; displayName: string; role: string; deletedAt: string | null };
export type RosterRsvp = {
    id: string;
    eventMemberId: string;
    attendanceStatus: 'ATTENDING' | 'DECLINED';
    notes: string | null;
    adultCount: number;
    childCount: number;
    phone?: string | null;
    // KAN-50: reply-only guests (answered from a published invitation) aren't in the member list.
    guestName?: string | null;
    replyOnly?: boolean;
    email?: string | null;
    possibleDuplicate?: boolean;
};

// One person on the RSVP list: a member guest, or a reply-only guest who
// answered from the published invitation.
export type RosterEntry = {
    // The event member id, which reply-only guests have too.
    id: string;
    name: string;
    status: RsvpDisplayStatus;
    rsvp: RosterRsvp | undefined;
    replyOnly: boolean;
};

// Who the RSVP numbers are about, matching the backend: hosts organise the
// event, and removed members have left it.
export function isRsvpGuest(member: GuestCandidate): boolean {
    return member.role !== 'HOST' && !member.deletedAt;
}

// The RSVP list: live member guests with their reply, then every reply-only
// guest. A reply-only RSVP whose member is somehow in the member list is that
// member's reply, never a second row.
export function rsvpRoster(members: RosterMember[], rsvps: RosterRsvp[]): RosterEntry[] {
    const rsvpByMember = new Map(rsvps.map((rsvp) => [rsvp.eventMemberId, rsvp]));
    const memberIds = new Set(members.map((member) => member.id));

    const memberGuests = members.filter(isRsvpGuest).map((member): RosterEntry => {
        const rsvp = rsvpByMember.get(member.id);
        return { id: member.id, name: member.displayName, status: rsvp?.attendanceStatus ?? 'NO_RESPONSE', rsvp, replyOnly: false };
    });
    const replyOnlyGuests = rsvps
        .filter((rsvp) => rsvp.replyOnly && !memberIds.has(rsvp.eventMemberId))
        .map((rsvp): RosterEntry => ({ id: rsvp.eventMemberId, name: rsvp.guestName ?? '', status: rsvp.attendanceStatus, rsvp, replyOnly: true }));

    return [...memberGuests, ...replyOnlyGuests];
}

// People coming, as the RSVP report's "Total people" counts them: reply-only guests included.
export function attendingGuestPeople(members: RosterMember[], rsvps: RosterRsvp[]): number {
    return rsvpRoster(members, rsvps)
        .filter((entry) => entry.status === 'ATTENDING')
        .reduce((sum, entry) => sum + (entry.rsvp?.adultCount ?? 0) + (entry.rsvp?.childCount ?? 0), 0);
}
