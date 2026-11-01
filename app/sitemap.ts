import type { MetadataRoute } from 'next';

import { defaultLocale, locales } from '@/i18n/config';
import {
    getForBusinessPath,
    getLegalPagePath,
    getPublicLandingPath,
    getQrWeddingPath,
    getVendorPagePath,
    LEGAL_PAGE_PATHS,
    VENDOR_PAGE_TYPES,
} from '@/i18n/publicLocale';
import { endpoints } from '@/lib/api/endpoints';
import { serverPublicConfigGet } from '@/lib/api/serverFetch';
import type { AppConfigResponseDto } from '@/lib/api/types';
import { liveOccasionsInConfig, occasionLanguageAlternates, occasionPath } from '@/lib/occasions/occasions';
import { qrWeddingPageLive } from '@/lib/qrWeddingPage';
import {
    absoluteUrl,
    forBusinessLanguageAlternates,
    landingLanguageAlternates,
    legalPageLanguageAlternates,
    qrWeddingLanguageAlternates,
    vendorPageLanguageAlternates,
} from '@/lib/seo';
import { showsUnreleasedPages } from '@/lib/unreleasedPages';

// One config read for every gate below. While the site builds, a second identical fetch waits for the
// first one's cache write, and on Vercel that held the sitemap past the build's 60-second page limit.
async function loadConfig(): Promise<AppConfigResponseDto | null> {
    try {
        return await serverPublicConfigGet<AppConfigResponseDto>(endpoints.config.get, defaultLocale);
    } catch {
        return null;
    }
}

// Only the public landing, wedding QR, partner, vendor type, occasion, contact and legal pages are indexable. Every
// other route is either behind a session or a tokenised guest link, so it stays out on purpose.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const config = await loadConfig();

    const landingLanguages = landingLanguageAlternates();
    const landing: MetadataRoute.Sitemap = locales.map((locale) => ({
        url: absoluteUrl(getPublicLandingPath(locale)),
        changeFrequency: 'weekly',
        priority: 1,
        alternates: { languages: landingLanguages },
    }));

    const qrWeddingLanguages = qrWeddingLanguageAlternates();
    const qrWedding: MetadataRoute.Sitemap = (qrWeddingPageLive(config) ? locales : []).map((locale) => ({
        url: absoluteUrl(getQrWeddingPath(locale)),
        changeFrequency: 'weekly',
        priority: 0.8,
        alternates: { languages: qrWeddingLanguages },
    }));

    const forBusinessLanguages = forBusinessLanguageAlternates();
    const forBusiness: MetadataRoute.Sitemap = (showsUnreleasedPages() ? locales : []).map((locale) => ({
        url: absoluteUrl(getForBusinessPath(locale)),
        changeFrequency: 'monthly',
        priority: 0.8,
        alternates: { languages: forBusinessLanguages },
    }));

    const vendorPages: MetadataRoute.Sitemap = (showsUnreleasedPages() ? VENDOR_PAGE_TYPES : []).flatMap((type) => {
        const languages = vendorPageLanguageAlternates(type);
        return locales.map((locale) => ({
            url: absoluteUrl(getVendorPagePath(type, locale)),
            changeFrequency: 'monthly' as const,
            priority: 0.7,
            alternates: { languages },
        }));
    });

    const occasions: MetadataRoute.Sitemap = liveOccasionsInConfig(config).flatMap((occasion) => {
        const languages = occasionLanguageAlternates(occasion);
        return locales.map((locale) => ({
            url: absoluteUrl(occasionPath(occasion, locale)),
            changeFrequency: 'weekly' as const,
            priority: 0.8,
            alternates: { languages },
        }));
    });

    const legal: MetadataRoute.Sitemap = LEGAL_PAGE_PATHS.flatMap((path) => {
        const languages = legalPageLanguageAlternates(path);
        return locales.map((locale) => ({
            url: absoluteUrl(getLegalPagePath(path, locale)),
            changeFrequency: 'monthly' as const,
            priority: 0.3,
            alternates: { languages },
        }));
    });

    return [...landing, ...qrWedding, ...forBusiness, ...vendorPages, ...occasions, ...legal];
}
