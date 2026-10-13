import { getLocale, getTranslations } from 'next-intl/server';

import { forBusinessFaqItems } from '@/components/forBusiness/ForBusinessFaq';
import type { Locale } from '@/i18n/config';
import { getForBusinessPath, getPublicLandingPath } from '@/i18n/publicLocale';
import { absoluteUrl, SITE_URL } from '@/lib/seo';

// Ties the page to the organization and website the landing declares (same @ids).
export async function ForBusinessStructuredData() {
    const locale = (await getLocale()) as Locale;
    const t = await getTranslations('ForBusinessPage');
    const url = absoluteUrl(getForBusinessPath(locale));
    const faq = await forBusinessFaqItems();

    const graph = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebPage',
                '@id': `${url}#webpage`,
                url,
                name: t('meta.title'),
                description: t('meta.description'),
                inLanguage: locale,
                isPartOf: { '@id': `${SITE_URL}/#website` },
                about: { '@id': `${SITE_URL}/#organization` },
                breadcrumb: { '@id': `${url}#breadcrumb` },
            },
            {
                '@type': 'BreadcrumbList',
                '@id': `${url}#breadcrumb`,
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: t('meta.siteName'), item: absoluteUrl(getPublicLandingPath(locale)) },
                    { '@type': 'ListItem', position: 2, name: t('breadcrumb'), item: url },
                ],
            },
            {
                '@type': 'FAQPage',
                '@id': `${url}#faq`,
                inLanguage: locale,
                mainEntity: faq.map(([question, answer]) => ({
                    '@type': 'Question',
                    name: question,
                    acceptedAnswer: { '@type': 'Answer', text: answer },
                })),
            },
        ],
    };

    // JSON.stringify output is escaped so a `</script>` in copy can't close the tag.
    const json = JSON.stringify(graph).replace(/</g, '\\u003c');

    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
