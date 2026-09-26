'use client';

import { EventRouteGate } from '@/components/routing/EventRouteGate';
import { ScheduleStoryScreen } from '@/components/story/ScheduleStoryScreen';
import { ScheduleStorySkeleton } from '@/components/story/ScheduleStorySkeleton';
import { routes } from '@/lib/routes';

export function ScheduleStoryBoundary() {
    return (
        <EventRouteGate missingEventRedirectTo={routes.feed} fallback={<ScheduleStorySkeleton />}>
            <ScheduleStoryScreen />
        </EventRouteGate>
    );
}
