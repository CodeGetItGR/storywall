'use client';

import { ManageScreen } from '@/components/manage/ManageScreen';
import { ManagePageSkeleton } from '@/components/manage/ManageSkeletons';
import { EventRouteGate } from '@/components/routing/EventRouteGate';

export default function ManagePage() {
    return (
        <EventRouteGate requireHost fallback={<ManagePageSkeleton />}>
            <ManageScreen />
        </EventRouteGate>
    );
}
