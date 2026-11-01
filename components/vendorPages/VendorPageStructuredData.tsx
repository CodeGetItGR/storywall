import { getLocale, getTranslations } from 'next-intl/server';

import { vendorPageFaqItems } from '@/components/vendorPages/VendorPageFaq';
import type { Locale } from '@/i18n/config';
import { getForBusinessPath, getPublicLandingPath, getVendorPagePath, type VendorPageType } from '@/i18n/publicLocale';
import { absoluteUrl, SITE_URL } from '@/lib/seo';

// Same shape as the partner page's, one level deeper in the breadcrumb.
export async function VendorPageStructuredData({ type }: { type: VendorPageType }) {
    const locale = (await getLocale()) as Locale;
    const t = await getTranslations('VendorPages');
    const business = await getTranslations('ForBusinessPage');
    const url = absoluteUrl(getVendorPagePath(type, locale));
    const faq = await vendorPageFaqItems(type);

    const graph = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebPage',
                '@id': `${url}#webpage`,
                url,
                name: t(`types.${type}.meta.title`),
                description: t(`types.${type}.meta.description`),
                inLanguage: locale,
                isPartOf: { '@id': `${SITE_URL}/#website` },
                about: { '@id': `${SITE_URL}/#organization` },
                breadcrumb: { '@id': `${url}#breadcrumb` },
            },
            {
                '@type': 'BreadcrumbList',
                '@id': `${url}#breadcrumb`,
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: business('meta.siteName'), item: absoluteUrl(getPublicLandingPath(locale)) },
                    { '@type': 'ListItem', position: 2, name: t('breadcrumb'), item: absoluteUrl(getForBusinessPath(locale)) },
                    { '@type': 'ListItem', position: 3, name: t(`types.${type}.label`), item: url },
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
