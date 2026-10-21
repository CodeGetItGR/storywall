'use client';

import { PlaylistLiveScreen } from '@/components/playlist/live/PlaylistLiveScreen';
import { PlaylistPageSkeleton } from '@/components/playlist/PlaylistSkeletons';
import { EventRouteGate } from '@/components/routing/EventRouteGate';

export default function PlaylistLivePage() {
    return (
        <EventRouteGate requireHost allowVendorCapability="SONG_REQUESTS" fallback={<PlaylistPageSkeleton />}>
            <PlaylistLiveScreen />
        </EventRouteGate>
    );
}
