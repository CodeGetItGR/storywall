'use client';

import { notFound, useParams } from 'next/navigation';

import { RsvpReportScreen } from '@/components/manage/rsvp/RsvpReportScreen';
import { EventRouteGate } from '@/components/routing/EventRouteGate';
import { isRsvpReportType } from '@/lib/rsvpReport';

export default function RsvpReportPage() {
    const { reportType } = useParams<{ reportType: string }>();
    // The demo route has no server page to check this first.
    if (!isRsvpReportType(reportType)) notFound();

    return (
        <EventRouteGate requireHost>
            <RsvpReportScreen reportType={reportType} />
        </EventRouteGate>
    );
}
