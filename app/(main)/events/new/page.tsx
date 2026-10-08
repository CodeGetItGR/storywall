import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { appConfigKeys } from '@/hooks/useAppConfig';
import { planTiersByEventTypeKeys } from '@/hooks/usePlanTiersForEventType';
import { endpoints } from '@/lib/api/endpoints';
import { serverGet, serverPublicConfigGet } from '@/lib/api/serverFetch';
import type { AppConfigResponseDto, PlanTierResponseDto } from '@/lib/api/types';
import { prefetchAccessToken } from '@/lib/auth/serverEventContext';
import { CREATE_EVENT_TYPE_PARAM, resolveCreateEventType } from '@/lib/createEventSteps';
import { normalizeEventTypeSlug } from '@/lib/eventTypeSlug';
import { makeQueryClient } from '@/lib/queryClient';

import CreateEventPage from './PageClient';

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// Prefetches the config and the opening event type's plans, so a link straight to a later step (a
// landing plan card opens on details) shows its form without waiting on either.
export default async function Page({ searchParams }: PageProps) {
    const queryClient = makeQueryClient();
    const accessToken = await prefetchAccessToken();

    try {
        const config = await serverPublicConfigGet<AppConfigResponseDto>(endpoints.config.get);
        queryClient.setQueryData(appConfigKeys.all, config);

        if (accessToken) {
            const typeParam = (await searchParams)[CREATE_EVENT_TYPE_PARAM];
            const enabledTypes = config.eventTypes.filter((type) => type.isEnabled).map((type) => type.eventTypeKey);
            const eventType = resolveCreateEventType(enabledTypes, null, normalizeEventTypeSlug(typeof typeParam === 'string' ? typeParam : null));
            const plans = await serverGet<PlanTierResponseDto[]>(endpoints.planTiers.byEventType(eventType), accessToken);
            queryClient.setQueryData(planTiersByEventTypeKeys.all(eventType), plans);
        }
    } catch {
        // Best-effort — the client hooks fetch normally if this fails.
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <CreateEventPage />
        </HydrationBoundary>
    );
}
