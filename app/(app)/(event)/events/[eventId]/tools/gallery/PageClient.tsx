'use client';

import { GalleryScreen } from '@/components/gallery/GalleryScreen';
import { EventRouteGate } from '@/components/routing/EventRouteGate';

export default function GalleryPage() {
    return (
        <EventRouteGate requireHost>
            <GalleryScreen />
        </EventRouteGate>
    );
}
