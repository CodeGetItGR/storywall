import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { getPublicLandingPath, getQrWeddingPath } from '@/i18n/publicLocale';
import { absoluteUrl, jsonLdHtml } from '@/lib/seo';
import { type FaqEntry, servicePageGraph } from '@/lib/structuredData';

// The wedding QR service, a breadcrumb from the landing and the FAQ.
export async function QrWeddingStructuredData({ locale }: { locale: Locale }) {
    const t = await getTranslations({ locale, namespace: 'QrWeddingPage' });
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    const graph = servicePageGraph({
        locale,
        url: absoluteUrl(getQrWeddingPath(locale)),
        name: t('name'),
        title: t('meta.title'),
        description: t('meta.description'),
        home: { name: common('breadcrumbHome'), url: absoluteUrl(getPublicLandingPath(locale)) },
        faq: t.raw('faq') as FaqEntry[],
    });

    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(graph) }} />;
}
