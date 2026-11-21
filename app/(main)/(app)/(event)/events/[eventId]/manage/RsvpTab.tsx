'use client';

import { RsvpAttendance } from '@/components/manage/rsvp/RsvpAttendance';
import { RsvpDeadlineCard } from '@/components/manage/rsvp/RsvpDeadlineCard';
import { RsvpHeadlineTiles } from '@/components/manage/rsvp/RsvpHeadlineTiles';
import { RsvpListPanel } from '@/components/manage/rsvp/RsvpListPanel';
import { RsvpReportCards } from '@/components/manage/rsvp/RsvpReportCards';
import type { RosterMember, RosterRsvp } from '@/hooks/useRsvpRoster';
import { useRsvpStatsReport } from '@/hooks/useRsvpStatsReport';

type RsvpTabProps = {
    eventId: string;
    members: RosterMember[];
    rsvps: RosterRsvp[];
    startAt: string | null;
    rsvpDeadline: string | null;
    timeZone: string;
    canWrite: boolean;
};

// R1a: RSVP on one page (KAN-227). Phones: deadline, numbers, reports, attendance, guests.
// Desktop: numbers, reports and guests in the main column; deadline and attendance beside them.
// The two columns are `contents` on phones, so `order` interleaves their blocks.
export default function RsvpTab({ eventId, members, rsvps, startAt, rsvpDeadline, timeZone, canWrite }: RsvpTabProps) {
    const stats = useRsvpStatsReport(eventId);

    return (
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_18.75rem] lg:items-start lg:gap-8">
            {/* Main column */}
            <div className="contents lg:flex lg:flex-col lg:gap-7">
                {/* Numbers (nothing on a failed load: the attendance block says so once) */}
                {(stats.isLoading || stats.report) && (
                    <div className="order-2 lg:order-none">
                        <RsvpHeadlineTiles totals={stats.report?.totals ?? null} isLoading={stats.isLoading} />
                    </div>
                )}

                {/* Reports */}
                <div className="order-3 lg:order-none">
                    <RsvpReportCards eventId={eventId} />
                </div>

                {/* Guests */}
                <div className="order-5 lg:order-none">
                    <RsvpListPanel eventId={eventId} members={members} rsvps={rsvps} canWrite={canWrite} />
                </div>
            </div>

            {/* Side column */}
            <div className="contents lg:sticky lg:top-6 lg:flex lg:flex-col lg:gap-6">
                {/* Deadline */}
                <div className="order-1 lg:order-none">
                    <RsvpDeadlineCard eventId={eventId} rsvpDeadline={rsvpDeadline} startAt={startAt} timeZone={timeZone} canWrite={canWrite} />
                </div>

                {/* Attendance */}
                <div className="order-4 lg:order-none">
                    <RsvpAttendance {...stats} />
                </div>
            </div>
        </div>
    );
}
