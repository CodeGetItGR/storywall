import { createTranslator, type Messages } from 'next-intl';
import { describe, expect, it } from 'vitest';

import type { OccasionFaqEntry } from '@/lib/occasions/occasionFaq';
import type { OccasionLengthValues } from '@/lib/occasions/occasionLength';
import type { OccasionPriceValues } from '@/lib/occasions/occasionPrice';
import type { OccasionGuestPhotoCopy } from '@/lib/occasions/pageCopy';
import { OCCASION_PAGE_FEATURE_ORDER } from '@/lib/occasions/pageFeatures';
import { BAPTISM_PAGE_MEDIA } from '@/lib/occasions/pageMedia';
import el from '@/messages/el.json';
import en from '@/messages/en.json';

const SPAN: OccasionPriceValues = { range: 'span', from: '79€', fromName: 'START', to: '179€', toName: 'SIGNATURE' };
const NONE: OccasionPriceValues = { range: 'none', from: '', fromName: '', to: '', toName: '' };
const ONE_LENGTH: OccasionLengthValues = { lengths: 'single', months: '12', monthCount: 12, extendable: 'no' };

// Tags rendered as plain text, so a test reads the words.
const TAGS = { b: (chunks: string) => chunks, em: (chunks: string) => chunks };

describe.each([
    ['el', el],
    ['en', en],
] as const)('baptism copy (%s)', (locale, messages) => {
    const t = createTranslator({
        locale,
        messages: messages as Messages,
        namespace: 'OccasionPages.BAPTISM',
        onError: (error) => {
            throw error;
        },
    });

    it('names the lowest price in the description only when there is one', () => {
        expect(t('meta.description', SPAN)).toContain('79€');
        expect(t('meta.description', NONE)).not.toMatch(/€|\{/);
    });

    it('formats every string that holds tags', () => {
        const rich = ['hero.h1', 'hero.kicker', 'rsvp.intro', 'finalCta.cta', ...[0, 1, 2].flatMap((index) => [`how.steps.${index}.body`, `why.with.steps.${index}.body`])];
        for (const key of rich) expect(t.markup(key, TAGS), key).not.toMatch(/[<>{}]/);
        expect(t('hero.trustPrice', SPAN)).toContain('79€');
        expect(t('themes.tileAlt', { name: 'N' })).toContain('N');
    });

    it('offers an extension only while one is on sale', () => {
        const without = t('faq.7.a', ONE_LENGTH);
        const withExtension = t('faq.7.a', { ...ONE_LENGTH, extendable: 'yes' });
        expect(withExtension.startsWith(`${without} `)).toBe(true);
        expect(without).not.toMatch(/[{}]/);
    });

    it('has 14 questions, linking only to the plans', () => {
        const faq = t.raw('faq') as OccasionFaqEntry[];
        expect(faq).toHaveLength(14);
        expect(faq.flatMap((entry) => (entry.link ? [entry.link.to] : []))).toEqual(['pricing']);
    });

    it('names each guest photo whole, one per picture', () => {
        const photos = t.raw('why.with.marquee') as OccasionGuestPhotoCopy[];
        expect(photos).toHaveLength(BAPTISM_PAGE_MEDIA.guestPhotos.length);
        for (const photo of photos) expect(photo.alt).toBeTruthy();
    });

    it('has copy for design features only, and no themes card', () => {
        const keys = Object.keys(t.raw('features') as Record<string, unknown>);
        expect([...OCCASION_PAGE_FEATURE_ORDER]).toEqual(expect.arrayContaining(keys));
        expect(keys).not.toContain('theme');
    });

    it('has no QR page link, since the baptism page links to none', () => {
        expect(t.has('hero.qrLink')).toBe(false);
    });
});
