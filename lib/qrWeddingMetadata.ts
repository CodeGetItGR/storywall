import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { buildQrWeddingMetadata } from '@/lib/seo';

// The site name comes from the landing; the page has its own OG image (opengraph-image.tsx in its route).
export async function getQrWeddingMetadata(locale: Locale): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: 'QrWeddingPage.meta' });
    const landing = await getTranslations({ locale, namespace: 'LandingPage.meta' });
    return buildQrWeddingMetadata(locale, {
        title: t('title'),
        description: t('description'),
        keywords: t.raw('keywords') as string[],
        siteName: landing('siteName'),
        imageAlt: t('imageAlt'),
    });
}

// The OG image's headline (the page's h1 without its markup) and alt text.
export async function getQrWeddingOgCopy(locale: Locale): Promise<{ headline: string; alt: string }> {
    const t = await getTranslations({ locale, namespace: 'QrWeddingPage' });
    return { headline: (t.raw('hero.h1') as string).replace(/<[^>]+>/g, ''), alt: t('meta.imageAlt') };
}
