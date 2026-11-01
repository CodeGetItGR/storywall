import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { getPublicLandingPath, getQrWeddingPath } from '@/i18n/publicLocale';
import { type QrWeddingFaqItem, qrWeddingParentPath } from '@/lib/qrWeddingPage';
import { absoluteUrl, jsonLdHtml } from '@/lib/seo';
import { servicePageGraph } from '@/lib/structuredData';

// The wedding QR service, a breadcrumb from the landing through the wedding page, and the FAQ as shown.
export async function QrWeddingStructuredData({ locale, faq }: { locale: Locale; faq: QrWeddingFaqItem[] }) {
    const t = await getTranslations({ locale, namespace: 'QrWeddingPage' });
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    const parentPath = qrWeddingParentPath(locale);
    const graph = servicePageGraph({
        locale,
        url: absoluteUrl(getQrWeddingPath(locale)),
        name: t('name'),
        title: t('meta.title'),
        description: t('meta.description'),
        home: { name: common('breadcrumbHome'), url: absoluteUrl(getPublicLandingPath(locale)) },
        parent: parentPath ? { name: t('hero.crumbWedding'), url: absoluteUrl(parentPath) } : null,
        faq: faq.map(({ q, a }) => ({ q, a })),
    });

    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(graph) }} />;
}
