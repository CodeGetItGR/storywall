import { describe, expect, it } from 'vitest';

import { SITE_URL } from '@/lib/seo';
import { faqPageNode, servicePageGraph } from '@/lib/structuredData';

describe('faqPageNode', () => {
    it('turns each question and answer into a Question', () => {
        expect(faqPageNode([{ q: 'Q1', a: 'A1' }])).toEqual({
            '@type': 'FAQPage',
            mainEntity: [{ '@type': 'Question', name: 'Q1', acceptedAnswer: { '@type': 'Answer', text: 'A1' } }],
        });
    });
});

describe('servicePageGraph', () => {
    const url = `${SITE_URL}/el/qr-code-gamou`;
    const graph = servicePageGraph({
        locale: 'el',
        url,
        name: 'QR γάμου',
        title: 'T',
        description: 'D',
        home: { name: 'Αρχική', url: `${SITE_URL}/el` },
        faq: [{ q: 'Q1', a: 'A1' }],
    });

    it('names StoryWall as the provider of the service', () => {
        expect(graph['@graph']).toContainEqual({
            '@type': 'Organization',
            '@id': `${SITE_URL}/#organization`,
            name: 'StoryWall',
            url: SITE_URL,
            logo: `${SITE_URL}/apple-icon.png`,
        });
        expect(graph['@graph']).toContainEqual({
            '@type': 'Service',
            name: 'T',
            description: 'D',
            url,
            inLanguage: 'el',
            provider: { '@id': `${SITE_URL}/#organization` },
        });
    });

    it('describes the page itself, published by StoryWall', () => {
        expect(graph['@graph']).toContainEqual({
            '@type': 'WebPage',
            '@id': `${url}#webpage`,
            url,
            name: 'T',
            description: 'D',
            inLanguage: 'el',
            publisher: { '@id': `${SITE_URL}/#organization` },
            breadcrumb: { '@id': `${url}#breadcrumb` },
        });
    });

    it('leads the breadcrumb from home to the page', () => {
        expect(graph['@graph']).toContainEqual({
            '@type': 'BreadcrumbList',
            '@id': `${url}#breadcrumb`,
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Αρχική', item: `${SITE_URL}/el` },
                { '@type': 'ListItem', position: 2, name: 'QR γάμου', item: url },
            ],
        });
    });

    it('includes the FAQ and no offers', () => {
        expect(graph['@graph']).toContainEqual(faqPageNode([{ q: 'Q1', a: 'A1' }]));
        expect(JSON.stringify(graph)).not.toContain('Offer');
    });
});
