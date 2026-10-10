import type { MetadataRoute } from 'next';

import { locales } from '@/i18n/config';
import { getForBusinessPath, getPublicLandingPath } from '@/i18n/publicLocale';
import { absoluteUrl, forBusinessLanguageAlternates, landingLanguageAlternates } from '@/lib/seo';

// Only the public landing and partner pages are indexable. Every other route is
// either behind a session or a tokenised guest link, so it stays out on purpose.
export default function sitemap(): MetadataRoute.Sitemap {
    const landingLanguages = landingLanguageAlternates();
    const forBusinessLanguages = forBusinessLanguageAlternates();

    return [
        ...locales.map((locale) => ({
            url: absoluteUrl(getPublicLandingPath(locale)),
            changeFrequency: 'weekly' as const,
            priority: 1,
            alternates: { languages: landingLanguages },
        })),
        ...locales.map((locale) => ({
            url: absoluteUrl(getForBusinessPath(locale)),
            changeFrequency: 'monthly' as const,
            priority: 0.8,
            alternates: { languages: forBusinessLanguages },
        })),
    ];
}
