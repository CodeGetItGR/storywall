import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { cookies, headers } from 'next/headers';
import { type ReactNode } from 'react';

import { DraftEventRouteGuard } from '@/components/event/DraftEventRouteGuard';
import { EventLifecycleBanner } from '@/components/event/EventLifecycleBanner';
import { eventKeys } from '@/hooks/useEvent';
import { myEventsKeys } from '@/hooks/useMyEvents';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import { serverGet } from '@/lib/api/serverFetch';
import type { EventDetailResponseDto, EventMemberResponseDto } from '@/lib/api/types';
import { ACCESS_TOKEN_HEADER } from '@/lib/auth/authCookies';
import { makeQueryClient } from '@/lib/queryClient';
import { ACTIVE_EVENT_COOKIE } from '@/lib/storageKeys';

// Prefetches the same two calls EventProvider's useMyEvents()/useEvent() make
// on mount, straight from the access token middleware already validated (see
// middleware.ts) — so the event switcher and the active event's detail are
// already in the query cache by the time the client hydrates, instead of the
// client waterfall of auth bootstrap -> memberships -> event detail.
export default async function EventLayout({ children }: { children: ReactNode }) {
    const [headerList, cookieStore] = await Promise.all([headers(), cookies()]);
    const accessToken = headerList.get(ACCESS_TOKEN_HEADER);
    const queryClient = makeQueryClient();

    if (accessToken) {
        try {
            const membershipsRes = await serverGet<EventMemberResponseDto[]>(endpoints.me.events, accessToken);
            const memberships = normalizeList(membershipsRes).items;
            queryClient.setQueryData(myEventsKeys.all, memberships);

            const activeEventId = cookieStore.get(ACTIVE_EVENT_COOKIE)?.value ?? memberships[0]?.eventId;

            if (activeEventId && memberships.some((m) => m.eventId === activeEventId)) {
                const event = await serverGet<EventDetailResponseDto>(endpoints.events.byId(activeEventId), accessToken);
                queryClient.setQueryData(eventKeys.detail(activeEventId), event);
            }
        } catch {
            // Best-effort — the client-side hooks fetch normally if this fails.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <div className="min-h-screen bg-background">
                <EventLifecycleBanner />
                <DraftEventRouteGuard>
                    <div className="lg:max-w-none">{children}</div>
                </DraftEventRouteGuard>
            </div>
        </HydrationBoundary>
    );
}
