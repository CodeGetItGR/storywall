import type { RsvpReportDto, RsvpReportGroupDto, RsvpReportType, RsvpResponseDto } from '@/lib/api/types';
import { isRsvpGuest } from '@/lib/rsvpGuests';

type DemoMember = { id: string; displayName: string; role: string; deletedAt?: string | null };
type DemoRsvp = Pick<RsvpResponseDto, 'id' | 'eventMemberId' | 'attendanceStatus' | 'phone' | 'adultCount' | 'childCount' | 'notes'>;

const LABELS = {
    en: { attending: 'Attending', declined: 'Not attending' },
    el: { attending: 'Θα έρθουν', declined: 'Δεν θα έρθουν' },
};

// A small stand-in for GET /api/events/{id}/rsvps/report in demo mode. The demo's
// sessions are closed to RSVPs, so like the backend in that case every attending
// guest shares one "Attending" category and there are no per-session totals.
export function buildDemoRsvpReport(input: {
    members: DemoMember[];
    rsvps: DemoRsvp[];
    event: { title: string; schedule: { startAt: string } };
    reportType: RsvpReportType;
    locale: string;
}): RsvpReportDto {
    const labels = input.locale.startsWith('el') ? LABELS.el : LABELS.en;
    const guests = new Map(input.members.filter(isRsvpGuest).map((member) => [member.id, member.displayName]));
    const answered = input.rsvps.filter((rsvp) => guests.has(rsvp.eventMemberId));
    const attending = answered.filter((rsvp) => rsvp.attendanceStatus === 'ATTENDING');
    const declined = answered.filter((rsvp) => rsvp.attendanceStatus === 'DECLINED');
    const adults = attending.reduce((sum, rsvp) => sum + rsvp.adultCount, 0);
    const children = attending.reduce((sum, rsvp) => sum + rsvp.childCount, 0);

    const report: RsvpReportDto = {
        reportType: input.reportType,
        header: {
            eventTitle: input.event.title,
            eventTypeName: null,
            eventDate: input.event.schedule.startAt.slice(0, 10),
            generatedAt: new Date().toISOString(),
        },
        totals: { responses: answered.length, people: adults + children, adults, children },
        categories: null,
        sessions: null,
        groups: null,
    };

    if (input.reportType === 'STATISTICS') {
        const categories: NonNullable<RsvpReportDto['categories']> = [];
        if (attending.length > 0) {
            categories.push({
                label: labels.attending,
                attending: true,
                comingSessionIds: [],
                noAnswerSessionIds: [],
                responses: attending.length,
                people: adults + children,
                percentOfPeople: adults + children > 0 ? 100 : 0,
            });
        }
        categories.push({
            label: labels.declined,
            attending: false,
            comingSessionIds: [],
            noAnswerSessionIds: [],
            responses: declined.length,
            people: 0,
            percentOfPeople: null,
        });
        return { ...report, categories, sessions: [] };
    }

    // Sorted by name, then by rsvpId, matching the backend's tie-break for guests who share a name.
    const rowsOf = (list: DemoRsvp[]) =>
        list
            .filter((rsvp) => input.reportType !== 'WITH_CHILDREN' || rsvp.childCount > 0)
            .map((rsvp) => ({
                rsvpId: rsvp.id,
                name: guests.get(rsvp.eventMemberId) ?? '',
                phone: rsvp.phone,
                adults: rsvp.adultCount,
                children: rsvp.childCount,
                notes: rsvp.notes,
            }))
            .sort((a, b) => a.name.localeCompare(b.name, input.locale) || a.rsvpId.localeCompare(b.rsvpId));

    const groups: RsvpReportGroupDto[] = [];
    const attendingRows = rowsOf(attending);
    if (attendingRows.length > 0) {
        groups.push({
            label: labels.attending,
            attending: true,
            comingSessionIds: [],
            noAnswerSessionIds: [],
            responses: attendingRows.length,
            people: attendingRows.reduce((sum, row) => sum + row.adults + row.children, 0),
            rows: attendingRows,
        });
    }
    const declinedRows = input.reportType === 'FULL_LIST' ? rowsOf(declined) : [];
    if (declinedRows.length > 0) {
        groups.push({
            label: labels.declined,
            attending: false,
            comingSessionIds: [],
            noAnswerSessionIds: [],
            responses: declinedRows.length,
            people: 0,
            rows: declinedRows,
        });
    }
    return { ...report, groups };
}
