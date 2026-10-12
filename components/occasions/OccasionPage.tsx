import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { notFound } from 'next/navigation';

import { OccasionContent } from '@/components/occasions/OccasionContent';
import { OccasionStructuredData } from '@/components/occasions/OccasionStructuredData';
import { appConfigKeys } from '@/hooks/useAppConfig';
import type { Locale } from '@/i18n/config';
import { endpoints } from '@/lib/api/endpoints';
import { serverPublicConfigGet } from '@/lib/api/serverFetch';
import type { AppConfigResponseDto } from '@/lib/api/types';
import { activeCampaign } from '@/lib/occasions/campaigns';
import { loadOccasionDemoPreview } from '@/lib/occasions/demoPreview.server';
import type { Occasion } from '@/lib/occasions/occasions';
import { activeTheme } from '@/lib/occasions/themes';
import { makeQueryClient } from '@/lib/queryClient';

export async function OccasionPage({ locale, occasion }: { locale: Locale; occasion: Occasion }) {
    const queryClient = makeQueryClient();
    let config: AppConfigResponseDto | null = null;

    try {
        config = await serverPublicConfigGet<AppConfigResponseDto>(endpoints.config.get);
        queryClient.setQueryData(appConfigKeys.all, config);
    } catch {
        // Best-effort: the page still renders and useAppConfig() fetches on the client.
    }

    // Live only while the event type is on. Unknown (config failed) → render.
    const eventType = config?.eventTypes.find((candidate) => candidate.eventTypeKey === occasion.eventType);
    if (config && !eventType?.isEnabled) notFound();

    const preview = eventType?.hasDemo ? await loadOccasionDemoPreview(occasion.eventType, locale) : null;
    const now = new Date();

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <OccasionStructuredData locale={locale} occasion={occasion} />
            <OccasionContent
                campaign={activeCampaign(occasion.eventType, now)}
                locale={locale}
                occasion={occasion}
                preview={preview}
                theme={activeTheme(occasion.eventType, now)}
            />
        </HydrationBoundary>
    );
}
