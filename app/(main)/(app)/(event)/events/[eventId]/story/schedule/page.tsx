import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { eventSessionKeys } from '@/hooks/useEventSessions';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import { serverGet, serverModuleReadable } from '@/lib/api/serverFetch';
import type { EventSessionResponseDto } from '@/lib/api/types';
import { prefetchAccessToken } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';

import ScheduleStoryPage from './PageClient';

type PageProps = { params: Promise<{ eventId: string }> };

// ScheduleStoryScreen's only query is the event's sessions — prefetched
// here so it skips its loading state.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const accessToken = await prefetchAccessToken();
    const queryClient = makeQueryClient();

    if (accessToken) {
        try {
            if (!(await serverModuleReadable(eventId, 'schedule', accessToken))) throw new Error('schedule unavailable');
            const sessions = await serverGet<EventSessionResponseDto[]>(endpoints.events.sessions(eventId), accessToken);
            queryClient.setQueryData(eventSessionKeys.list(eventId), normalizeList(sessions).items);
        } catch {
            // Best-effort — useEventSessions fetches normally on the client if this fails.
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <ScheduleStoryPage />
        </HydrationBoundary>
    );
}
