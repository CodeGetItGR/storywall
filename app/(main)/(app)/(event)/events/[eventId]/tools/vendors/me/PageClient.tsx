'use client';

import { EventRouteGate } from '@/components/routing/EventRouteGate';
import { VendorMeScreen } from '@/components/vendors/me/VendorMeScreen';
import { VendorsPageSkeleton } from '@/components/vendors/VendorsSkeletons';

// Not gated on the vendors module: with it off, a vendor still sees their own details and why the tools are closed.
export default function VendorMePage() {
    return (
        <EventRouteGate fallback={<VendorsPageSkeleton />}>
            <VendorMeScreen />
        </EventRouteGate>
    );
}
