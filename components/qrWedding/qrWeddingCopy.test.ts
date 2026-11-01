import { describe, expect, it } from 'vitest';

import el from '@/messages/el.json';
import en from '@/messages/en.json';

type Json = Record<string, unknown>;
type QrWeddingCopy = {
    meta: { title: string; description: string; keywords: string[] };
    hero: { h1: string };
    faq: { items: { q: string; a: string }[] };
};

function keyPaths(value: unknown, prefix = ''): string[] {
    // Keyword lists are the searches each language is written for, and the comparison has a row only
    // Greek readers ask about, so their length can differ.
    if (Array.isArray(value) && (prefix.endsWith('keywords') || prefix.endsWith('compare.rows'))) return [prefix];
    if (Array.isArray(value)) return value.flatMap((item, index) => keyPaths(item, `${prefix}[${index}]`));
    if (value && typeof value === 'object')
        return Object.entries(value).flatMap(([key, child]) => keyPaths(child, prefix ? `${prefix}.${key}` : key));
    return [prefix];
}

const CATALOGS = { en: en as Json, el: el as Json };
const PAGES = Object.entries(CATALOGS).map(([locale, catalog]) => [locale, catalog.QrWeddingPage as QrWeddingCopy] as const);
// The search each page is written for, as it must appear in its title and h1.
const KEYWORDS: Record<string, string> = {
    en: 'qr code for wedding photos',
    el: 'qr code για φωτογραφίες γάμου',
};

function plain(text: string): string {
    return text.replace(/<[^>]+>/g, '').toLowerCase();
}

describe('wedding QR copy', () => {
    it('has the same keys in English and Greek', () => {
        expect(keyPaths(CATALOGS.el.QrWeddingPage)).toEqual(keyPaths(CATALOGS.en.QrWeddingPage));
    });

    it.each(PAGES)('%s fits search result limits', (_, copy) => {
        expect([...copy.meta.title].length).toBeLessThanOrEqual(60);
        expect([...copy.meta.description].length).toBeLessThanOrEqual(160);
    });

    it.each(PAGES)('%s puts the main search in the title and h1', (locale, copy) => {
        expect(copy.meta.title.toLowerCase()).toContain(KEYWORDS[locale]);
        expect(plain(copy.hero.h1)).toContain(KEYWORDS[locale]);
    });

    it.each(PAGES)('%s has at least five different questions', (_, copy) => {
        const questions = copy.faq.items.map((item) => item.q);
        expect(questions.length).toBeGreaterThanOrEqual(5);
        expect(new Set(questions).size).toBe(questions.length);
    });

    it.each(PAGES)('%s never calls the QR code free', (locale, copy) => {
        expect(JSON.stringify(copy)).not.toMatch(locale === 'el' ? /δωρε/i : /\bfree\b/i);
    });

    it.each(Object.entries(CATALOGS))('%s gives the page a title no other page uses', (_, catalog) => {
        const occasions = Object.values(catalog.OccasionPages as Record<string, { meta?: { title?: string } }>);
        const others = [
            (catalog.LandingPage as { meta: { title: string } }).meta.title,
            (catalog.ForBusinessPage as { meta: { title: string } }).meta.title,
            ...occasions.map((page) => page.meta?.title),
        ];
        expect(others).not.toContain((catalog.QrWeddingPage as QrWeddingCopy).meta.title);
    });
});
