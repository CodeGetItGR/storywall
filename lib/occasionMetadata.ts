import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { loadOccasionPriceValues } from '@/lib/occasions/occasionPrice.server';
import type { Occasion } from '@/lib/occasions/occasions';
import { buildOccasionMetadata } from '@/lib/occasions/occasionSeo';

export async function getOccasionMetadata(occasion: Occasion, locale: Locale): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}.meta` });
    const common = await getTranslations({ locale, namespace: 'LandingPage.meta' });
    // The description may name the lowest price.
    const price = await loadOccasionPriceValues(occasion.eventType);
    return buildOccasionMetadata(occasion, locale, {
        title: t('title'),
        description: t('description', price),
        siteName: common('siteName'),
        imageAlt: t('imageAlt'),
        keywords: t.raw('keywords') as string[],
    });
}
