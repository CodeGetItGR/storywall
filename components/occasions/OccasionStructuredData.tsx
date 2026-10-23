import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import { type Occasion, occasionPath } from '@/lib/occasions/occasions';
import { absoluteUrl, jsonLdHtml } from '@/lib/seo';
import { type FaqEntry, servicePageGraph } from '@/lib/structuredData';

// The service for this occasion, a breadcrumb and the FAQ.
export async function OccasionStructuredData({ locale, occasion }: { locale: Locale; occasion: Occasion }) {
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}` });
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    const graph = servicePageGraph({
        locale,
        url: absoluteUrl(occasionPath(occasion, locale)),
        name: t('name'),
        title: t('meta.title'),
        description: t('meta.description'),
        home: { name: common('breadcrumbHome'), url: absoluteUrl(getPublicLandingPath(locale)) },
        faq: t.raw('faq') as FaqEntry[],
    });

    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(graph) }} />;
}
