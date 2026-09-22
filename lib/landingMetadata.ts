import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { buildLandingMetadata } from '@/lib/seo';

// Shared by `app/page.tsx` and `app/[locale]/page.tsx`, which render the same
// landing page for different locales.
export async function getLandingMetadata(locale: Locale): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: 'LandingPage.meta' });
    return buildLandingMetadata(locale, {
        title: t('title'),
        description: t('description'),
        siteName: t('siteName'),
        imageAlt: t('imageAlt'),
    });
}
