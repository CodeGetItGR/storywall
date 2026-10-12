import type { MetadataRoute } from 'next';

import { defaultLocale, locales } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import { endpoints } from '@/lib/api/endpoints';
import { serverPublicConfigGet } from '@/lib/api/serverFetch';
import type { AppConfigResponseDto, EventTypeConvention } from '@/lib/api/types';
import { occasionLanguageAlternates, occasionPath, readyOccasions } from '@/lib/occasions/occasions';
import { absoluteUrl, landingLanguageAlternates } from '@/lib/seo';

// The enabled event types, or null when the config can't be read (then every ready occasion is listed).
async function enabledEventTypes(): Promise<Set<EventTypeConvention> | null> {
    try {
        const config = await serverPublicConfigGet<AppConfigResponseDto>(endpoints.config.get, defaultLocale);
        return new Set(config.eventTypes.filter((type) => type.isEnabled).map((type) => type.eventTypeKey));
    } catch {
        return null;
    }
}

// Only the public landing and occasion pages are indexable. Every other route is either
// behind a session or a tokenised guest link, so it stays out on purpose.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const landingLanguages = landingLanguageAlternates();
    const landing: MetadataRoute.Sitemap = locales.map((locale) => ({
        url: absoluteUrl(getPublicLandingPath(locale)),
        changeFrequency: 'weekly',
        priority: 1,
        alternates: { languages: landingLanguages },
    }));

    const enabled = await enabledEventTypes();
    const occasions: MetadataRoute.Sitemap = readyOccasions()
        .filter((occasion) => !enabled || enabled.has(occasion.eventType))
        .flatMap((occasion) => {
            const languages = occasionLanguageAlternates(occasion);
            return locales.map((locale) => ({
                url: absoluteUrl(occasionPath(occasion, locale)),
                changeFrequency: 'weekly' as const,
                priority: 0.8,
                alternates: { languages },
            }));
        });

    return [...landing, ...occasions];
}
