import { createTranslator, type Messages } from 'next-intl';
import { describe, expect, it } from 'vitest';

import type { OccasionFaqEntry } from '@/lib/occasions/occasionFaq';
import type { OccasionPriceValues } from '@/lib/occasions/occasionPrice';
import type { WeddingFeedPost, WeddingMarqueeCopy, WeddingRsvpReplyCopy } from '@/lib/occasions/weddingCopy';
import { WEDDING_FEATURE_ORDER } from '@/lib/occasions/weddingFeatures';
import { WEDDING_HERO_MEDIA, WEDDING_MARQUEE, WEDDING_RSVP_AVATARS } from '@/lib/occasions/weddingMedia';
import el from '@/messages/el.json';
import en from '@/messages/en.json';

const SPAN: OccasionPriceValues = { range: 'span', from: '119€', fromName: 'START', to: '259€', toName: 'SIGNATURE' };
const SINGLE: OccasionPriceValues = { range: 'single', from: '119€', fromName: 'START', to: '119€', toName: 'START' };
const NONE: OccasionPriceValues = { range: 'none', from: '', fromName: '', to: '', toName: '' };

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
        expect(t('faq.9.a', SPAN)).toContain('259€ (SIGNATURE)');
        expect(t('faq.9.a', SINGLE)).toContain('119€ (START)');
        expect(t('faq.9.a', SINGLE)).not.toContain('259€');
        expect(t('faq.9.a', NONE)).not.toMatch(/€|\{/);
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
        expect((t.raw('hero.feed.posts') as WeddingFeedPost[]).length).toBe(WEDDING_HERO_MEDIA.posts.length);
        expect((t.raw('why.with.marquee') as WeddingMarqueeCopy[]).length).toBe(WEDDING_MARQUEE.length);
        expect((t.raw('rsvp.without.replies') as WeddingRsvpReplyCopy[]).length).toBe(WEDDING_RSVP_AVATARS.length);
    });

    it('has copy for every feature in the design', () => {
        expect(Object.keys(t.raw('features') as Record<string, unknown>).sort()).toEqual([...WEDDING_FEATURE_ORDER].sort());
    });
});
