import { dehydrate, HydrationBoundary, type QueryClient } from '@tanstack/react-query';

import { eventSessionKeys } from '@/hooks/useEventSessions';
import { usageKeys } from '@/hooks/useUsage';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import { serverGet, serverModuleReadable } from '@/lib/api/serverFetch';
import type { EventSessionResponseDto, EventUsageResponseDto } from '@/lib/api/types';
import { prefetchAccessToken, resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';

import SchedulePage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }> };

async function prefetchSessions(queryClient: QueryClient, eventId: string, accessToken: string) {
    try {
        if (!(await serverModuleReadable(eventId, 'schedule', accessToken))) return;
        const sessions = await serverGet<EventSessionResponseDto[]>(endpoints.events.sessions(eventId), accessToken);
        queryClient.setQueryData(eventSessionKeys.list(eventId), normalizeList(sessions).items);
    } catch {
        // Best-effort — useEventSessions fetches normally on the client if this fails.
    }
}

// Host-only, like the client: the usage's plan code gives the session cap.
async function prefetchHostUsage(queryClient: QueryClient, eventId: string) {
    const context = await resolveServerEventContext(eventId);
    if (!context?.isHost) return;

    try {
        const usage = await serverGet<EventUsageResponseDto>(endpoints.events.usage(eventId), context.accessToken);
        queryClient.setQueryData(usageKeys.event(eventId), usage);
    } catch {
        // Best-effort — useEventUsage fetches normally on the client if this fails.
    }
}

// Prefetches the event's sessions so ScheduleScreen renders the list
// immediately instead of its loading state, plus the host's session cap.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const accessToken = await prefetchAccessToken();
    const queryClient = makeQueryClient();

    if (accessToken) {
        await Promise.all([prefetchSessions(queryClient, eventId, accessToken), prefetchHostUsage(queryClient, eventId)]);
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <SchedulePage />
        </HydrationBoundary>
    );
}
