import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { buildForBusinessMetadata } from '@/lib/seo';

export async function getForBusinessMetadata(locale: Locale): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: 'ForBusinessPage.meta' });
    return buildForBusinessMetadata(locale, {
        title: t('title'),
        description: t('description'),
        siteName: t('siteName'),
        imageAlt: t('imageAlt'),
    });
}

export async function getForBusinessOgCopy(locale: Locale): Promise<{ eyebrow: string; headline: string; alt: string }> {
    const t = await getTranslations({ locale, namespace: 'ForBusinessPage.meta' });
    return { eyebrow: t('ogEyebrow'), headline: t('ogHeadline'), alt: t('imageAlt') };
}
