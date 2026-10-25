import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { OccasionContent } from '@/components/occasions/OccasionContent';
import { OccasionStructuredData } from '@/components/occasions/OccasionStructuredData';
import { WeddingContent } from '@/components/occasions/wedding/WeddingContent';
import { appConfigKeys } from '@/hooks/useAppConfig';
import type { Locale } from '@/i18n/config';
import { getQrWeddingPath } from '@/i18n/publicLocale';
import { endpoints } from '@/lib/api/endpoints';
import { serverPublicConfigGet } from '@/lib/api/serverFetch';
import type { AppConfigResponseDto } from '@/lib/api/types';
import { eventTypeSlug } from '@/lib/eventTypeSlug';
import { getLandingThemes } from '@/lib/landingThemes';
import { activeCampaign } from '@/lib/occasions/campaigns';
import { loadOccasionDemoPreview } from '@/lib/occasions/demoPreview.server';
import { occasionFeatureKeys, occasionOffersThemes } from '@/lib/occasions/occasionFeatures';
import { occasionPriceValues } from '@/lib/occasions/occasionPrice';
import type { Occasion } from '@/lib/occasions/occasions';
import { activeTheme } from '@/lib/occasions/themes';
import { qrWeddingPageLive } from '@/lib/qrWeddingPage';
import { makeQueryClient } from '@/lib/queryClient';
import { routes } from '@/lib/routes';

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

    // The wedding page draws its own demo phones and has no themes row, so it loads neither.
    const wedding = occasion.eventType === 'WEDDING';
    const [preview, themes] = await Promise.all([
        eventType?.hasDemo && !wedding ? loadOccasionDemoPreview(occasion.eventType, locale) : null,
        !wedding && occasionOffersThemes(config, occasion.eventType) ? getLandingThemes(occasion.eventType, locale) : null,
    ]);
    const copy = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}` });
    const featureKeys = occasionFeatureKeys(config, occasion.eventType, Object.keys(copy.raw('features') as Record<string, unknown>));
    const now = new Date();
    const price = occasionPriceValues(config, occasion.eventType);
    const campaign = activeCampaign(occasion.eventType, now);
    const demoHref = eventType?.hasDemo ? routes.demoEventType(eventTypeSlug(occasion.eventType)) : null;
    const theme = activeTheme(occasion.eventType, now);
    // Today the QR page is live whenever weddings are; this follows its own rule if that changes.
    const qrHref = qrWeddingPageLive(config) ? getQrWeddingPath(locale) : null;

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <OccasionStructuredData locale={locale} occasion={occasion} price={price} />
            {wedding ? (
                <WeddingContent
                    campaign={campaign}
                    demoHref={demoHref}
                    featureKeys={featureKeys}
                    locale={locale}
                    occasion={occasion}
                    price={price}
                    qrHref={qrHref}
                    theme={theme}
                />
            ) : (
                <OccasionContent
                    campaign={campaign}
                    demoHref={demoHref}
                    featureKeys={featureKeys}
                    locale={locale}
                    occasion={occasion}
                    preview={preview}
                    theme={theme}
                    themes={themes}
                />
            )}
        </HydrationBoundary>
    );
}
