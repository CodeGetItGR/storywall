import { createTranslator, type Messages } from 'next-intl';
import { describe, expect, it } from 'vitest';

import { occasionFaqEntries, type OccasionFaqEntry, occasionFaqLinkHref } from '@/lib/occasions/occasionFaq';
import type { OccasionLengthValues } from '@/lib/occasions/occasionLength';
import type { OccasionPriceValues } from '@/lib/occasions/occasionPrice';
import { readyOccasions } from '@/lib/occasions/occasions';
import el from '@/messages/el.json';
import en from '@/messages/en.json';

const NONE: OccasionPriceValues = { range: 'none', from: '', fromName: '', to: '', toName: '' };
const NO_LENGTH: OccasionLengthValues = { lengths: 'none', months: '', monthCount: 0, extendable: 'no' };

describe('occasionFaqEntries', () => {
    it('formats each answer and keeps the question and link', () => {
        const raw: OccasionFaqEntry[] = [
            { q: 'Q1', a: 'raw 1' },
            { q: 'Q2', a: 'raw 2', link: { to: 'pricing', label: 'See plans' } },
        ];
        expect(occasionFaqEntries(raw, (key) => `formatted ${key}`)).toEqual([
            { q: 'Q1', a: 'formatted faq.0.a' },
            { q: 'Q2', a: 'formatted faq.1.a', link: { to: 'pricing', label: 'See plans' } },
        ]);
    });

    it.each([
        ['el', el],
        ['en', en],
    ] as const)('formats every ready occasion FAQ in %s', (locale, messages) => {
        for (const occasion of readyOccasions()) {
            const t = createTranslator({
                locale,
                // Untyped, so a namespace built from the event type is accepted.
                messages: messages as Messages,
                namespace: `OccasionPages.${occasion.eventType}`,
                onError: (error) => {
                    throw error;
                },
            });
            const entries = occasionFaqEntries(t.raw('faq') as OccasionFaqEntry[], (key) => t(key, { ...NONE, ...NO_LENGTH }));
            for (const entry of entries) expect(entry.a).not.toMatch(/[{}<>]/);
        }
    });
});

describe('occasionFaqLinkHref', () => {
    it('links to the plans, and to the QR page only while it is live', () => {
        expect(occasionFaqLinkHref('pricing', null)).toBe('#pricing');
        expect(occasionFaqLinkHref('qr', '/el/qr-code-gamou')).toBe('/el/qr-code-gamou');
        expect(occasionFaqLinkHref('qr', null)).toBeNull();
    });
});
