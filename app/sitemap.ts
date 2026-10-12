import type { MetadataRoute } from 'next';

import { defaultLocale, locales } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import { loadLiveOccasions } from '@/lib/occasions/liveOccasions.server';
import { occasionLanguageAlternates, occasionPath } from '@/lib/occasions/occasions';
import { absoluteUrl, landingLanguageAlternates } from '@/lib/seo';

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

    const occasions: MetadataRoute.Sitemap = (await loadLiveOccasions(defaultLocale)).flatMap((occasion) => {
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
