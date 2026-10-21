import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LandingStructuredData } from '@/components/landing/LandingStructuredData';

vi.mock('next-intl/server', () => ({
    getLocale: async () => 'el',
    getTranslations: async ({ namespace }: { namespace: string }) => {
        const t = (key: string) => `${namespace}.${key}`;
        t.raw = (key: string) => (namespace === 'LandingPage.faq' && key === 'items' ? [['Q1', 'A1']] : null);
        return t;
    },
}));

describe('LandingStructuredData', () => {
    it('lists the landing FAQ as an FAQPage', async () => {
        const { container } = render(await LandingStructuredData());
        const graph = JSON.parse(container.querySelector('script')!.textContent!)['@graph'] as unknown[];

        expect(graph).toContainEqual({
            '@type': 'FAQPage',
            mainEntity: [{ '@type': 'Question', name: 'Q1', acceptedAnswer: { '@type': 'Answer', text: 'A1' } }],
        });
    });
});
