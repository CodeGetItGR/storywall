import type { Locale } from '@/i18n/config';
import { absoluteUrl, SITE_URL } from '@/lib/seo';

const ORGANIZATION_ID = `${SITE_URL}/#organization`;

export type FaqEntry = { q: string; a: string };

export function faqPageNode(items: FaqEntry[]) {
    return {
        '@type': 'FAQPage',
        mainEntity: items.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
    };
}

type ServicePageGraphInput = {
    locale: Locale;
    // The page's canonical URL.
    url: string;
    // The page's name in the breadcrumb, after home.
    name: string;
    title: string;
    description: string;
    home: { name: string; url: string };
    // A page between home and this one in the breadcrumb, if any.
    parent?: { name: string; url: string } | null;
    faq: FaqEntry[];
};

// A page about one service: the organization, the page, the service, a breadcrumb and the FAQ. No offers: prices come from config.
export function servicePageGraph({ locale, url, name, title, description, home, parent, faq }: ServicePageGraphInput) {
    const breadcrumbId = `${url}#breadcrumb`;
    const crumbs = [home, ...(parent ? [parent] : []), { name, url }];
    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Organization',
                '@id': ORGANIZATION_ID,
                name: 'StoryWall',
                url: absoluteUrl('/'),
                logo: absoluteUrl('/apple-icon.png'),
            },
            {
                '@type': 'WebPage',
                '@id': `${url}#webpage`,
                url,
                name: title,
                description,
                inLanguage: locale,
                publisher: { '@id': ORGANIZATION_ID },
                breadcrumb: { '@id': breadcrumbId },
            },
            {
                '@type': 'Service',
                name: title,
                description,
                url,
                inLanguage: locale,
                provider: { '@id': ORGANIZATION_ID },
            },
            {
                '@type': 'BreadcrumbList',
                '@id': breadcrumbId,
                itemListElement: crumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, name: crumb.name, item: crumb.url })),
            },
            faqPageNode(faq),
        ],
    };
}
