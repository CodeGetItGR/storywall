'use client';

import { AnnouncementScreen } from '@/components/announcement/AnnouncementScreen';
import { EventRouteGate } from '@/components/routing/EventRouteGate';
import { VendorsPageSkeleton } from '@/components/vendors/VendorsSkeletons';

export default function AnnouncementPage() {
    return (
        <EventRouteGate requireHost allowVendorCapability="ANNOUNCE" fallback={<VendorsPageSkeleton />}>
            <AnnouncementScreen />
        </EventRouteGate>
    );
}
