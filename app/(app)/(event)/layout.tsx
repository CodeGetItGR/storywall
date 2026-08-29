import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { type ReactNode } from 'react';

import { DraftEventRouteGuard } from '@/components/event/DraftEventRouteGuard';
import { EventLifecycleBanner } from '@/components/event/EventLifecycleBanner';
import { eventKeys } from '@/hooks/useEvent';
import { myEventsKeys } from '@/hooks/useMyEvents';
import { endpoints } from '@/lib/api/endpoints';
import { serverGet } from '@/lib/api/serverFetch';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';

// Prefetches the same two calls EventProvider's useMyEvents()/useEvent() make
// on mount, straight from the access token middleware already validated (see
// middleware.ts) — so the event switcher and the active event's detail are
// already in the query cache by the time the client hydrates, instead of the
// client waterfall of auth bootstrap -> memberships -> event detail.
export default async function EventLayout({ children }: { children: ReactNode }) {
    const queryClient = makeQueryClient();
    const context = await resolveServerEventContext();

    if (context) {
        queryClient.setQueryData(myEventsKeys.all, context.memberships);

        if (context.activeEventId) {
            try {
                const event = await serverGet<EventDetailResponseDto>(endpoints.events.byId(context.activeEventId), context.accessToken);
                queryClient.setQueryData(eventKeys.detail(context.activeEventId), event);
            } catch {
                // Best-effort — the client-side hooks fetch normally if this fails.
            }
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <div className="min-h-full bg-background">
                <EventLifecycleBanner />
                <DraftEventRouteGuard>
                    <div className="lg:max-w-none">{children}</div>
                </DraftEventRouteGuard>
            </div>
        </HydrationBoundary>
    );
}
