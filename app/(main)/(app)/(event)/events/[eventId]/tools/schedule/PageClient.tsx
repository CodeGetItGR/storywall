'use client';

import { EventRouteGate } from '@/components/routing/EventRouteGate';
import { ScheduleScreen } from '@/components/schedule/ScheduleScreen';
import { SchedulePageSkeleton } from '@/components/schedule/ScheduleSkeletons';

export default function SchedulePage() {
    return (
        <EventRouteGate fallback={<SchedulePageSkeleton />}>
            <ScheduleScreen />
        </EventRouteGate>
    );
}
