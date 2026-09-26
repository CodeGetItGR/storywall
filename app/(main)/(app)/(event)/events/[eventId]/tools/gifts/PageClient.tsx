'use client';

import { GiftAccountPage } from '@/components/gifts/GiftAccountPage';
import { GiftsPageSkeleton } from '@/components/gifts/GiftsSkeletons';
import { EventRouteGate } from '@/components/routing/EventRouteGate';

export default function GiftsPage() {
    return (
        <EventRouteGate fallback={<GiftsPageSkeleton />}>
            <GiftAccountPage />
        </EventRouteGate>
    );
}
