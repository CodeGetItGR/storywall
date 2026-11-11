import { dehydrate } from '@tanstack/react-query';
import type { Metadata } from 'next';

import { CreateEventWizardPage } from '@/components/event/create/wizard/CreateEventWizardPage';
import { appConfigKeys } from '@/hooks/useAppConfig';
import { planTiersByEventTypeKeys } from '@/hooks/usePlanTiersForEventType';
import { endpoints } from '@/lib/api/endpoints';
import { serverGet, serverPublicConfigGet, serverPublicGet } from '@/lib/api/serverFetch';
import type { AppConfigResponseDto, PlanTierResponseDto } from '@/lib/api/types';
import { prefetchAccessToken } from '@/lib/auth/serverEventContext';
import { CREATE_EVENT_TYPE_PARAM, resolveCreateEventType } from '@/lib/createEventSteps';
import { normalizeEventTypeSlug } from '@/lib/eventTypeSlug';
import { makeQueryClient } from '@/lib/queryClient';
import { NO_INDEX } from '@/lib/seo';
import { showsCreateWizard } from '@/lib/unreleasedPages';
import { PageHydrationBoundary } from '@/providers/PageHydrationBoundary';

import CreateEventPage from './PageClient';

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// A utility page: visitors can reach it once the wizard is on, so it says noindex itself.
export const metadata: Metadata = { robots: NO_INDEX };

// Prefetches the config and the opening event type's plans, so a link straight to a later step (a
// landing plan card opens on details) shows its form without waiting on either. With the wizard on
// the plan list is public, so it is fetched for visitors too.
export default async function Page({ searchParams }: PageProps) {
    const wizard = showsCreateWizard();
    const queryClient = makeQueryClient();
    const accessToken = await prefetchAccessToken();

    try {
        const config = await serverPublicConfigGet<AppConfigResponseDto>(endpoints.config.get);
        queryClient.setQueryData(appConfigKeys.all, config);

        if (accessToken || wizard) {
            const typeParam = (await searchParams)[CREATE_EVENT_TYPE_PARAM];
            const enabledTypes = config.eventTypes.filter((type) => type.isEnabled).map((type) => type.eventTypeKey);
            const eventType = resolveCreateEventType(enabledTypes, null, normalizeEventTypeSlug(typeof typeParam === 'string' ? typeParam : null));
            const path = endpoints.planTiers.byEventType(eventType);
            const plans = accessToken
                ? await serverGet<PlanTierResponseDto[]>(path, accessToken)
                : await serverPublicGet<PlanTierResponseDto[]>(path);
            queryClient.setQueryData(planTiersByEventTypeKeys.all(eventType), plans);
        }
    } catch {
        // Best-effort — the client hooks fetch normally if this fails.
    }

    return <PageHydrationBoundary state={dehydrate(queryClient)}>{wizard ? <CreateEventWizardPage /> : <CreateEventPage />}</PageHydrationBoundary>;
}
