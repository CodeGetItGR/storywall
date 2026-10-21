'use client';

import { EventRouteGate } from '@/components/routing/EventRouteGate';
import { ManageVendorsScreen } from '@/components/vendors/manage/ManageVendorsScreen';
import { VendorsPageSkeleton } from '@/components/vendors/VendorsSkeletons';

export default function ManageVendorsPage() {
    return (
        <EventRouteGate requireHost fallback={<VendorsPageSkeleton />}>
            <ManageVendorsScreen />
        </EventRouteGate>
    );
}
