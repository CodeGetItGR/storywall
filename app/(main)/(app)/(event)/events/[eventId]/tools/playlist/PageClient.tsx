'use client';

import { PlaylistScreen } from '@/components/playlist/PlaylistScreen';
import { EventRouteGate } from '@/components/routing/EventRouteGate';

export default function PlaylistPage() {
    return (
        <EventRouteGate>
            <PlaylistScreen />
        </EventRouteGate>
    );
}
