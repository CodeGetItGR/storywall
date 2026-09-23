'use client';

import { ManageScreen } from '@/components/manage/ManageScreen';
import { EventRouteGate } from '@/components/routing/EventRouteGate';

export default function ManagePage() {
    return (
        <EventRouteGate requireHost>
            <ManageScreen />
        </EventRouteGate>
    );
}
