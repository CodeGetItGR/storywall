import type { MetadataRoute } from 'next';

import { defaultLocale, locales } from '@/i18n/config';
import { getForBusinessPath, getPublicLandingPath } from '@/i18n/publicLocale';
import { loadLiveOccasions } from '@/lib/occasions/liveOccasions.server';
import { occasionLanguageAlternates, occasionPath } from '@/lib/occasions/occasions';
import { absoluteUrl, forBusinessLanguageAlternates, landingLanguageAlternates } from '@/lib/seo';
import { showsUnreleasedPages } from '@/lib/unreleasedPages';

// Only the public landing, partner and occasion pages are indexable. Every other route is
// either behind a session or a tokenised guest link, so it stays out on purpose.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const landingLanguages = landingLanguageAlternates();
    const landing: MetadataRoute.Sitemap = locales.map((locale) => ({
        url: absoluteUrl(getPublicLandingPath(locale)),
        changeFrequency: 'weekly',
        priority: 1,
        alternates: { languages: landingLanguages },
    }));

    const forBusinessLanguages = forBusinessLanguageAlternates();
    const forBusiness: MetadataRoute.Sitemap = (showsUnreleasedPages() ? locales : []).map((locale) => ({
        url: absoluteUrl(getForBusinessPath(locale)),
        changeFrequency: 'monthly',
        priority: 0.8,
        alternates: { languages: forBusinessLanguages },
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

    return [...landing, ...forBusiness, ...occasions];
}
