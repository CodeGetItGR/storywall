'use client';

import { GalleryScreen } from '@/components/gallery/GalleryScreen';
import { GalleryPageSkeleton } from '@/components/gallery/GallerySkeletons';
import { EventRouteGate } from '@/components/routing/EventRouteGate';
import { isGalleryOpenToGuests } from '@/lib/qrLinks';
import { useActiveEvent } from '@/providers/EventProvider';

export default function GalleryPage() {
    const openToGuests = isGalleryOpenToGuests(useActiveEvent());

    return (
        <EventRouteGate requireHost={!openToGuests} fallback={<GalleryPageSkeleton />}>
            <GalleryScreen />
        </EventRouteGate>
    );
}
