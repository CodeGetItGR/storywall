import { dehydrate, HydrationBoundary, type QueryClient } from '@tanstack/react-query';

import { eventSessionKeys } from '@/hooks/useEventSessions';
import { usageKeys } from '@/hooks/useUsage';
import { vendorKeys } from '@/hooks/useVendors';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import { serverGet, serverGetOrNull, serverModuleReadable } from '@/lib/api/serverFetch';
import type { EventSessionResponseDto, EventUsageResponseDto, VendorMeDto } from '@/lib/api/types';
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
// Anyone else asks whether they are a planner, so the edit view opens without waiting for the role.
async function prefetchRoleData(queryClient: QueryClient, eventId: string) {
    const context = await resolveServerEventContext(eventId);
    if (!context) return;

    try {
        if (context.isHost) {
            const usage = await serverGet<EventUsageResponseDto>(endpoints.events.usage(eventId), context.accessToken);
            queryClient.setQueryData(usageKeys.event(eventId), usage);
        } else {
            const me = await serverGetOrNull<VendorMeDto>(endpoints.events.vendorMe(eventId), context.accessToken);
            queryClient.setQueryData(vendorKeys.me(eventId), me);
        }
    } catch {
        // Best-effort — useEventUsage/useMyVendorRole fetch normally on the client if this fails.
    }
}

// Prefetches the event's sessions so ScheduleScreen renders the list
// immediately instead of its loading state, plus the host's session cap or a member's vendor role.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const accessToken = await prefetchAccessToken();
    const queryClient = makeQueryClient();

    if (accessToken) {
        await Promise.all([prefetchSessions(queryClient, eventId, accessToken), prefetchRoleData(queryClient, eventId)]);
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <SchedulePage />
        </HydrationBoundary>
    );
}
