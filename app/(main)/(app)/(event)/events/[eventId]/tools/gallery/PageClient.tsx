'use client';

import { GalleryScreen } from '@/components/gallery/GalleryScreen';
import { GalleryPageSkeleton } from '@/components/gallery/GallerySkeletons';
import { EventRouteGate } from '@/components/routing/EventRouteGate';

export default function GalleryPage() {
    return (
        <EventRouteGate requireHost fallback={<GalleryPageSkeleton />}>
            <GalleryScreen />
        </EventRouteGate>
    );
}
