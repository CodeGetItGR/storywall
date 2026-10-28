'use client';

import { QrCardScreen } from '@/components/qrCard/QrCardScreen';
import { QrCardPageSkeleton } from '@/components/qrCard/QrCardSkeletons';
import { EventRouteGate } from '@/components/routing/EventRouteGate';

export default function QrCardPage() {
    return (
        <EventRouteGate requireHost allowVendorCapability="QR_READ" fallback={<QrCardPageSkeleton />}>
            <QrCardScreen />
        </EventRouteGate>
    );
}
