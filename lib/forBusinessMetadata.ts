import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import type { VendorPageType } from '@/i18n/publicLocale';
import { buildForBusinessMetadata, buildVendorPageMetadata } from '@/lib/seo';

export async function getForBusinessMetadata(locale: Locale): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: 'ForBusinessPage.meta' });
    return buildForBusinessMetadata(locale, {
        title: t('title'),
        description: t('description'),
        siteName: t('siteName'),
        imageAlt: t('imageAlt'),
    });
}

// A vendor page shares the partner page's site name and OG image.
export async function getVendorPageMetadata(type: VendorPageType, locale: Locale): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: `VendorPages.types.${type}.meta` });
    const business = await getTranslations({ locale, namespace: 'ForBusinessPage.meta' });
    return buildVendorPageMetadata(type, locale, {
        title: t('title'),
        description: t('description'),
        keywords: t.raw('keywords') as string[],
        siteName: business('siteName'),
        imageAlt: business('imageAlt'),
    });
}

// The partner page's OG card with the vendor type as its headline.
export async function getVendorPageOgCopy(type: VendorPageType, locale: Locale): Promise<{ eyebrow: string; headline: string }> {
    const t = await getTranslations({ locale, namespace: 'ForBusinessPage.meta' });
    const vendor = await getTranslations({ locale, namespace: `VendorPages.types.${type}` });
    return { eyebrow: t('ogEyebrow'), headline: vendor('label') };
}

export async function getForBusinessOgCopy(locale: Locale): Promise<{ eyebrow: string; headline: string; alt: string }> {
    const t = await getTranslations({ locale, namespace: 'ForBusinessPage.meta' });
    return { eyebrow: t('ogEyebrow'), headline: t('ogHeadline'), alt: t('imageAlt') };
}
