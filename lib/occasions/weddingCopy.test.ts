import { createTranslator, type Messages } from 'next-intl';
import { describe, expect, it } from 'vitest';

import type { OccasionFaqEntry } from '@/lib/occasions/occasionFaq';
import type { OccasionLengthValues } from '@/lib/occasions/occasionLength';
import type { OccasionPriceValues } from '@/lib/occasions/occasionPrice';
import type { WeddingMarqueeCopy } from '@/lib/occasions/weddingCopy';
import { WEDDING_FEATURE_ORDER } from '@/lib/occasions/weddingFeatures';
import { WEDDING_MARQUEE } from '@/lib/occasions/weddingMedia';
import el from '@/messages/el.json';
import en from '@/messages/en.json';

const SPAN: OccasionPriceValues = { range: 'span', from: '119€', fromName: 'START', to: '259€', toName: 'SIGNATURE' };
const SINGLE: OccasionPriceValues = { range: 'single', from: '119€', fromName: 'START', to: '119€', toName: 'START' };
const NONE: OccasionPriceValues = { range: 'none', from: '', fromName: '', to: '', toName: '' };
const ONE_LENGTH: OccasionLengthValues = { lengths: 'single', months: '12', monthCount: 12, extendable: 'no' };
const TWO_LENGTHS: OccasionLengthValues = { lengths: 'span', months: '3 | 6', monthCount: 0, extendable: 'no' };
const NO_LENGTH: OccasionLengthValues = { lengths: 'none', months: '', monthCount: 0, extendable: 'no' };

// Tags rendered as plain text, so a test reads the words.
const TAGS = { b: (chunks: string) => chunks, em: (chunks: string) => chunks, br: () => ' ' };

describe.each([
    ['el', el],
    ['en', en],
] as const)('wedding copy (%s)', (locale, messages) => {
    const t = createTranslator({
        locale,
        // Untyped, so a namespace built at runtime is accepted.
        messages: messages as Messages,
        namespace: 'OccasionPages.WEDDING',
        onError: (error) => {
            throw error;
        },
    });

    it('names the lowest price in the description only when there is one', () => {
        expect(t('meta.description', SPAN)).toContain('119€');
        expect(t('meta.description', NONE)).not.toMatch(/€|\{/);
    });

    it('answers the price question for every range', () => {
        expect(t('faq.9.a', { ...SPAN, ...TWO_LENGTHS })).toContain('259€ (SIGNATURE)');
        expect(t('faq.9.a', { ...SINGLE, ...TWO_LENGTHS })).toContain('119€ (START)');
        expect(t('faq.9.a', { ...SINGLE, ...TWO_LENGTHS })).not.toContain('259€');
        expect(t('faq.9.a', { ...NONE, ...TWO_LENGTHS })).not.toMatch(/€|\{/);
    });

    it('names the length as a price factor only when there is a choice', () => {
        for (const price of [SPAN, NONE]) {
            const choice = t('faq.9.a', { ...price, ...TWO_LENGTHS });
            const fixed = t('faq.9.a', { ...price, ...ONE_LENGTH });
            expect(choice.length).toBeGreaterThan(fixed.length);
            expect(fixed).not.toMatch(/[{}]/);
        }
    });

    it('answers how long it stays online from the lengths on sale', () => {
        expect(t('faq.7.a', ONE_LENGTH)).toContain('12');
        expect(t('faq.7.a', TWO_LENGTHS)).toContain('3 | 6');
        expect(t('faq.7.a', NO_LENGTH)).not.toMatch(/\d|[{}]/);
    });

    it('offers an extension only while one is on sale', () => {
        const without = t('faq.7.a', ONE_LENGTH);
        const withExtension = t('faq.7.a', { ...ONE_LENGTH, extendable: 'yes' });
        expect(withExtension.startsWith(`${without} `)).toBe(true);
        expect(withExtension.length).toBeGreaterThan(without.length + 1);
    });

    it('formats every string that holds tags', () => {
        const rich = [
            'hero.h1',
            'hero.kicker',
            'demo.copy',
            'finalCta.cta',
            ...[0, 1, 2].map((index) => `how.steps.${index}.body`),
            ...[0, 1, 2].map((index) => `why.with.steps.${index}.body`),
        ];
        for (const key of rich) expect(t.markup(key, TAGS), key).not.toMatch(/[<>{}]/);
        expect(t('hero.trustPrice', SPAN)).toContain('119€');
        expect(t('why.with.photoAlt', { moment: 'M', name: 'N', role: 'R' })).toMatch(/M.*N.*R/);
    });

    it('has 14 questions, linking only to the QR page and the plans', () => {
        const faq = t.raw('faq') as OccasionFaqEntry[];
        expect(faq).toHaveLength(14);
        expect(faq.flatMap((entry) => (entry.link ? [entry.link.to] : []))).toEqual(['qr', 'pricing']);
    });

    it('matches the photo map one to one', () => {
        expect((t.raw('why.with.marquee') as WeddingMarqueeCopy[]).length).toBe(WEDDING_MARQUEE.length);
    });

    it('has copy for every feature in the design', () => {
        expect(Object.keys(t.raw('features') as Record<string, unknown>).sort()).toEqual([...WEDDING_FEATURE_ORDER].sort());
    });
});
