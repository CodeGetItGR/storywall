import { cookies, headers } from 'next/headers';

import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import { serverGet } from '@/lib/api/serverFetch';
import type { EventMemberResponseDto } from '@/lib/api/types';
import { ACCESS_TOKEN_HEADER } from '@/lib/auth/authCookies';
import { ACTIVE_EVENT_COOKIE } from '@/lib/storageKeys';

export interface ServerEventContext {
    accessToken: string;
    memberships: EventMemberResponseDto[];
    activeEventId: string | null;
    isHost: boolean;
}

// Server-side mirror of EventProvider's active-event resolution (memberships
// + the last-selected event cookie, falling back to the first membership) —
// lets a route Server Component prefetch event-scoped data for the same
// event EventRouteGate will land on client-side. Same recipe as
// app/(app)/(event)/layout.tsx; that layout also calls this, so on any page
// under the (event) group the memberships fetch below is deduped by Next's
// per-request fetch memoization rather than hitting Spring twice.
export async function resolveServerEventContext(): Promise<ServerEventContext | null> {
    const [headerList, cookieStore] = await Promise.all([headers(), cookies()]);
    const accessToken = headerList.get(ACCESS_TOKEN_HEADER);
    if (!accessToken) return null;

    try {
        const membershipsRes = await serverGet<EventMemberResponseDto[]>(endpoints.me.events, accessToken);
        const memberships = normalizeList(membershipsRes).items;
        const requestedEventId = cookieStore.get(ACTIVE_EVENT_COOKIE)?.value ?? memberships[0]?.eventId;
        const activeMembership = memberships.find((m) => m.eventId === requestedEventId);

        return {
            accessToken,
            memberships,
            activeEventId: activeMembership?.eventId ?? null,
            isHost: activeMembership?.role === 'HOST',
        };
    } catch {
        return null;
    }
}
