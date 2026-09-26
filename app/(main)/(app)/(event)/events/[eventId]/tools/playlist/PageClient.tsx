'use client';

import { PlaylistScreen } from '@/components/playlist/PlaylistScreen';
import { PlaylistPageSkeleton } from '@/components/playlist/PlaylistSkeletons';
import { EventRouteGate } from '@/components/routing/EventRouteGate';

export default function PlaylistPage() {
    return (
        <EventRouteGate fallback={<PlaylistPageSkeleton />}>
            <PlaylistScreen />
        </EventRouteGate>
    );
}
