'use client';

import { GalleryQrScreen } from '@/components/gallery/GalleryQrScreen';
import { EventRouteGate } from '@/components/routing/EventRouteGate';

export default function GalleryQrPage() {
    return (
        <EventRouteGate requireHost>
            <GalleryQrScreen />
        </EventRouteGate>
    );
}
