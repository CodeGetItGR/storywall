import { getLocale, getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/config';
import { getPublicLandingPath } from '@/i18n/publicLocale';
import { absoluteUrl, OG_IMAGE_PATH, SITE_URL } from '@/lib/seo';

// Only facts that stay true without maintenance: name, URL, logo, description
// and category. Pricing is indicative and comes from config, so no offers.
export async function LandingStructuredData() {
    const locale = (await getLocale()) as Locale;
    const t = await getTranslations({ locale, namespace: 'LandingPage.meta' });
    const url = absoluteUrl(getPublicLandingPath(locale));

    const graph = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Organization',
                '@id': `${SITE_URL}/#organization`,
                name: t('siteName'),
                url: absoluteUrl('/'),
                logo: absoluteUrl('/assets/Logo.svg'),
            },
            {
                '@type': 'WebSite',
                '@id': `${SITE_URL}/#website`,
                name: t('siteName'),
                url: absoluteUrl('/'),
                inLanguage: locale,
                publisher: { '@id': `${SITE_URL}/#organization` },
            },
            {
                '@type': 'SoftwareApplication',
                name: t('siteName'),
                url,
                description: t('description'),
                image: absoluteUrl(OG_IMAGE_PATH),
                applicationCategory: 'SocialNetworkingApplication',
                operatingSystem: 'Web',
                inLanguage: locale,
                publisher: { '@id': `${SITE_URL}/#organization` },
            },
        ],
    };

    // JSON.stringify output is escaped so a `</script>` in copy can't close the tag.
    const json = JSON.stringify(graph).replace(/</g, '\u003c');

    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
