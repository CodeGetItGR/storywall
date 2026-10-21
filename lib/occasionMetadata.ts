import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import type { Occasion } from '@/lib/occasions/occasions';
import { buildOccasionMetadata } from '@/lib/occasions/occasionSeo';

export async function getOccasionMetadata(occasion: Occasion, locale: Locale): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}.meta` });
    const common = await getTranslations({ locale, namespace: 'LandingPage.meta' });
    return buildOccasionMetadata(occasion, locale, {
        title: t('title'),
        description: t('description'),
        siteName: common('siteName'),
        imageAlt: t('imageAlt'),
        keywords: t.raw('keywords') as string[],
    });
}
