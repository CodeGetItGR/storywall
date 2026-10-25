import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import { occasionFaqEntries, type OccasionFaqEntry } from '@/lib/occasions/occasionFaq';
import type { OccasionPriceValues } from '@/lib/occasions/occasionPrice';
import { type Occasion, occasionPath } from '@/lib/occasions/occasions';
import { absoluteUrl, jsonLdHtml } from '@/lib/seo';
import { servicePageGraph } from '@/lib/structuredData';

type OccasionStructuredDataProps = { locale: Locale; occasion: Occasion; price: OccasionPriceValues };

// The service for this occasion, a breadcrumb and the FAQ, with the same prices as the page.
export async function OccasionStructuredData({ locale, occasion, price }: OccasionStructuredDataProps) {
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}` });
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    const faq = occasionFaqEntries(t.raw('faq') as OccasionFaqEntry[], (key) => t(key, price));
    const graph = servicePageGraph({
        locale,
        url: absoluteUrl(occasionPath(occasion, locale)),
        name: t('name'),
        title: t('meta.title'),
        description: t('meta.description', price),
        home: { name: common('breadcrumbHome'), url: absoluteUrl(getPublicLandingPath(locale)) },
        // Answers only: link labels are page navigation, not part of the answer.
        faq: faq.map(({ q, a }) => ({ q, a })),
    });

    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(graph) }} />;
}
