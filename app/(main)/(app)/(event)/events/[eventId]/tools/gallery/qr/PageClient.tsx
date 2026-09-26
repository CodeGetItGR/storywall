'use client';

import { GalleryQrScreen } from '@/components/gallery/GalleryQrScreen';
import { GalleryQrPageSkeleton } from '@/components/gallery/GallerySkeletons';
import { EventRouteGate } from '@/components/routing/EventRouteGate';

export default function GalleryQrPage() {
    return (
        <EventRouteGate requireHost fallback={<GalleryQrPageSkeleton />}>
            <GalleryQrScreen />
        </EventRouteGate>
    );
}
