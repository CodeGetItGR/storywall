'use client';

import { EventRouteGate } from '@/components/routing/EventRouteGate';
import { VendorListScreen } from '@/components/vendors/list/VendorListScreen';
import { VendorsPageSkeleton } from '@/components/vendors/VendorsSkeletons';

export default function VendorListPage() {
    return (
        <EventRouteGate fallback={<VendorsPageSkeleton />}>
            <VendorListScreen />
        </EventRouteGate>
    );
}
