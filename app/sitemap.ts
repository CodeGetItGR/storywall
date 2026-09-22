import type { MetadataRoute } from 'next';

import { locales } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import { absoluteUrl, landingLanguageAlternates } from '@/lib/seo';

// Only the public landing pages are indexable. Every other route is either
// behind a session or a tokenised guest link, so it stays out on purpose.
export default function sitemap(): MetadataRoute.Sitemap {
    const languages = landingLanguageAlternates();

    return locales.map((locale) => ({
        url: absoluteUrl(getPublicLandingPath(locale)),
        changeFrequency: 'weekly',
        priority: 1,
        alternates: { languages },
    }));
}
