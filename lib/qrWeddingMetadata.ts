import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { buildQrWeddingMetadata } from '@/lib/seo';

// The site name and image alt come from the landing: the page shares its OG image.
export async function getQrWeddingMetadata(locale: Locale): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: 'QrWeddingPage.meta' });
    const landing = await getTranslations({ locale, namespace: 'LandingPage.meta' });
    return buildQrWeddingMetadata(locale, {
        title: t('title'),
        description: t('description'),
        keywords: t.raw('keywords') as string[],
        siteName: landing('siteName'),
        imageAlt: landing('imageAlt'),
    });
}
