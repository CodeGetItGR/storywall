'use client';

import { EventRouteGate } from '@/components/routing/EventRouteGate';
import { ScheduleScreen } from '@/components/schedule/ScheduleScreen';

export default function SchedulePage() {
    return (
        <EventRouteGate>
            <ScheduleScreen />
        </EventRouteGate>
    );
}
