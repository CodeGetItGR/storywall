import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { NO_INDEX } from '@/lib/seo';

// Noindex on purpose: product text is copied from the sellers' own stores, and indexing it here
// would compete with them (decision 2026-10-27). Not in the sitemap either.
export async function getShopMetadata(locale: Locale): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: 'Shop' });
    return { title: t('metaTitle'), robots: NO_INDEX };
}

export async function getShopProductMetadata(locale: Locale, productTitle: string): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: 'Shop' });
    return { title: t('productMetaTitle', { title: productTitle }), robots: NO_INDEX };
}
