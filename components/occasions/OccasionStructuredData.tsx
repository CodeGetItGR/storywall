import { getTranslations } from 'next-intl/server';

import type { OccasionFaqItem } from '@/components/occasions/OccasionFaq';
import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import { type Occasion, occasionPath } from '@/lib/occasions/occasions';
import { absoluteUrl, jsonLdHtml, SITE_URL } from '@/lib/seo';

// The service for this occasion, a breadcrumb and the FAQ. No offers: prices come from config.
export async function OccasionStructuredData({ locale, occasion }: { locale: Locale; occasion: Occasion }) {
    const t = await getTranslations({ locale, namespace: `OccasionPages.${occasion.eventType}` });
    const common = await getTranslations({ locale, namespace: 'OccasionPages.common' });
    const url = absoluteUrl(occasionPath(occasion, locale));
    const faq = t.raw('faq') as OccasionFaqItem[];

    const graph = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Organization',
                '@id': `${SITE_URL}/#organization`,
                name: 'StoryWall',
                url: absoluteUrl('/'),
                logo: absoluteUrl('/apple-icon.png'),
            },
            {
                '@type': 'Service',
                name: t('meta.title'),
                description: t('meta.description'),
                url,
                inLanguage: locale,
                provider: { '@id': `${SITE_URL}/#organization` },
            },
            {
                '@type': 'BreadcrumbList',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: common('breadcrumbHome'), item: absoluteUrl(getPublicLandingPath(locale)) },
                    { '@type': 'ListItem', position: 2, name: t('name'), item: url },
                ],
            },
            {
                '@type': 'FAQPage',
                mainEntity: faq.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
            },
        ],
    };

    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(graph) }} />;
}
